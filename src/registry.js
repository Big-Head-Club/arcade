// The registry: one SQLite table of games, each row the latest manifest we
// know plus where it came from, and what the prober last saw.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openRegistry(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    create table if not exists games (
      slug text primary key,
      manifest text not null,          -- normalised cart.json
      source text not null,            -- 'manifest' (from a repo) | 'seed' (from the seed files)
      repo text,
      updated integer not null,
      status text not null default 'workshop',   -- workshop | live | down
      checked integer,
      latency integer,
      probe_note text
    );
    create table if not exists meta (k text primary key, v text not null);
  `);
  const upsert = db.prepare(`insert into games (slug, manifest, source, repo, updated) values (?,?,?,?,?)
    on conflict(slug) do update set manifest=excluded.manifest, source=excluded.source, repo=excluded.repo, updated=excluded.updated`);
  const upsertSeed = db.prepare(`insert into games (slug, manifest, source, repo, updated) values (?,?,'seed',?,?)
    on conflict(slug) do nothing`);
  const setProbe = db.prepare('update games set status=?, checked=?, latency=?, probe_note=? where slug=?');
  const get = db.prepare('select * from games where slug=?');
  const all = db.prepare('select * from games order by slug');
  const del = db.prepare('delete from games where slug=?');
  const metaGet = db.prepare('select v from meta where k=?');
  const metaSet = db.prepare('insert into meta (k,v) values (?,?) on conflict(k) do update set v=excluded.v');
  const row = (r) => r && { ...r, manifest: JSON.parse(r.manifest) };
  return {
    upsert(m, { source = 'manifest' } = {}) { upsert.run(m.slug, JSON.stringify(m), source, m.repo || null, Date.now()); return this.get(m.slug); },
    seed(m) { upsertSeed.run(m.slug, JSON.stringify(m), m.repo || null, Date.now()); },
    setProbe(slug, { status, latency = null, note = '' }) { setProbe.run(status, Date.now(), latency, note, slug); },
    get(slug) { return row(get.get(slug)); },
    all() { return all.all().map(row); },
    remove(slug) { return del.run(slug).changes; },
    meta(k, v) { if (v === undefined) return metaGet.get(k)?.v ?? null; metaSet.run(k, v); return v; },
    close() { db.close(); },
  };
}
