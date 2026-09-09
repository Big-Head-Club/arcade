// One headless Chromium, driven over the DevTools protocol on Node's own WebSocket. Both the
// plate shoot and the label render use it. Every job gets a fresh page target, so a game that
// crashes its renderer takes only its own shot down. A fresh profile every run: a stale lock
// from an earlier run makes a new Chromium hand off to a browser that no longer exists.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function findChrome() {
  return process.env.CHROME_PATH || ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => existsSync(p)) || null;
}

/** Run fn({ page }) where page() opens a new tab and returns { send, close }. */
export async function withChromium(fn, { chrome = findChrome(), port = 9333, log = () => {} } = {}) {
  if (!chrome) throw new Error('no chromium');
  const profile = mkdtempSync(join(tmpdir(), 'chromium-'));
  const proc = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-zygote', '--no-first-run', '--hide-scrollbars', '--mute-audio', '--disable-extensions', '--disable-background-networking', `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, '--window-size=840,630', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = ''; proc.stderr.on('data', (d) => { stderr += d; });
  let ws;
  try {
    let version = null;
    const t0 = Date.now();
    for (let i = 0; i < 120 && !version; i++) {
      await wait(500);
      try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch {}
    }
    if (!version) throw new Error('chromium never opened its debug port in 60s: ' + stderr.replace(/.*dbus.*\n/g, '').slice(-300));
    log(`chromium up in ${Date.now() - t0}ms`);
    ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0; const pending = new Map();
    ws.onmessage = (ev) => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } };
    const raw = (method, params = {}, sessionId) => new Promise((res, rej) => {
      const n = ++id; pending.set(n, (msg) => (msg.error ? rej(new Error(msg.error.message)) : res(msg.result)));
      ws.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }));
      setTimeout(() => { if (pending.has(n)) { pending.delete(n); rej(new Error(`${method} timed out`)); } }, 30_000);
    });
    async function page() {
      const { targetId } = await raw('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await raw('Target.attachToTarget', { targetId, flatten: true });
      const send = (method, params) => raw(method, params, sessionId);
      await send('Network.enable');
      await send('Network.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (compatible; bhc-arcade bot)' });   // never counted as a play
      return { send, close: () => raw('Target.closeTarget', { targetId }).catch(() => {}) };
    }
    return await fn({ page, wait });
  } finally {
    try { ws?.close(); } catch {}
    proc.kill();
    await wait(1000);
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}
