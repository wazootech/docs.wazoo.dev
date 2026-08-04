#!/usr/bin/env node
/**
 * Check every docs.wazoo.dev /api-reference page title against the live
 * OpenAPI specs.
 *
 * Fetches the two specs wired into docs.json (defaults to the production
 * URLs; override with WAZOO_API_SPEC / WORLDS_API_SPEC to check a pre-deploy
 * or local spec), then walks the docs sitemap and for each /api-reference
 * page:
 *
 *   1. extracts the rendered <h1> title,
 *   2. matches the page to a spec operation (by URL slug patterns first,
 *      falling back to operationIds embedded in the page HTML),
 *   3. compares the rendered title to the operation's expected title
 *      (x-mint.metadata.title -> summary -> operationId-derived fallback).
 *
 * Findings (one per page, the strongest match wins):
 *
 *   OK        rendered title equals a declared spec title
 *   LOWERCASE rendered title contains words the declared title capitalizes
 *             (e.g. "Get api keys" vs "List API keys")
 *   MISMATCH  rendered title differs from the spec's declared title
 *   DERIVED   operation has no summary/x-mint override, so the title is at
 *             Mintlify's mercy (derived from operationId or method+path)
 *   UNMATCHED page matched no operation in either spec
 *
 * Exits non-zero when any finding is reported, so it can be wired into CI.
 *
 * Usage:
 *   node scripts/check-api-reference-titles.mjs
 *   WAZOO_API_SPEC=file:///tmp/wazoo.json WORLDS_API_SPEC=file:///tmp/worlds.json node scripts/check-api-reference-titles.mjs
 *   DOCS_BASE=https://docs.wazoo.dev node scripts/check-api-reference-titles.mjs --quiet
 */

// Docs config (docs.json) wires these two production specs.
const WAZOO_SPEC = process.env.WAZOO_API_SPEC ?? "https://api.wazoo.dev/openapi.json";
const WORLDS_SPEC = process.env.WORLDS_API_SPEC ?? "https://worlds-api.wazoo.dev/openapi.json";
const DOCS_BASE = process.env.DOCS_BASE ?? "https://docs.wazoo.dev";
const QUIET = process.argv.includes("--quiet");

const STOPWORDS = new Set([
  "a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "of", "on",
  "or", "the", "to", "with", "without",
]);

const kebab = (s) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

/** Split an operationId or title into words. */
const words = (s) => s.split(/[\s_-]+/).filter(Boolean);

/** Sentence-case an operationId like listApiKeys -> "List api keys". */
function titleFromOperationId(operationId) {
  const ws = words(operationId);
  if (!ws.length) return null;
  return ws[0][0].toUpperCase() + ws[0].slice(1) + (ws.length > 1 ? " " + ws.slice(1).join(" ") : "");
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": "docs-title-checker" } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}

/** Load both specs and flatten to a list of operations. */
async function loadOperations() {
  const specs = [
    { name: "wazoo-api", url: WAZOO_SPEC },
    { name: "worlds-api", url: WORLDS_SPEC },
  ];
  const ops = [];
  for (const { name, url } of specs) {
    let spec;
    try {
      spec = JSON.parse(await fetchText(url));
    } catch (err) {
      console.error(`!! cannot load ${name} spec from ${url}: ${err.message}`);
      continue;
    }
    for (const [path, item] of Object.entries(spec.paths ?? {})) {
      for (const [method, op] of Object.entries(item ?? {})) {
        if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
        const xmint = op["x-mint"]?.metadata?.title;
        const summary = op.summary ?? "";
        const operationId = op.operationId ?? "";
        // Candidate URL slugs Mintlify may generate for this operation.
        const pathWords = path
          .replace(/^\/v\d+/, "")
          .split("/")
          .filter((p) => p && !p.startsWith("{"));
        const candidates = new Set([
          `${method}-${pathWords.join("-")}`,
          operationId ? kebab(operationId) : "",
          summary ? kebab(summary) : "",
        ]);
        candidates.delete("");
        ops.push({
          spec: name,
          method,
          path,
          operationId,
          summary,
          xmint,
          expected: xmint || summary || titleFromOperationId(operationId),
          declared: xmint || summary || null,
          candidates: [...candidates],
        });
      }
    }
  }
  return ops;
}

/** Extract the rendered page title from <h1> or the ld+json WebPage name. */
function extractRenderedTitle(html) {
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  if (h1) return h1[1].replace(/\s+/g, " ").trim();
  const blobs = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? [];
  for (const blob of blobs) {
    if (blob.includes('"WebPage"')) {
      const name = blob.match(/"name":"([^"]+)"/);
      if (name) return name[1];
    }
  }
  return null;
}

/** Find operations whose generated slug candidates match the page URL tail. */
function matchBySlug(ops, slugTail) {
  return ops.filter((op) => op.candidates.includes(slugTail));
}

/** Fallback: operationIds embedded anywhere in the page HTML. */
function matchByEmbeddedOpId(ops, html) {
  return ops.filter((op) => op.operationId && html.includes(op.operationId));
}

/**
 * Lowercase words in the rendered title that the declared title capitalizes.
 * Handles title-case (World) and ALL-CAPS (API, ID, SPARQL) forms.
 */
