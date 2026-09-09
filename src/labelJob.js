// Labels: rendered from the plate and the manifest, rasterised through Chromium so every
// viewer sees the same fonts, cached on the volume under a key of everything that went in.
// A new plate, a new name, or a new renderer re-renders the label; nothing else does.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { labelSvg, WINDOWS, RENDERER } from './labels.js';
import { withChromium, findChrome } from './chromium.js';

const SCALE = 4;   // label pixels per window pixel in the raster

export function labels({ dir, plates }) {
  mkdirSync(dir, { recursive: true });

  function keyFor(m, plate) {
    return createHash('sha1').update([RENDERER, m.slug, m.name, m.shell, m.started, m.variant, plate.type, plate.bytes.length].join('|')).update(plate.bytes).digest('hex').slice(0, 12);
  }
  function files(slug) { return readdirSync(dir).filter((f) => f.startsWith(slug + '.') && f.endsWith('.png')); }

  /** The rendered PNG if the cache holds a current one, else the live SVG. */
  async function get(m) {
    const plate = await plates.get(m);
    const key = keyFor(m, plate);
    const hit = join(dir, `${m.slug}.${key}.png`);
    if (existsSync(hit)) return { bytes: readFileSync(hit), type: 'image/png', rendered: true };
    const stale = files(m.slug)[0];
    if (stale) return { bytes: readFileSync(join(dir, stale)), type: 'image/png', rendered: true, stale: true };
    return { bytes: Buffer.from(labelSvg(m, plate)), type: 'image/svg+xml', rendered: false };
  }

  async function svg(m) { return labelSvg(m, await plates.get(m)); }

  /** Render every label whose inputs changed. Returns how many were rendered. */
  async function render(rows, { log = () => {}, force = false } = {}) {
    if (!findChrome()) { log('labels: no chromium, skipping'); return 0; }
    const todo = [];
    for (const r of rows) {
      if (r.manifest.hidden) continue;
      const plate = await plates.get(r.manifest);
      const key = keyFor(r.manifest, plate);
      if (!force && existsSync(join(dir, `${r.slug}.${key}.png`))) continue;
      todo.push({ m: r.manifest, plate, key });
    }
    if (!todo.length) return 0;
    let done = 0;
    await withChromium(async (send, { wait }) => {
      for (const { m, plate, key } of todo) {
        try {
          const [W, H] = WINDOWS[WINDOWS[m.shell] ? m.shell : 'hare'];
          const w = W * SCALE, h = H * SCALE;
          await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
          const svgText = labelSvg(m, plate);
          const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}img{display:block;width:${w}px;height:${h}px}</style><img src="data:image/svg+xml;base64,${Buffer.from(svgText).toString('base64')}">`;
          await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
          await send('Page.navigate', { url: 'data:text/html;base64,' + Buffer.from(html).toString('base64') });
          await wait(400);
          const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
          if (shot?.data) {
            for (const f of files(m.slug)) unlinkSync(join(dir, f));
            writeFileSync(join(dir, `${m.slug}.${key}.png`), Buffer.from(shot.data, 'base64'));
            done++;
          }
        } catch (e) { log(`labels: ${m.slug}: ${e.message}`); }
      }
    }, { log });
    log(`labels: rendered ${done} of ${todo.length}`);
    return done;
  }

  return { get, svg, render, dir };
}
