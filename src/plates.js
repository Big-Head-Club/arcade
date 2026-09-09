// A plate is the picture on the cartridge label. Three sources, in order:
// the file the manifest names in the repo; a screenshot we shot ourselves;
// a generated placeholder with the game's name on the shell's colour.
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withChromium, findChrome } from './chromium.js';

const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const SHELL_COLORS = { whale: '#2f4f6f', galaxy: '#3b2a5a', fish: '#1f6f5f', crown: '#7a5a1e', arch: '#6b3a2a', tower: '#f2812f', hare: '#8a7a5a', scarab: '#2a5a3a', moth: '#5a5a5a', lighthouse: '#a83a2a' };

export function plates({ dir, gh }) {
  mkdirSync(dir, { recursive: true });
  const cachePath = (slug, ext) => join(dir, `${slug}${ext}`);

  function cached(slug) {
    for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
      const p = cachePath(slug, ext);
      if (existsSync(p)) return { path: p, type: TYPES[ext], age: Date.now() - statSync(p).mtimeMs };
    }
    return null;
  }

  /** Bytes + content type for a game's plate. Never throws. */
  async function get(m) {
    if (m.plate && m.repo && gh) {
      const c = cached(m.slug);
      if (c && c.age < 86_400_000) return { bytes: readFileSync(c.path), type: c.type };
      try {
        const f = await gh.fileOf(m.repo, m.plate);
        if (f) {
          const ext = Object.entries(TYPES).find(([, t]) => t === f.type.split(';')[0])?.[0] || '.png';
          writeFileSync(cachePath(m.slug, ext), f.bytes);
          return { bytes: f.bytes, type: TYPES[ext] };
        }
      } catch {}
    }
    const shot = join(dir, `${m.slug}.shot.jpg`);
    if (existsSync(shot)) return { bytes: readFileSync(shot), type: 'image/jpeg' };
    const c = cached(m.slug);
    if (c) return { bytes: readFileSync(c.path), type: c.type };
    return { bytes: Buffer.from(placeholder(m)), type: 'image/svg+xml' };
  }

  function placeholder(m) {
    const bg = SHELL_COLORS[m.shell] || '#444';
    const words = String(m.name).replace(/[<&>]/g, '').split(/\s+/);
    const lines = []; let cur = '';
    for (const w of words) { if ((cur + ' ' + w).trim().length > 14 && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
    if (cur) lines.push(cur);
    const size = Math.min(96, Math.floor(700 / Math.max(...lines.map((l) => l.length)) / 0.66));
    const lh = size * 1.15, top = 315 - (lh * (lines.length - 1)) / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="630" viewBox="0 0 840 630"><rect width="840" height="630" fill="${bg}"/>${lines.map((l, i) => `<text x="420" y="${(top + i * lh).toFixed(0)}" fill="#fff" font-family="ui-monospace,Menlo,monospace" font-size="${size}" font-weight="700" text-anchor="middle" letter-spacing="3">${l}</text>`).join('')}<text x="420" y="${(top + lines.length * lh + 10).toFixed(0)}" fill="#fff" fill-opacity=".6" font-family="ui-monospace,Menlo,monospace" font-size="22" text-anchor="middle">${m.variant ? m.variant.replace(/[<&>]/g, '') : 'BIG HEAD CLUB'}</text></svg>`;
  }

  /** Screenshot every live game that has no plate of its own. Needs Chromium. */
  async function shoot(rows, { log = () => {} } = {}) {
    if (!findChrome()) { log('plates: no chromium, skipping'); return 0; }
    const todo = rows.filter((r) => r.status === 'live' && !r.manifest.plate && !r.manifest.hidden);
    if (!todo.length) return 0;
    let done = 0;
    await withChromium(async ({ page, wait }) => {
      for (const r of todo) {
        let tab;
        try {
          tab = await page();
          await tab.send('Emulation.setDeviceMetricsOverride', { width: 840, height: 630, deviceScaleFactor: 1, mobile: false });
          await tab.send('Page.navigate', { url: r.manifest.url });
          await wait(5000);
          const shot = await tab.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
          if (shot?.data) { writeFileSync(join(dir, `${r.slug}.shot.jpg`), Buffer.from(shot.data, 'base64')); done++; }
        } catch (e) { log(`plates: ${r.slug}: ${e.message}`); }
        finally { await tab?.close(); }
      }
    }, { log });
    log(`plates: shot ${done} of ${todo.length}`);
    return done;
  }

  return { get, shoot, dir };
}
