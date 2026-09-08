// Everything that talks to GitHub: reading a repo's cart.json, listing the
// org, verifying webhooks. A token is optional but needed for private repos.
import { createHmac, timingSafeEqual } from 'node:crypto';

const API = 'https://api.github.com';

export function github({ token = process.env.GITHUB_TOKEN, org = process.env.GITHUB_ORG || 'Big-Head-Club', fetchImpl = fetch } = {}) {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'bhc-arcade', ...(token ? { authorization: `Bearer ${token}` } : {}) };

  async function json(path) {
    const r = await fetchImpl(`${API}${path}`, { headers });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`github ${r.status} ${path}`);
    return r.json();
  }

  /** Parsed cart.json from a repo's default branch, or null if it has none. */
  async function manifestOf(repo) {
    const c = await json(`/repos/${repo}/contents/cart.json`);
    if (!c || !c.content) return null;
    const text = Buffer.from(c.content, 'base64').toString('utf8');
    return { raw: JSON.parse(text), sha: c.sha };
  }

  /** A file's bytes from a repo, for plates. */
  async function fileOf(repo, path) {
    const r = await fetchImpl(`${API}/repos/${repo}/contents/${path.replace(/^\//, '')}`, { headers: { ...headers, accept: 'application/vnd.github.raw' } });
    if (!r.ok) return null;
    return { bytes: Buffer.from(await r.arrayBuffer()), type: r.headers.get('content-type') || 'application/octet-stream' };
  }

  async function* repos() {
    for (let page = 1; page < 20; page++) {
      const list = await json(`/orgs/${org}/repos?per_page=100&page=${page}&sort=pushed`);
      if (!list || !list.length) return;
      for (const r of list) yield { name: r.name, full: r.full_name, pushed: r.pushed_at, archived: r.archived, private: r.private };
      if (list.length < 100) return;
    }
  }

  async function firstCommitDate(repo) {
    // The last page of the commit list is the first commit.
    const r = await fetchImpl(`${API}/repos/${repo}/commits?per_page=1`, { headers });
    if (!r.ok) return null;
    const link = r.headers.get('link') || '';
    const m = link.match(/page=(\d+)>; rel="last"/);
    const list = m ? await json(`/repos/${repo}/commits?per_page=1&page=${m[1]}`) : await r.json();
    return list?.[0]?.commit?.author?.date?.slice(0, 10) ?? null;
  }

  async function contributors(repo) {
    return (await json(`/repos/${repo}/contributors?per_page=5`)) || [];
  }

  return { manifestOf, fileOf, repos, firstCommitDate, contributors, org, hasToken: !!token };
}

/** GitHub signs webhook bodies with HMAC-SHA256 of the secret. */
export function verifySignature(secret, body, header) {
  if (!secret || !header || !header.startsWith('sha256=')) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  return expected.length === header.length && timingSafeEqual(Buffer.from(expected), Buffer.from(header));
}
