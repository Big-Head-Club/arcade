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
    return `<li data-cat="${esc(g.category || 'none')}" data-started="${esc(g.started || '')}" data-rank="${g.rank}"><a href="${esc(g.url)}"><img src="/labels/${esc(g.slug)}" alt="" loading="lazy"><b>${esc(g.name)}</b></a><span>${meta}</span></li>`;
  }).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Big Head Club arcade</title>
<style>body{margin:0;background:#1c1a17;color:#e8e2d8;font:16px/1.5 ui-monospace,Menlo,monospace;padding:32px 20px}main{max-width:1100px;margin:0 auto}h1{font-size:20px;margin:0 0 4px}p{color:#9a9184;margin:0 0 16px}
nav{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}
#sorts{color:#9a9184;font-size:13px;margin:0 0 22px;display:flex;align-items:center;gap:6px}
#sorts span{opacity:.5}
.sort{font:inherit;font-size:13px;color:#9a9184;background:none;border:0;padding:2px 0;cursor:pointer;border-bottom:1px solid transparent}
.sort:hover{color:#e8e2d8}
.sort.on{color:#f2812f;border-bottom-color:#f2812f}
.chip{font:inherit;font-size:13px;color:#e8e2d8;background:#26231f;border:1px solid #3a352f;border-radius:999px;padding:5px 13px;cursor:pointer}
.chip:hover{border-color:#6a6258}
.chip.on{background:#f2812f;border-color:#f2812f;color:#1c1a17}
.chip i{font-style:normal;opacity:.6;font-size:11px;margin-left:2px}
.chip.on i{opacity:.75}
ol{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:20px}li a{display:block;color:inherit;text-decoration:none}li img{width:100%;aspect-ratio:3/4;object-fit:contain;border-radius:2px;background:transparent;display:block;margin-bottom:8px;box-shadow:0 6px 14px -6px rgba(0,0,0,.7)}li b{display:block;font-size:14px}li span{color:#9a9184;font-size:12px}
li[hidden]{display:none}
#empty{color:#9a9184}
footer{margin:48px 0 0;padding-top:16px;border-top:1px solid #3a352f;color:#9a9184;font-size:12px}footer a{color:#9a9184}footer a:hover{color:#f2812f}</style></head>
<body><main><h1>Big Head Club arcade</h1>
<p>${feed.count} games. <a style="color:#f2812f" href="/api/games.json">feed</a></p>
<nav id="filters">${chips}</nav>
<div id="sorts">Sort <button class="sort on" data-sort="plays">most played</button><span>·</span><button class="sort" data-sort="new">newest</button></div>
<ol id="games">${rows}</ol>
<p id="empty" hidden>Nothing in that one yet.</p>
<footer>Big Head Club, published by Merchants of Play Inc. · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></footer>
</main>
<script>
(function () {
  var nav = document.getElementById('filters'), sorts = document.getElementById('sorts');
  var list = document.getElementById('games'), empty = document.getElementById('empty');
  var items = [].slice.call(list.children);
  var cat = 'all', order = 'plays';

  function render() {
    var n = 0;
    items.forEach(function (li) { var on = cat === 'all' || li.dataset.cat === cat; li.hidden = !on; if (on) n++; });
    empty.hidden = n > 0;
    var sorted = items.slice().sort(order === 'new'
      ? function (a, b) { return (b.dataset.started || '').localeCompare(a.dataset.started || '') || a.dataset.rank - b.dataset.rank; }
      : function (a, b) { return a.dataset.rank - b.dataset.rank; });
    sorted.forEach(function (li) { list.appendChild(li); });
    nav.querySelectorAll('.chip').forEach(function (b) { b.classList.toggle('on', b.dataset.cat === cat); });
    sorts.querySelectorAll('.sort').forEach(function (b) { b.classList.toggle('on', b.dataset.sort === order); });
  }
  function write() {
    var h = cat === 'all' && order === 'plays' ? '' : order === 'plays' ? '#' + cat : '#cat=' + cat + '&sort=' + order;
    history.replaceState(null, '', h || location.pathname);
  }
  function set(next) {
    if (next.cat !== undefined) cat = next.cat;
    if (next.sort !== undefined) order = next.sort;
    render(); write();
    window.tally && tally('browse', { cat: cat, sort: order });
  }
  nav.addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (b) set({ cat: b.dataset.cat }); });
  sorts.addEventListener('click', function (e) { var b = e.target.closest('.sort'); if (b) set({ sort: b.dataset.sort }); });

  function fromHash() {
    var h = location.hash.slice(1), c = 'all', o = 'plays';
    if (h.indexOf('=') >= 0) {
      var q = new URLSearchParams(h);
      c = q.get('cat') || 'all'; o = q.get('sort') === 'new' ? 'new' : 'plays';
    } else if (h) { c = h; }
    if (c !== 'all' && !nav.querySelector('.chip[data-cat="' + c + '"]')) c = 'all';
    cat = c; order = o; render();
  }
  addEventListener('hashchange', fromHash);
  if (location.hash.slice(1)) fromHash(); else render();
})();
</script>
<script defer src="/t.js"></script>
</body></html>`;
}
