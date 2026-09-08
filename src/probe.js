// Is the game actually up? A 200 is not enough: an unclaimed Railway
// subdomain still answers. The page has to mention the game's name, or the
// manifest's `probe` string.
const fold = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export async function probeOne(m, { fetchImpl = fetch, timeoutMs = 15_000 } = {}) {
  if (!m.url) return { status: 'workshop', latency: null, note: 'no url' };
  const t0 = Date.now();
  try {
    const r = await fetchImpl(m.url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': 'bhc-arcade-probe' } });
    const latency = Date.now() - t0;
    if (!r.ok) return { status: 'down', latency, note: `http ${r.status}` };
    const body = (await r.text()).slice(0, 200_000);
    const hay = fold(body);
    const needles = [m.probe, m.name, m.slug.replace(/-/g, ' ')].filter(Boolean).map(fold);
    const hit = needles.find((n) => n && hay.includes(n));
    if (!hit) return { status: 'down', latency, note: 'page does not mention the game' };
    return { status: 'live', latency, note: '' };
  } catch (e) {
    return { status: 'down', latency: Date.now() - t0, note: e.name === 'TimeoutError' ? 'timeout' : String(e.message).slice(0, 80) };
  }
}

export async function probeAll(registry, opts = {}) {
  const rows = registry.all().filter((r) => !r.manifest.hidden);
  const queue = [...rows];
  const workers = Array.from({ length: opts.concurrency || 6 }, async () => {
    for (let r = queue.shift(); r; r = queue.shift()) {
      const res = await probeOne(r.manifest, opts);
      registry.setProbe(r.slug, res);
    }
  });
  await Promise.all(workers);
  return rows.length;
}
