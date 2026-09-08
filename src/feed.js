// The ranked list hundred-carts reads. Plays come from the tally hub, joined
// on the manifest's site (the URL's hostname).
export async function buildFeed(registry, tally, { includeAll = false, sort = 'plays' } = {}) {
  const [d7, d30, all, starts, e7, e30] = await Promise.all([tally.sites(7), tally.sites(30), tally.sites(3650), tally.countByName('start', 7), tally.engagedSites(7), tally.engagedSites(30)]);
  const by = (rows) => Object.fromEntries(rows.map((r) => [r.site, r]));
  const s7 = by(d7), s30 = by(d30), sAll = by(all), st = by(starts), g7 = by(e7), g30 = by(e30);
  const games = registry.all()
    .filter((r) => !r.manifest.hidden)
    .filter((r) => includeAll || r.status === 'live')
    .map((r) => {
      const m = r.manifest;
      // engaged: visitors who clicked, started, or stayed ten seconds. Crawlers never do; rank on it.
      const plays = { engaged7: g7[m.site]?.engaged ?? 0, engaged30: g30[m.site]?.engaged ?? 0, d7: s7[m.site]?.visitors ?? 0, d30: s30[m.site]?.visitors ?? 0, all: sAll[m.site]?.visitors ?? 0 };
      return {
        slug: m.slug, name: m.name, url: m.url, shell: m.shell, plate: `/plates/${m.slug}`,
        designers: m.designers, started: m.started, tags: m.tags, family: m.family, variant: m.variant,
        description: m.description, repo: m.repo, state: m.state, platform: m.platform || 'unknown',
        status: r.status, latency: r.latency, checked: r.checked, source: r.source,
        plays, starts7: st[m.site]?.c ?? 0, events7: s7[m.site]?.events ?? 0,
      };
    });
  const cmp = sort === 'started'
    ? (a, b) => (b.started || '').localeCompare(a.started || '') || a.slug.localeCompare(b.slug)
    : (a, b) => b.plays.engaged7 - a.plays.engaged7 || b.plays.engaged30 - a.plays.engaged30 || b.plays.d7 - a.plays.d7 || b.plays.d30 - a.plays.d30 || b.plays.all - a.plays.all || (b.started || '').localeCompare(a.started || '') || a.slug.localeCompare(b.slug);
  games.sort(cmp);
  games.forEach((g, i) => { g.rank = i + 1; });
  const families = {};
  for (const g of games) (families[g.family] ??= []).push(g.slug);
  return { generatedAt: Date.now(), count: games.length, sort, games, families };
}

/** The four-field shape hundred-carts already reads, plus plate. */
export function cartsShape(feed) {
  return feed.games.map((g) => ({ s: g.slug, n: g.name, u: g.url, a: g.shell, plate: g.plate, rank: g.rank, plays: g.plays.engaged7, visitors: g.plays.d7, family: g.family, variant: g.variant || undefined }));
}
