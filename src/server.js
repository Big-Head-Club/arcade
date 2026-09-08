// The arcade: one process, one volume. tally handles /t.js, /i and the
// analytics dashboard; the registry handles everything under /api, /plates,
// /hooks, /admin/registry.
import http from 'node:http';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createTally } from 'tally';
import { openRegistry } from './registry.js';
import { github, verifySignature } from './github.js';
import { normalizeManifest } from './manifest.js';
import { probeAll } from './probe.js';
import { plates as makePlates } from './plates.js';
import { buildFeed, cartsShape } from './feed.js';
import { seedManifests } from './seed.js';
import { homePage } from './home.js';

export function createArcade(opts = {}) {
  const dataDir = opts.dataDir || process.env.DATA_DIR || './data';
  const publicUrl = (opts.publicUrl || process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const tally = createTally({ dir: dataDir, tz: opts.tz || process.env.TZ || 'America/New_York', ...(opts.tally || {}) });
  const registry = openRegistry(opts.registryFile || join(dataDir, 'registry.sqlite'));
  const gh = opts.gh || github({ token: opts.githubToken ?? process.env.GITHUB_TOKEN, org: opts.org || process.env.GITHUB_ORG || 'Big-Head-Club', fetchImpl: opts.fetch });
  const plates = makePlates({ dir: join(dataDir, 'plates'), gh });
  const webhookSecret = opts.webhookSecret ?? process.env.WEBHOOK_SECRET ?? '';
  const log = opts.log || ((...a) => console.log(new Date().toISOString(), ...a));
  let adminToken;

  // Seed rows never overwrite a real manifest; they fill the gaps on day one.
  if (opts.seed !== false) for (const m of seedManifests({ org: gh.org })) registry.seed(m);

  async function refreshRepo(repoFull) {
    const found = await gh.manifestOf(repoFull);
    if (!found) return null;
    const m = normalizeManifest(found.raw, { repo: repoFull });
    m.repo = m.repo || repoFull;
    const row = registry.upsert(m, { source: 'manifest' });
    log('registry: manifest', m.slug, 'from', repoFull);
    return row;
  }

  async function scanOrg() {
    let seen = 0, withManifest = 0;
    for await (const r of gh.repos()) {
      if (r.archived) continue;
      seen++;
      try { if (await refreshRepo(r.full)) withManifest++; } catch (e) { log('registry: scan', r.full, e.message); }
    }
    registry.meta('lastScan', String(Date.now()));
    log(`registry: scanned ${seen} repos, ${withManifest} manifests`);
    return { seen, withManifest };
  }

  let feedCache = { at: 0, key: '', value: null };
  async function feed(q) {
    const includeAll = q.get('all') === '1';
    const sort = q.get('sort') === 'started' ? 'started' : 'plays';
    const key = `${includeAll}|${sort}`;
    if (feedCache.key === key && Date.now() - feedCache.at < 60_000) return feedCache.value;
    const value = await buildFeed(registry, tally, { includeAll, sort });
    feedCache = { at: Date.now(), key, value };
    return value;
  }

  const send = (res, status, body, type = 'application/json; charset=utf-8', extra = {}) => {
    res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'access-control-allow-origin': '*', ...extra });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };

  async function handle(req, res) {
    if (await tally.handler(req, res)) return;
    const url = new URL(req.url, 'http://x');
    const p = url.pathname.replace(/\/$/, '') || '/';

    if (p === '/health') return send(res, 200, 'ok', 'text/plain');
    if (p === '/') return send(res, 200, homePage(await feed(url.searchParams), { publicUrl }), 'text/html; charset=utf-8', { 'cache-control': 'public, max-age=60' });
    if (p === '/api/games.json') return send(res, 200, await feed(url.searchParams), undefined, { 'cache-control': 'public, max-age=60' });
    if (p === '/api/carts.json') return send(res, 200, cartsShape(await feed(url.searchParams)), undefined, { 'cache-control': 'public, max-age=60' });
    let m;
    if ((m = p.match(/^\/api\/games\/([a-z0-9-]+)\.json$/))) {
      const f = await feed(new URLSearchParams('all=1'));
      const g = f.games.find((x) => x.slug === m[1]);
      return g ? send(res, 200, g) : send(res, 404, { error: 'unknown game' });
    }
    if ((m = p.match(/^\/plates\/([a-z0-9-]+)(?:\.(?:png|jpg|svg))?$/))) {
      const row = registry.get(m[1]);
      if (!row) return send(res, 404, 'no such game', 'text/plain');
      const img = await plates.get(row.manifest);
      return send(res, 200, img.bytes, img.type, { 'cache-control': 'public, max-age=3600' });
    }
    if (p === '/hooks/github' && req.method === 'POST') {
      const body = await readBody(req, 1_000_000);
      if (body == null) return send(res, 413, 'too big', 'text/plain');
      if (!verifySignature(webhookSecret, body, req.headers['x-hub-signature-256'])) return send(res, 401, 'bad signature', 'text/plain');
      const event = req.headers['x-github-event'];
      let payload; try { payload = JSON.parse(body); } catch { return send(res, 400, 'bad json', 'text/plain'); }
      const repo = payload.repository?.full_name;
      if (event === 'push' && repo && payload.ref === `refs/heads/${payload.repository.default_branch}`) {
        refreshRepo(repo).then((row) => { if (row) feedCache.at = 0; }).catch((e) => log('webhook', repo, e.message));
      } else if (event === 'repository' && payload.action === 'deleted' && repo) {
        for (const r of registry.all()) if (r.repo === repo) registry.remove(r.slug);
      }
      return send(res, 202, 'ok', 'text/plain');
    }
    if ((m = p.match(/^\/admin\/registry\/([^/]+)(?:\/([a-z]+))?$/))) {
      if (!adminToken || m[1] !== adminToken) return send(res, 404, 'not found', 'text/plain');
      if (m[2] === 'rescan' && req.method === 'POST') { scanOrg().catch((e) => log('rescan', e.message)); return send(res, 202, { started: true }); }
      if (m[2] === 'probe' && req.method === 'POST') { probeAll(registry).then(() => { feedCache.at = 0; }).catch((e) => log('probe', e.message)); return send(res, 202, { started: true }); }
      if (m[2] === 'shoot' && req.method === 'POST') { plates.shoot(registry.all(), { log }).then((n) => log('plates: shot', n)).catch((e) => log('shoot', e.message)); return send(res, 202, { started: true }); }
      return send(res, 200, { lastScan: registry.meta('lastScan'), github: gh.hasToken ? 'token' : 'anonymous', games: registry.all() });
    }
    send(res, 404, 'not found', 'text/plain');
  }

  const timers = [];
  async function start() {
    await tally.ready;
    adminToken = tally.token || tally.dashboardUrl('').split('/').pop();
    if (opts.jobs !== false) {
      probeAll(registry).then(() => { feedCache.at = 0; }).catch((e) => log('probe', e.message));
      timers.push(setInterval(() => probeAll(registry).then(() => { feedCache.at = 0; }).catch((e) => log('probe', e.message)), 10 * 60_000));
      timers.push(setInterval(() => { feedCache.at = 0; }, 2 * 60_000));
      const sinceScan = Date.now() - Number(registry.meta('lastScan') || 0);
      if (sinceScan > 6 * 3_600_000) setTimeout(() => scanOrg().catch((e) => log('scan', e.message)), 5_000);
      timers.push(setInterval(() => scanOrg().catch((e) => log('scan', e.message)), 24 * 3_600_000));
      timers.push(setInterval(() => {
        const h = new Date().getHours();
        if (h === 4) plates.shoot(registry.all(), { log }).then((n) => n && log('plates: shot', n)).catch((e) => log('shoot', e.message));
      }, 3_600_000));
    }
    for (const t of timers) t.unref?.();
  }

  async function close() { for (const t of timers) clearInterval(t); registry.close(); await tally.close(); }

  return { handle, start, close, tally, registry, gh, plates, refreshRepo, scanOrg, feed, get adminToken() { return adminToken; }, publicUrl };
}

function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > max) { req.pause(); resolve(null); return; } chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arcade = createArcade();
  const port = Number(process.env.PORT) || 8080;
  const server = http.createServer((req, res) => arcade.handle(req, res).catch((e) => { console.error(e); if (!res.headersSent) res.writeHead(500); res.end(); }));
  await arcade.start();
  server.listen(port, () => {
    const origin = arcade.publicUrl || `http://localhost:${port}`;
    console.log(`arcade on :${port}`);
    console.log(`feed:      ${origin}/api/games.json`);
    console.log(`analytics: ${arcade.tally.dashboardUrl(origin)}`);
    console.log(`registry:  ${origin}/admin/registry/${arcade.adminToken}`);
    console.log(`github:    ${arcade.gh.hasToken ? 'token set' : 'no token (public repos only)'}`);
  });
  for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { server.close(); arcade.close().finally(() => process.exit(0)); });
}
