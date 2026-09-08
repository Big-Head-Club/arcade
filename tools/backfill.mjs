#!/usr/bin/env node
// Generate a cart.json for every game on the seed list, from what GitHub knows:
// first commit date, top committer -> designer, tags and titles from the ledger.
// Writes them to out/<slug>/cart.json for review; nothing is pushed.
//
//   GITHUB_TOKEN=... node tools/backfill.mjs [slug ...]
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { github } from '../src/github.js';
import { seedManifests } from '../src/seed.js';

const people = JSON.parse(readFileSync(new URL('../people.json', import.meta.url), 'utf8'));
const gh = github();
const only = new Set(process.argv.slice(2));
const seeds = seedManifests().filter((m) => !only.size || only.has(m.slug));
mkdirSync('out', { recursive: true });
for (const m of seeds) {
  const repo = m.repo;
  const [started, contributors] = await Promise.all([gh.firstCommitDate(repo).catch(() => null), gh.contributors(repo).catch(() => [])]);
  const designers = [...new Set(contributors.map((c) => people[c.login]?.id).filter(Boolean))];
  const cart = {
    slug: m.slug, name: m.name,
    designers: designers.length ? designers : m.designers,
    started: started || m.started || undefined,
    tags: m.tags, family: m.family, variant: '',
    url: m.url, repo, plate: '', probe: m.probe || undefined, state: 'none', shell: m.shell,
  };
  for (const k of Object.keys(cart)) if (cart[k] === undefined || cart[k] === '') delete cart[k];
  mkdirSync(`out/${m.slug}`, { recursive: true });
  writeFileSync(`out/${m.slug}/cart.json`, JSON.stringify(cart, null, 2) + '\n');
  console.log(m.slug, repo, started, designers.join(','));
}
