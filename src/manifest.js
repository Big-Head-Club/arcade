// cart.json: the one file a game repo carries so the fleet knows about it.
export const SHELLS = ['whale', 'galaxy', 'fish', 'crown', 'arch', 'tower', 'hare', 'scarab', 'moth', 'lighthouse'];
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function shellFor(slug) {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SHELLS[h % SHELLS.length];
}

/** Validate and normalise a manifest. Throws with a readable message. */
export function normalizeManifest(raw, { repo } = {}) {
  if (!raw || typeof raw !== 'object') throw new Error('manifest is not an object');
  const slug = String(raw.slug || '').toLowerCase().trim();
  if (!SLUG_RE.test(slug)) throw new Error(`bad slug "${raw.slug}"`);
  const name = String(raw.name || slug).trim().slice(0, 80);
  const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const list = (v, max = 12) => (Array.isArray(v) ? v.map((x) => str(x, 40)).filter(Boolean).slice(0, max) : []);
  let url = str(raw.url, 300);
  if (url && !/^https?:\/\//.test(url)) throw new Error(`bad url "${url}"`);
  url = url.replace(/\/$/, '');
  const started = str(raw.started, 10);
  if (started && !/^\d{4}-\d{2}-\d{2}$/.test(started)) throw new Error(`bad started "${started}" (YYYY-MM-DD)`);
  const shell = SHELLS.includes(raw.shell) ? raw.shell : shellFor(slug);
  const state = raw.state === 'volume' ? 'volume' : 'none';
  return {
    slug, name, url, started,
    designers: list(raw.designers, 6),
    tags: list(raw.tags),
    family: str(raw.family, 64).toLowerCase() || slug,
    variant: str(raw.variant, 40),
    repo: str(raw.repo, 120) || repo || '',
    plate: str(raw.plate, 200),
    probe: str(raw.probe, 80),
    site: str(raw.site, 120).toLowerCase() || (url ? new URL(url).hostname.toLowerCase() : ''),
    shell, state,
    platform: ['mobile', 'desktop', 'both'].includes(raw.platform) ? raw.platform : '',
    description: str(raw.description, 300),
    hidden: raw.hidden === true,
  };
}
