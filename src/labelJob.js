// Labels: rendered from the plate and the manifest, rasterised through Chromium so every
// viewer sees the same fonts, cached on the volume under a key of everything that went in.
// A new plate, a new name, or a new renderer re-renders the label; nothing else does.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { labelSvg, WINDOWS, RENDERER } from './labels.js';
import { withChromium, findChrome } from './chromium.js';

const SCALE = 3;   // label pixels per window pixel in the raster; jpeg, the window is a rectangle

export function labels({ dir, plates, gh }) {
  const artCache = new Map();   // slug -> { at, art }

  /** The picture for the label: `label` art from the repo if the manifest names one, else the plate. */
  async function pictureFor(m) {
    if (m.label && m.repo && gh) {
      const c = artCache.get(m.slug);
      if (c && Date.now() - c.at < 3_600_000) return c.art;
      try { const f = await gh.fileOf(m.repo, m.label); if (f) { const art = { bytes: f.bytes, type: f.type.split(';')[0], own: true }; artCache.set(m.slug, { at: Date.now(), art }); return art; } } catch {}
    }
    return plates.get(m);
  }
  mkdirSync(dir, { recursive: true });

  function keyFor(m, plate) {
    return createHash('sha1').update([RENDERER, m.slug, m.name, m.shell, m.started, m.variant, plate.type, plate.bytes.length].join('|')).update(plate.bytes).digest('hex').slice(0, 12);
  }
  function files(slug) { return readdirSync(dir).filter((f) => f.startsWith(slug + '.') && /\.(png|jpg)$/.test(f)); }

  /** The rendered PNG if the cache holds a current one, else the live SVG. */
  async function get(m) {
    const plate = await pictureFor(m);
    const key = keyFor(m, plate);
    const hit = join(dir, `${m.slug}.${key}.jpg`);
    if (existsSync(hit)) return { bytes: readFileSync(hit), type: 'image/jpeg', rendered: true };
    const stale = files(m.slug)[0];
    if (stale) return { bytes: readFileSync(join(dir, stale)), type: stale.endsWith('.png') ? 'image/png' : 'image/jpeg', rendered: true, stale: true };
    return { bytes: Buffer.from(labelSvg(m, plate)), type: 'image/svg+xml', rendered: false };
  }

  async function svg(m) { return labelSvg(m, await pictureFor(m)); }

  /** Render every label whose inputs changed. Returns how many were rendered. */
  async function render(rows, { log = () => {}, force = false } = {}) {
    if (!findChrome()) { log('labels: no chromium, skipping'); return 0; }
    const todo = [];
    for (const r of rows) {
      if (r.manifest.hidden) continue;
      const plate = await pictureFor(r.manifest);
      const key = keyFor(r.manifest, plate);
      if (!force && existsSync(join(dir, `${r.slug}.${key}.jpg`))) continue;
      todo.push({ m: r.manifest, plate, key });
    }
    if (!todo.length) return 0;
    let done = 0;
    await withChromium(async ({ page, wait }) => {
      for (const { m, plate, key } of todo) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          let tab;
          try {
            tab = await page();
            const [W, H] = WINDOWS[WINDOWS[m.shell] ? m.shell : 'hare'];
            const w = W * SCALE, h = H * SCALE;
            await tab.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
            const svgText = labelSvg(m, plate);
            const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#000}img{display:block;width:${w}px;height:${h}px}</style><img src="data:image/svg+xml;base64,${Buffer.from(svgText).toString('base64')}">`;
            await tab.send('Page.navigate', { url: 'data:text/html;base64,' + Buffer.from(html).toString('base64') });
            await wait(700);
            const shot = await tab.send('Page.captureScreenshot', { format: 'jpeg', quality: 84, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
            if (shot?.data) {
              for (const f of files(m.slug)) unlinkSync(join(dir, f));
              writeFileSync(join(dir, `${m.slug}.${key}.jpg`), Buffer.from(shot.data, 'base64'));
              done++;
            }
            break;
          } catch (e) { log(`labels: ${m.slug}: ${e.message}${attempt < 2 ? ', retrying' : ''}`); }
          finally { await tab?.close(); }
        }
      }
    }, { log });
    log(`labels: rendered ${done} of ${todo.length}`);
    return done;
  }

  return { get, svg, render, dir };
}
