// A plate is the picture on the cartridge label. Three sources, in order:
// the file the manifest names in the repo; a screenshot we shot ourselves;
// a generated placeholder with the game's name on the shell's colour.
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

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
    // 1. the repo's own plate, refreshed daily
    if (m.plate && m.repo && gh) {
      const c = cached(m.slug);
      if (c && c.age < 86_400_000 && !c.path.endsWith('.shot.jpg')) return { bytes: readFileSync(c.path), type: c.type };
      try {
        const f = await gh.fileOf(m.repo, m.plate);
        if (f) {
          const ext = Object.entries(TYPES).find(([, t]) => t === f.type.split(';')[0])?.[0] || '.png';
          writeFileSync(cachePath(m.slug, ext), f.bytes);
          return { bytes: f.bytes, type: TYPES[ext] };
        }
      } catch {}
    }
    // 2. a screenshot we took
    const shot = join(dir, `${m.slug}.shot.jpg`);
    if (existsSync(shot)) return { bytes: readFileSync(shot), type: 'image/jpeg' };
    const c = cached(m.slug);
    if (c) return { bytes: readFileSync(c.path), type: c.type };
    // 3. placeholder
    return { bytes: Buffer.from(placeholder(m)), type: 'image/svg+xml' };
  }

  function placeholder(m) {
    const bg = SHELL_COLORS[m.shell] || '#444';
    const name = String(m.name).replace(/[<&>]/g, '');
    const size = name.length > 14 ? 54 : 72;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="630" viewBox="0 0 840 630"><rect width="840" height="630" fill="${bg}"/><text x="420" y="330" fill="#fff" font-family="ui-monospace,Menlo,monospace" font-size="${size}" font-weight="700" text-anchor="middle" letter-spacing="4">${name}</text><text x="420" y="400" fill="#fff" fill-opacity=".6" font-family="ui-monospace,Menlo,monospace" font-size="22" text-anchor="middle">${m.variant ? m.variant.replace(/[<&>]/g, '') : 'BIG HEAD CLUB'}</text></svg>`;
  }

  /** Screenshot every live game that has no plate of its own. Needs Chromium. */
  async function shoot(rows, { chrome = process.env.CHROME_PATH || findChrome(), log = () => {} } = {}) {
    if (!chrome) { log('plates: no chromium, skipping'); return 0; }
    const todo = rows.filter((r) => r.status === 'live' && !r.manifest.plate && !r.manifest.hidden);
    if (!todo.length) return 0;
    const port = 9333;
    const proc = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--mute-audio', `--remote-debugging-port=${port}`, '--window-size=840,630', 'about:blank'], { stdio: 'ignore' });
    let done = 0;
    try {
      await wait(1500);
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = targets.find((t) => t.type === 'page');
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
      let id = 0; const pending = new Map();
      ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } };
      const send = (method, params = {}) => new Promise((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
      await send('Emulation.setDeviceMetricsOverride', { width: 840, height: 630, deviceScaleFactor: 1, mobile: false });
      for (const r of todo) {
        try {
          await send('Page.navigate', { url: r.manifest.url });
          await wait(5000);
          const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
          if (shot.result?.data) { writeFileSync(join(dir, `${r.slug}.shot.jpg`), Buffer.from(shot.result.data, 'base64')); done++; }
        } catch (e) { log(`plates: ${r.slug}: ${e.message}`); }
      }
      ws.close();
    } finally { proc.kill(); }
    return done;
  }

  return { get, shoot, dir };
}

function findChrome() {
  return ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => existsSync(p)) || null;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
