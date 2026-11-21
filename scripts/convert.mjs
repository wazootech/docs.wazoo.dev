import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docs = JSON.parse(fs.readFileSync('docs.json', 'utf8'));
const OUT = 'src/content/docs';
const slugOf = (p) => (p.endsWith('/index') ? p.slice(0, -'/index'.length) : p);

const navSlugs = new Set();
for (const g of docs.navigation.groups) {
  for (const p of g.pages) if (typeof p === 'string') navSlugs.add(slugOf(p));
}

const SHIM_TAGS = ['Card', 'CardGroup', 'CodeGroup', 'Note', 'Warning', 'Frame', 'ResponseField', 'Steps', 'Step'];
const EXCLUDES = ['node_modules', '.git', 'src', 'public', 'scripts', '.github'];
const files = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (dir === root && EXCLUDES.includes(e.name)) continue;
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.mdx')) files.push(full);
  }
}
walk(root);

let converted = 0;
for (const f of files) {
  let t = fs.readFileSync(f, 'utf8');
  const rel = path.relative(root, f);
  const slug = rel.replace(/\.mdx$/, '');
  const fmm = t.match(/^---\n([\s\S]*?)\n---\n/);
  let body = t;
  let block = '';
  if (fmm) {
    block = fmm[1] + '\n';
    body = t.slice(fmm[0].length);
    const hidden = /^\s*hidden:\s*true\s*$/m.test(block);
    block = block.replace(/^hidden:\s*true\s*\n/m, '');
    const inNav = navSlugs.has(slug) || navSlugs.has(slug + '/index');
    if (hidden && !inNav) block = `sidebar:\n  hidden: true\n${block}`;
    body = `---\n${block}---\n${body}`;
  }
  const used = SHIM_TAGS.filter((tag) => new RegExp(`<${tag}[\\s/>]`).test(t));
  if (used.length) {
    const depth = slug.split('/').length + 1;
    const relImport = '../'.repeat(depth) + 'components/mint';
    const imp = `import { ${used.join(', ')} } from '${relImport}';\n`;
    body = body.replace(/^(---\n[\s\S]*?\n---\n)/, `$1\n${imp}`);
    if (!body.startsWith('---')) body = imp + '\n' + body;
  }
  const dest = path.join(OUT, rel);
  if (slug === 'introduction') {
    fs.mkdirSync(path.join(OUT), { recursive: true });
    fs.writeFileSync(path.join(OUT, 'index.mdx'), body);
    converted++;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, body);
  converted++;
}
console.log(`converted ${converted} pages`);
