// The second page: what the games are built with, where to look, and who made what.
// Moved here from hundred-carts/resources.html on 2026-09-19, when the arcade became the official
// list. Edit src/resources.json; the page renders from it on every request.
import { readFileSync } from 'node:fs';

const DATA = JSON.parse(readFileSync(new URL('./resources.json', import.meta.url), 'utf8'));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const resourceCount = () => DATA.sections.filter((s) => !s.notes).reduce((a, s) => a + s.items.length, 0);

function item(it, notes) {
  if (notes) return `<li><b>${esc(it.name)}</b><span>${esc(it.note)}</span></li>`;
  const lic = it.licence ? `<em>${esc(it.licence)}</em>` : '';
  // name the maker, not just the product
  const by = it.by ? `by ${esc(it.by)} · ` : '';
  return `<li><a href="${esc(it.url)}">${esc(it.name)}</a>${lic}<span>${by}${esc(it.note)}</span></li>`;
}

export function resourcesPage() {
  const sections = DATA.sections.map((s) =>
    `<h2>${esc(s.heading)}</h2>\n<ul>${s.items.map((it) => item(it, s.notes)).join('\n')}</ul>`).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Resources · arcade</title>
<style>body{margin:0;background:#1c1a17;color:#e8e2d8;font:16px/1.5 ui-monospace,Menlo,monospace;padding:32px 20px}main{max-width:1100px;margin:0 auto}h1{font-size:20px;margin:0 0 4px}p{color:#9a9184;margin:0 0 16px}
.pages{display:flex;gap:18px;font-size:13px;margin:0 0 22px}.pages a{color:#9a9184;text-decoration:none;border-bottom:1px solid transparent}.pages a:hover{color:#e8e2d8}.pages a[aria-current]{color:#f2812f;border-bottom-color:#f2812f}
h2{font-size:12px;letter-spacing:.12em;color:#9a9184;font-weight:500;margin:34px 0 10px;padding-top:14px;border-top:1px solid #3a352f}
ul{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px 28px}
li a,li b{color:#e8e2d8;text-decoration:none;font-weight:600}li a{border-bottom:1px solid #f2812f}li a:hover{color:#f2812f}
li em{font-style:normal;font-size:11px;letter-spacing:.08em;color:#9a9184;margin-left:8px;border:1px solid #3a352f;border-radius:999px;padding:0 7px}
li span{display:block;color:#9a9184;font-size:13px;margin-top:3px}
footer{margin:48px 0 0;padding-top:16px;border-top:1px solid #3a352f;color:#9a9184;font-size:12px}footer a{color:#9a9184}footer a:hover{color:#f2812f}</style></head>
<body><main>
<nav class="pages" aria-label="Pages"><a href="/">Games</a><a href="/resources" aria-current="page">Resources</a></nav>
<h1>${esc(DATA.title)}</h1>
<p>${esc(DATA.intro)}</p>
${sections}
<footer><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></footer>
</main>
<script defer src="/t.js"></script>
</body></html>`;
}
