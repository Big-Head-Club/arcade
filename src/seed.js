// Day-one contents: every game on Mack's carts list, with tags and titles from
// the build ledger. A row from here is replaced the moment its repo ships a
// cart.json.
import { readFileSync } from 'node:fs';
import { normalizeManifest } from './manifest.js';

const read = (dir, f) => JSON.parse(readFileSync(new URL(`${dir}/${f}`, import.meta.url), 'utf8'));

// carts slug -> repo name where they differ
const REPO_OF = { 'hex-smash': 'energy-grid', sheepenomics: 'holdout' };

export function seedManifests({ org = 'Big-Head-Club', dir = '../seed' } = {}) {
  const carts = read(dir, 'carts.json');
  const tags = read(dir, 'tags.json');
  const titles = read(dir, 'titles.json');
  const measured = read(dir, 'measured.json').projects || [];
  const started = Object.fromEntries(measured.map((m) => [m.n, m.s]));
  return carts.map((c) => {
    const repoName = REPO_OF[c.s] || c.s;
    return normalizeManifest({
      slug: c.s, name: c.n, url: c.u, shell: c.a,
      tags: tags[repoName] || tags[c.s] || [],
      started: started[repoName] || started[c.s] || '',
      probe: titles[repoName]?.[0] || '',
      designers: ['mack'],
      repo: `${org}/${repoName}`,
    });
  });
}
