import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createHmac } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createArcade } from '../src/server.js';
import { normalizeManifest, shellFor } from '../src/manifest.js';
import { probeOne } from '../src/probe.js';

// A fake GitHub: a map of repo -> manifest, plus org listing.
function fakeGh(repos) {
  return {
    org: 'Big-Head-Club', hasToken: true,
    async manifestOf(full) { const m = repos[full]; return m ? { raw: m, sha: 'x' } : null; },
    async fileOf() { return null; },
    async *repos() { for (const full of Object.keys(repos)) yield { name: full.split('/')[1], full, archived: false }; },
  };
}

async function boot({ repos = {}, seed = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'arcade-'));
  const arcade = createArcade({ dataDir: dir, gh: fakeGh(repos), seed, jobs: false, webhookSecret: 'shh', tally: { token: 'tok' }, log: () => {} });
  const server = http.createServer((req, res) => arcade.handle(req, res));
  await new Promise((r) => server.listen(0, r));
  await arcade.start();
  const base = `http://localhost:${server.address().port}`;
  return { arcade, base, close: () => new Promise((r) => server.close(r)).then(() => arcade.close()) };
}

test('manifest normalisation', () => {
  const m = normalizeManifest({ slug: 'Salt-Flats', name: 'SALT FLATS', url: 'https://salt-flats.fly.dev/', started: '2026-09-16', designers: ['gustavo'], tags: ['Daily'] }, { repo: 'Big-Head-Club/salt-flats' });
  assert.equal(m.slug, 'salt-flats');
  assert.equal(m.url, 'https://salt-flats.fly.dev');
  assert.equal(m.site, 'salt-flats.fly.dev');
  assert.equal(m.family, 'salt-flats');
  assert.equal(m.repo, 'Big-Head-Club/salt-flats');
  assert.equal(m.shell, shellFor('salt-flats'));
  assert.throws(() => normalizeManifest({ slug: 'bad slug' }), /bad slug/);
  assert.throws(() => normalizeManifest({ slug: 'ok', started: 'yesterday' }), /started/);
  assert.throws(() => normalizeManifest({ slug: 'ok', url: 'ftp://x' }), /bad url/);
});

test('seed fills the registry and the feed lists it', async () => {
  const t = await boot({ seed: true });
  const f = await (await fetch(`${t.base}/api/games.json?all=1`)).json();
  assert.ok(f.count >= 60, `seeded ${f.count}`);
  const pz = f.games.find((g) => g.slug === 'patient-zero');
  assert.equal(pz.source, 'seed');
  assert.equal(pz.status, 'workshop');           // not probed in tests
  assert.equal(pz.plays.d7, 0);
  const live = await (await fetch(`${t.base}/api/games.json`)).json();
  assert.equal(live.count, 0);                    // nothing probed live yet
  const plate = await fetch(`${t.base}/plates/patient-zero`);
  assert.equal(plate.headers.get('content-type'), 'image/svg+xml');
  await t.close();
});

test('manifest from a repo replaces a seed row, and plays rank the feed', async () => {
  const repos = { 'Big-Head-Club/patient-zero': { slug: 'patient-zero', name: 'PATIENT ZERO', url: 'https://patient-zero.fly.dev', designers: ['mack'], started: '2026-08-30', family: 'spotted', variant: "Mack's" },
                  'Big-Head-Club/ringer': { slug: 'ringer', name: 'SPOTTED', url: 'https://ringer.fly.dev', family: 'spotted', variant: 'Original' } };
  const t = await boot({ repos, seed: true });
  await t.arcade.scanOrg();
  const row = t.arcade.registry.get('patient-zero');
  assert.equal(row.source, 'manifest');
  assert.equal(row.manifest.url, 'https://patient-zero.fly.dev');
  // pretend the prober ran and both are live
  t.arcade.registry.setProbe('patient-zero', { status: 'live', latency: 200 });
  t.arcade.registry.setProbe('ringer', { status: 'live', latency: 200 });
  // browser events land in the hub keyed by hostname
  const post = (site, n = 1) => Promise.all(Array.from({ length: n }, (_, i) => fetch(`${t.base}/i`, { method: 'POST', body: JSON.stringify([{ n: 'pageview', s: site }, { n: 'start', s: site }]), headers: { 'x-forwarded-for': `10.0.0.${i}`, 'user-agent': 'A' } })));
  await post('ringer.fly.dev', 3);
  await post('patient-zero.fly.dev', 1);
  await post('localhost', 5);                    // ignored
  const f = await (await fetch(`${t.base}/api/games.json`)).json();
  assert.deepEqual(f.games.map((g) => g.slug), ['ringer', 'patient-zero']);
  assert.equal(f.games[0].plays.d7, 3);
  assert.equal(f.games[0].plays.engaged7, 3);    // the start event counts as engagement
  assert.equal(f.games[0].plays.week, 3);
  assert.equal(f.games[0].plays.by, 'runs');
  assert.equal(f.games[0].starts7, 3);
  assert.equal(f.games[0].rank, 1);
  assert.deepEqual(f.families.spotted, ['ringer', 'patient-zero']);
  // a crawler visiting the low-ranked game 10 times, pageviews only, does not lift it
  await Promise.all(Array.from({ length: 10 }, (_, i) => fetch(`${t.base}/i`, { method: 'POST', body: JSON.stringify([{ n: 'pageview', s: 'patient-zero.fly.dev' }]), headers: { 'x-forwarded-for': `10.9.9.${i}`, 'user-agent': 'Mozilla/5.0 Chrome' } })));
  const f2 = await (await fetch(`${t.base}/api/games.json?nocache=${Date.now()}`)).json();
  assert.equal(f2.games[0].slug, 'ringer');
  const carts = await (await fetch(`${t.base}/api/carts.json`)).json();
  assert.deepEqual(Object.keys(carts[0]).slice(0, 4), ['s', 'n', 'u', 'a']);
  const one = await (await fetch(`${t.base}/api/games/patient-zero.json`)).json();
  assert.equal(one.variant, "Mack's");
  await t.close();
});

