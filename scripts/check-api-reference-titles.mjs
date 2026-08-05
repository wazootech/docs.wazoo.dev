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
 *   1. fetches the page's Markdown variant (<page>.md), which Mintlify
 *      generates with the authoritative source line
 *      `...yaml <spec-url> <method> <path>`,
 *   2. extracts the rendered <h1> title from the HTML page,
 *   3. matches the page to the exact spec operation by (spec, method, path)
 *      — no slug heuristics, so colliding operationIds across specs can't
 *      cause false positives,
 *   4. compares the rendered title to the operation's expected title
 *      (x-mint.metadata.title -> summary -> operationId-derived fallback).
 *
 * Findings (one per page):
 *
 *   OK        rendered title equals a declared spec title
 *   LOWERCASE rendered title contains words the declared title capitalizes
 *             (e.g. "Get api keys" vs "List API keys")
 *   MISMATCH  rendered title differs from the spec's declared title
 *   DERIVED   operation has no summary/x-mint override, so the title is at
 *             Mintlify's mercy (derived from operationId or method+path)
 *   UNMATCHED page's .md source matched no operation in either spec
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

const METHODS = new Set(["get", "post", "put", "patch", "delete"]);

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

/** Load both specs and index operations by (specUrl, method, path). */
async function loadOperations() {
  const specs = [
    { name: "wazoo-api", url: WAZOO_SPEC },
    { name: "worlds-api", url: WORLDS_SPEC },
  ];
  const byKey = new Map();
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
        if (!METHODS.has(method)) continue;
        const xmint = op["x-mint"]?.metadata?.title;
        const summary = op.summary ?? "";
        const operationId = op.operationId ?? "";
        const entry = {
          spec: name,
          method,
          path,
          operationId,
          summary,
          xmint,
          expected: xmint || summary || titleFromOperationId(operationId),
          declared: xmint || summary || null,
        };
        ops.push(entry);
        byKey.set(`${url}|${method}|${path}`, entry);
      }
    }
  }
  return { ops, byKey };
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

/**
 * Parse the authoritative source line from a page's Markdown variant:
 *   ```yaml https://worlds-api.wazoo.dev/openapi.json get /worlds/{id}
 * Returns { specUrl, method, path } or null.
 */
function parsePageSource(md) {
  const m = md.match(/```yaml\s+(https?:\/\/\S+?\.json)\s+(get|post|put|patch|delete)\s+(\/\S+)/);
  if (!m) return null;
  return { specUrl: m[1], method: m[2], path: m[3] };
}

/** Lowercase words in the rendered title that the declared title capitalizes. */
function findLowercaseWords(rendered, expected) {
  if (!expected || !rendered) return [];
  const expectedWords = new Set(words(expected));
  const bad = new Set();
  for (const w of words(rendered)) {
    const lower = w.toLowerCase();
    if (w.length < 3 || STOPWORDS.has(lower)) continue;
    const title = w[0].toUpperCase() + w.slice(1);
    const upper = w.toUpperCase();
    const declaredHasOtherCase = expectedWords.has(title) || expectedWords.has(upper);
    if (w === lower && declaredHasOtherCase) bad.add(w);
  }
  return [...bad];
}

/** Normalized equality (case + whitespace insensitive). */
function titleEquals(a, b) {
  if (!a || !b) return false;
  return a.toLowerCase().replace(/\s+/g, " ").trim() === b.toLowerCase().replace(/\s+/g, " ").trim();
}

async function main() {
  const { ops, byKey } = await loadOperations();
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
    const mdUrl = `${url}.md`;
    let md;
    try {
      md = await fetchText(mdUrl);
    } catch (err) {
      findings.push({ url, kind: "FETCH_ERROR", detail: `cannot fetch ${mdUrl}: ${err.message}` });
      continue;
    }

    const source = parsePageSource(md);
    if (!source) {
      findings.push({ url, kind: "UNMATCHED", detail: "no source line in .md variant" });
      continue;
    }

    const op = byKey.get(`${source.specUrl}|${source.method}|${source.path}`);
    if (!op) {
      findings.push({
        url,
        kind: "UNMATCHED",
        detail: `no operation for ${source.specUrl} ${source.method.toUpperCase()} ${source.path} in the loaded specs`,
      });
      continue;
    }

    let html;
    try {
      html = await fetchText(url);
    } catch (err) {
      findings.push({ url, kind: "FETCH_ERROR", detail: err.message });
      continue;
    }

    const rendered = extractRenderedTitle(html);
    perSpec.set(op.spec, (perSpec.get(op.spec) ?? 0) + 1);

    if (titleEquals(rendered, op.expected)) {
      if (!QUIET) console.log(`OK   ${url.split(DOCS_BASE)[1] ?? url}`);
      continue;
    }

    if (op.declared) {
      const lower = findLowercaseWords(rendered, op.declared);
      findings.push({
        url,
        kind: lower.length ? "LOWERCASE" : "MISMATCH",
        operationId: op.operationId,
        spec: op.spec,
        method: op.method,
        path: op.path,
        rendered,
        expected: op.declared,
        detail: lower.length ? `lowercase words: ${lower.join(", ")}` : "rendered title differs from declared title",
      });
    } else {
      findings.push({
        url,
        kind: "DERIVED",
        operationId: op.operationId,
        spec: op.spec,
        method: op.method,
        path: op.path,
        rendered,
        expected: op.expected,
        detail: "no summary/x-mint override — title derived by Mintlify (add x-mint.metadata.title to lock it)",
      });
    }
  }

  // Report operations present in the specs but missing from the docs sitemap.
  const covered = new Set();
  for (const url of pageUrls) {
    const md = await fetchText(`${url}.md`);
    const source = parsePageSource(md);
    if (source) covered.add(`${source.specUrl}|${source.method}|${source.path}`);
  }
  const missing = ops.filter((op) => !covered.has(`${op.spec === "wazoo-api" ? WAZOO_SPEC : WORLDS_SPEC}|${op.method}|${op.path}`));
  const missingBySpec = {};
  for (const op of missing) missingBySpec[op.spec] = (missingBySpec[op.spec] ?? 0) + 1;

  const counts = {};
  for (const f of findings) counts[f.kind] = (counts[f.kind] ?? 0) + 1;

  console.log("\n===== api-reference title check =====");
  console.log(`specs: wazoo-api ${WAZOO_SPEC}`);
  console.log(`       worlds-api ${WORLDS_SPEC}`);
  console.log(`pages checked: ${pageUrls.length}`);
  console.log(`operations loaded: ${ops.length}`);
  console.log(`matched pages (per spec): ${[...perSpec.entries()].map(([s, n]) => `${s}=${n}`).join(", ") || "none"}`);
  console.log(`findings: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}`);
  console.log(`operations missing from docs: ${Object.entries(missingBySpec).map(([s, n]) => `${s}=${n}`).join(", ") || "none"}`);
  console.log("");

  if (!findings.length && !missing.length) {
    console.log("✅ All api-reference page titles match the specs, and every operation has a page.");
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

  if (missing.length) {
    console.log("----- operations in the specs with no docs page -----");
    for (const op of missing) {
      console.log(`  ${op.spec.padEnd(10)} ${op.method.toUpperCase().padEnd(6)} ${op.path}`);
    }
    console.log("");
  }

  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
