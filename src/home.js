// The plainest possible rack: every live game, most played first, filterable by
// what kind of play it is. Mack's hundred-carts is the real front; this is what
// the feed looks like in HTML.
import { CATEGORIES } from './categories.js';

export function homePage(feed, { publicUrl = '' } = {}) {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const counts = feed.categories || {};
  const chips = [`<button class="chip on" data-cat="all">All <i>${feed.games.length}</i></button>`]
    .concat(CATEGORIES.filter((c) => counts[c.id]).map((c) =>
      `<button class="chip" data-cat="${c.id}" title="${esc(c.blurb)}">${esc(c.label)} <i>${counts[c.id]}</i></button>`))
    .join('');
  const rows = feed.games.map((g) => {
    const cat = CATEGORIES.find((c) => c.id === g.category);
    const meta = [
      `${g.plays.week} ${g.plays.by === 'runs' ? 'runs' : 'played'} this week`,
      cat ? esc(cat.label) : '',
      g.platform && g.platform !== 'unknown' ? ({ mobile: '📱 mobile', desktop: '🖥 desktop', both: '📱🖥' })[g.platform] : '',
      g.variant ? esc(g.variant) : '',
      g.designers.length ? esc(g.designers.join(', ')) : '',
    ].filter(Boolean).join(' · ');
    return `<li data-cat="${esc(g.category || 'none')}"><a href="${esc(g.url)}"><img src="${esc(g.plate)}" alt="" loading="lazy"><b>${esc(g.name)}</b></a><span>${meta}</span></li>`;
  }).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Big Head Club arcade</title>
<style>body{margin:0;background:#1c1a17;color:#e8e2d8;font:16px/1.5 ui-monospace,Menlo,monospace;padding:32px 20px}main{max-width:1100px;margin:0 auto}h1{font-size:20px;margin:0 0 4px}p{color:#9a9184;margin:0 0 16px}
nav{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 22px}
.chip{font:inherit;font-size:13px;color:#e8e2d8;background:#26231f;border:1px solid #3a352f;border-radius:999px;padding:5px 13px;cursor:pointer}
.chip:hover{border-color:#6a6258}
.chip.on{background:#f2812f;border-color:#f2812f;color:#1c1a17}
.chip i{font-style:normal;opacity:.6;font-size:11px;margin-left:2px}
.chip.on i{opacity:.75}
ol{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:18px}li a{display:block;color:inherit;text-decoration:none}li img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;background:#26231f;display:block;margin-bottom:6px}li b{display:block;font-size:14px}li span{color:#9a9184;font-size:12px}
li[hidden]{display:none}
#empty{color:#9a9184}</style></head>
<body><main><h1>Big Head Club arcade</h1>
<p>${feed.count} games, most played first. A play is a run where the game reports runs, otherwise a visitor who clicked, started, or stayed ten seconds; crawlers never count. <a style="color:#f2812f" href="/api/games.json">feed</a></p>
<nav id="filters">${chips}</nav>
<ol id="games">${rows}</ol>
<p id="empty" hidden>Nothing in that one yet.</p>
</main>
<script>
(function () {
  var nav = document.getElementById('filters'), items = document.querySelectorAll('#games li'), empty = document.getElementById('empty');
  function show(cat) {
    var n = 0;
    items.forEach(function (li) { var on = cat === 'all' || li.dataset.cat === cat; li.hidden = !on; if (on) n++; });
    empty.hidden = n > 0;
    nav.querySelectorAll('.chip').forEach(function (b) { b.classList.toggle('on', b.dataset.cat === cat); });
    history.replaceState(null, '', cat === 'all' ? location.pathname : '#' + cat);
    window.tally && tally('filter', { cat: cat });
  }
  nav.addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (b) show(b.dataset.cat); });
  var hash = location.hash.slice(1);
  if (hash && nav.querySelector('.chip[data-cat="' + hash + '"]')) show(hash);
})();
</script>
<script defer src="/t.js"></script>
</body></html>`;
}