test('one repo can ship several carts; dropped ones go away', async () => {
  const repos = { 'Big-Head-Club/flip-duel': [
    { slug: 'flip-duel', name: 'LORE WARS', url: 'https://lorewars.xyz', family: 'lore-wars', variant: "Gustavo's" },
    { slug: 'lore-wars', name: 'LORE WARS', url: 'https://lore-wars.up.railway.app', family: 'lore-wars', variant: "Mack's" },
  ] };
  const t = await boot({ repos });
  await t.arcade.scanOrg();
  assert.deepEqual(t.arcade.registry.all().map((r) => r.slug).sort(), ['flip-duel', 'lore-wars']);
  repos['Big-Head-Club/flip-duel'].pop();
  await t.arcade.refreshRepo('Big-Head-Club/flip-duel');
  assert.deepEqual(t.arcade.registry.all().map((r) => r.slug), ['flip-duel']);
  delete repos['Big-Head-Club/flip-duel'];
  await t.arcade.refreshRepo('Big-Head-Club/flip-duel');
  assert.deepEqual(t.arcade.registry.all().map((r) => r.slug), []);
  await t.close();
});

test('webhook: signed push refreshes the repo; unsigned is refused', async () => {
  const repos = { 'Big-Head-Club/new-game': { slug: 'new-game', name: 'NEW GAME', url: 'https://new-game.fly.dev' } };
  const t = await boot({ repos });
  const body = JSON.stringify({ ref: 'refs/heads/main', repository: { full_name: 'Big-Head-Club/new-game', default_branch: 'main' } });
  const sig = 'sha256=' + createHmac('sha256', 'shh').update(body).digest('hex');
  assert.equal((await fetch(`${t.base}/hooks/github`, { method: 'POST', body, headers: { 'x-github-event': 'push', 'x-hub-signature-256': 'sha256=nope' } })).status, 401);
  assert.equal((await fetch(`${t.base}/hooks/github`, { method: 'POST', body, headers: { 'x-github-event': 'push', 'x-hub-signature-256': sig } })).status, 202);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(t.arcade.registry.get('new-game')?.manifest.name, 'NEW GAME');
  await t.close();
});

test('admin registry is behind the tally token', async () => {
  const t = await boot({ seed: true });
  assert.equal((await fetch(`${t.base}/admin/registry/wrong`)).status, 404);
  const r = await (await fetch(`${t.base}/admin/registry/tok`)).json();
  assert.ok(r.games.length > 0);
  assert.equal(r.github, 'token');
  await t.close();
});

test('probe needs the page to name the game', async () => {
  const fetchImpl = async (url) => ({ ok: true, status: 200, text: async () => (url.includes('good') ? '<title>Salt Flats</title>' : '<title>Railway</title>') });
  assert.equal((await probeOne({ url: 'https://good', name: 'SALT FLATS', slug: 'salt-flats' }, { fetchImpl })).status, 'live');
  assert.equal((await probeOne({ url: 'https://bad', name: 'SALT FLATS', slug: 'salt-flats' }, { fetchImpl })).status, 'down');
  assert.equal((await probeOne({ url: '', name: 'X', slug: 'x' })).status, 'workshop');
});