function findLowercaseWords(rendered, expected) {
  if (!expected || !rendered) return [];
  const expectedWords = new Set(words(expected));
  const bad = new Set();
  for (const w of words(rendered)) {
    const lower = w.toLowerCase();
    if (w.length < 3 || STOPWORDS.has(lower)) continue;
    const title = w[0].toUpperCase() + w.slice(1);
    const upper = w.toUpperCase();
    const matchesDeclared = expectedWords.has(w) || expectedWords.has(title) || expectedWords.has(upper);
    const declaredHasOtherCase = expectedWords.has(title) || expectedWords.has(upper);
    if (w === lower && matchesDeclared && declaredHasOtherCase) bad.add(w);
  }
  return [...bad];
}

/** Word-overlap score between rendered title and an operation's expected title. */
function overlapScore(rendered, expected) {
  if (!rendered || !expected) return 0;
  const a = new Set(words(rendered).map((w) => w.toLowerCase()));
  const b = new Set(words(expected).map((w) => w.toLowerCase()));
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / Math.max(a.size, b.size);
}

/** Normalized equality (case + whitespace insensitive). */
function titleEquals(a, b) {
  if (!a || !b) return false;
  return a.toLowerCase().replace(/\s+/g, " ").trim() === b.toLowerCase().replace(/\s+/g, " ").trim();
}

async function main() {
  const ops = await loadOperations();
  if (!ops.length) {
    console.error("!! no operations loaded — both specs unreachable");
    process.exit(2);
  }

  const sitemap = await fetchText(`${DOCS_BASE}/sitemap.xml`);
  const pageUrls = [...sitemap.matchAll(/<loc>([^<]*\/api-reference\/[^<]*)<\/loc>/g)].map((m) => m[1]);
  pageUrls.sort();

  const findings = [];
  const perSpec = new Map();

  for (const url of pageUrls) {
    let html;
    try {
      html = await fetchText(url);
    } catch (err) {
      findings.push({ url, kind: "FETCH_ERROR", detail: err.message });
      continue;
    }

    const rendered = extractRenderedTitle(html);
    const slugTail = url.split("/api-reference/")[1] ?? "";
    let matched = matchBySlug(ops, slugTail);
    if (!matched.length) matched = matchByEmbeddedOpId(ops, html);

    if (!matched.length) {
      findings.push({ url, kind: "UNMATCHED", rendered, detail: "no operation matched the page" });
      continue;
    }

    // Prefer the operation that renders this title (exact match); otherwise
    // the one whose expected title is closest to the rendered title.
    const exact = matched.find((op) => titleEquals(rendered, op.expected));
    const best = exact ?? matched.sort((a, b) => overlapScore(rendered, b.expected) - overlapScore(rendered, a.expected))[0];

    perSpec.set(best.spec, (perSpec.get(best.spec) ?? 0) + 1);

    if (titleEquals(rendered, best.expected)) {
      if (!QUIET) console.log(`OK   ${url.split(DOCS_BASE)[1] ?? url}`);
      continue;
    }

    if (best.declared) {
      const lower = findLowercaseWords(rendered, best.declared);
      findings.push({
        url,
        kind: lower.length ? "LOWERCASE" : "MISMATCH",
        operationId: best.operationId,
        spec: best.spec,
        method: best.method,
        path: best.path,
        rendered,
        expected: best.declared,
        detail: lower.length ? `lowercase words: ${lower.join(", ")}` : "rendered title differs from declared title",
      });
    } else {
      findings.push({
        url,
        kind: "DERIVED",
        operationId: best.operationId,
        spec: best.spec,
        method: best.method,
        path: best.path,
        rendered,
        expected: best.expected,
        detail: "no summary/x-mint override — title derived by Mintlify (add x-mint.metadata.title to lock it)",
      });
    }
  }

  const counts = {};
  for (const f of findings) counts[f.kind] = (counts[f.kind] ?? 0) + 1;

  console.log("\n===== api-reference title check =====");
  console.log(`specs: wazoo-api ${WAZOO_SPEC}`);
  console.log(`       worlds-api ${WORLDS_SPEC}`);
  console.log(`pages checked: ${pageUrls.length}`);
  console.log(`operations loaded: ${ops.length}`);
  console.log(`matched pages (per spec): ${[...perSpec.entries()].map(([s, n]) => `${s}=${n}`).join(", ") || "none"}`);
  console.log(`findings: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}`);
  console.log("");

  if (!findings.length) {
    console.log("✅ All api-reference page titles match the specs.");
    process.exit(0);
  }

  for (const f of findings) {
    const loc = f.url.split(DOCS_BASE)[1] ?? f.url;
    const head = `${f.kind.padEnd(12)} ${loc}`;
    switch (f.kind) {
      case "LOWERCASE":
      case "MISMATCH":
        console.log(`${head}\n  rendered:  ${f.rendered}\n  expected:  ${f.expected}\n  note:      ${f.detail}  (${f.spec} ${f.method.toUpperCase()} ${f.path})`);
        break;
      case "DERIVED":
        console.log(`${head}\n  rendered:  ${f.rendered}\n  note:      ${f.detail}  (${f.spec} ${f.method.toUpperCase()} ${f.path})`);
        break;
      default:
        console.log(`${head}  ${f.detail}`);
    }
    console.log("");
  }

  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
