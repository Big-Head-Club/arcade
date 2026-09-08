// The plainest possible rack: every live game, most played first. Mack's
// hundred-carts is the real front; this is what the feed looks like in HTML.
export function homePage(feed, { publicUrl = '' } = {}) {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rows = feed.games.map((g) => `<li><a href="${esc(g.url)}"><img src="${esc(g.plate)}" alt="" loading="lazy"><b>${esc(g.name)}</b></a><span>${g.plays.d7} this week${g.platform && g.platform !== 'unknown' ? ' · ' + ({ mobile: '📱 mobile', desktop: '🖥 desktop', both: '📱🖥' })[g.platform] : ''}${g.variant ? ' · ' + esc(g.variant) : ''}${g.designers.length ? ' · ' + esc(g.designers.join(', ')) : ''}</span></li>`).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Big Head Club arcade</title>
<style>body{margin:0;background:#1c1a17;color:#e8e2d8;font:16px/1.5 ui-monospace,Menlo,monospace;padding:32px 20px}main{max-width:1100px;margin:0 auto}h1{font-size:20px;margin:0 0 4px}p{color:#9a9184;margin:0 0 24px}
ol{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:18px}li a{display:block;color:inherit;text-decoration:none}li img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;background:#26231f;display:block;margin-bottom:6px}li b{display:block;font-size:14px}li span{color:#9a9184;font-size:12px}</style></head>
<body><main><h1>Big Head Club arcade</h1><p>${feed.count} games, most played first. <a style="color:#f2812f" href="/api/games.json">feed</a></p><ol>${rows}</ol></main></body></html>`;
}
