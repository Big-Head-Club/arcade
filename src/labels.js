// A cartridge label for a game, in the grammar of the original Game Boy sticker: a silver
// ground; a grey rail down each side carrying the serial and the region, set vertically; a
// light strip across the top with the system wordmark; and under it the key art, edge to
// edge, with the title living inside the art the way a licensed label's logo does. Worn in:
// a tattered edge, scuffs, a few scratches, a faded corner. Every label is an SVG at the
// exact pixel size of its shell's photo window with the picture embedded, so it renders in an
// <img>. The wear is seeded by the slug, so a label is always the same label.
import { createHash } from 'node:crypto';

export const RENDERER = 'label-v4';   // bump to re-render every label

// The printed photo window of each shell, in the cut's own pixels (hundred-carts labels.json).
export const WINDOWS = {
  arch: [160, 208], crown: [155, 177], fish: [153, 198], galaxy: [178, 268], hare: [164, 175],
  lighthouse: [171, 208], moth: [164, 208], scarab: [133, 180], tower: [141, 178], whale: [146, 218],
};
export const SHELL_COLORS = {
  lighthouse: '#697372', hare: '#d0c1ad', crown: '#88150e', whale: '#074886', scarab: '#ca821b',
  arch: '#122d2d', galaxy: '#0e2526', moth: '#b0a4b6', tower: '#cb470d', fish: '#025761',
};

function rng(seed) {
  let a = parseInt(createHash('sha256').update(seed).digest('hex').slice(0, 8), 16) >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Up to two lines that fit a width at a size (rough metrics for a heavy condensed face). */
function fitTitle(name, boxW, maxSize, minSize = 8) {
  const words = name.toUpperCase().split(/\s+/).filter(Boolean);
  const widthOf = (s, size) => s.length * size * 0.56;
  for (let size = maxSize; size >= minSize; size -= 1) {
    if (widthOf(name, size) <= boxW) return { lines: [name.toUpperCase()], size };
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const w = Math.max(widthOf(a, size), widthOf(b, size));
      if (w <= boxW && (!best || w < best.w)) best = { lines: [a, b], size, w };
    }
    if (best) return best;
  }
  return { lines: [name.toUpperCase().slice(0, 16)], size: minSize };
}

/**
 * @param g       { slug, name, shell, started, variant }
 * @param picture { bytes, type, own }   the picture: the repo's own label art (own: true, title inside it) or the plate
 */
export function labelSvg(g, picture, opts = {}) {
  const shell = WINDOWS[g.shell] ? g.shell : 'hare';
  const [W, H] = WINDOWS[shell];
  const scale = opts.scale || 4;
  const w = W * scale, h = H * scale;
  const r = rng(g.slug + '|label');
  const accent = SHELL_COLORS[shell] || '#444';
  const ink = '#111';
  const silver = '#cfcfcb', silverHi = '#f2f2ee', silverLo = '#a9a9a4';
  const rail = '#8f8f8a', railText = '#1c1c1a';
  const dataUri = picture ? `data:${picture.type};base64,${picture.bytes.toString('base64')}` : '';
  const ownArt = !!(picture && picture.own);

  // geometry, in label pixels
  const radius = Math.round(w * 0.035);
  const railW = Math.round(w * 0.075);
  const stripH = Math.round(h * 0.085);
  const gap = Math.round(w * 0.012);
  const artX = railW + gap, artW = w - 2 * railW - 2 * gap;
  const artY = stripH + gap, artH = h - stripH - gap * 2;
  const serial = `BHC-${createHash('sha1').update(g.slug).digest('hex').slice(0, 3).toUpperCase()}-USA`;
  const region = g.started ? g.started.slice(0, 4) : '2026';

  // the wordmark: a small red pill, then the system name heavy and italic, like the one it quotes
  const pillH = Math.round(stripH * 0.52), pillW = Math.round(pillH * 3.1), pillX = artX + Math.round(w * 0.02), pillY = Math.round((stripH - pillH) / 2);
  const markSize = Math.round(stripH * 0.66);

  // the title, only when the picture is a plate (own art carries its own logo)
  const t = ownArt ? null : fitTitle(g.name, artW - gap * 4, Math.round(artW * 0.14), 9);
  const lineH = t ? t.size * 1.02 : 0;
  const titleBlockH = t ? lineH * t.lines.length + gap * 3 : 0;

  // wear, seeded
  const scratches = Array.from({ length: 2 + Math.floor(r() * 4) }, () => {
    const x1 = r() * w, y1 = r() * h, len = w * (0.15 + r() * 0.35), ang = r() * Math.PI;
    return `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${(x1 + Math.cos(ang) * len).toFixed(0)}" y2="${(y1 + Math.sin(ang) * len).toFixed(0)}" stroke="#fff" stroke-opacity="${(0.15 + r() * 0.25).toFixed(2)}" stroke-width="${(0.6 + r() * 1.2).toFixed(1)}"/>`;
  }).join('');
  const nicks = Array.from({ length: 2 + Math.floor(r() * 3) }, () => {
    const onLeft = r() < 0.5, onTop = r() < 0.5;
    const cx = onLeft ? r() * railW * 0.6 : w - r() * railW * 0.6, cy = onTop ? r() * h * 0.25 : h - r() * h * 0.25;
    return `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${(3 + r() * 8).toFixed(0)}" ry="${(2 + r() * 5).toFixed(0)}" fill="${silverHi}" fill-opacity="${(0.6 + r() * 0.4).toFixed(2)}"/>`;
  }).join('');
  const cornerX = r() < 0.5 ? 0 : w, cornerY = r() < 0.5 ? 0 : h;
  const sheenAngle = 20 + Math.floor(r() * 30);
  const rough = (0.7 + r() * 1.0).toFixed(2);
  const seeds = [1, 2, 3, 4].map(() => Math.floor(r() * 999));

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${w} ${h}">
<defs>
  <linearGradient id="foil" gradientTransform="rotate(${sheenAngle})"><stop offset="0" stop-color="${silverLo}"/><stop offset="0.35" stop-color="${silverHi}"/><stop offset="0.55" stop-color="${silver}"/><stop offset="1" stop-color="${silverLo}"/></linearGradient>
  <linearGradient id="strip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f7f3"/><stop offset="1" stop-color="#dcdcd7"/></linearGradient>
  <linearGradient id="titleShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.78"/></linearGradient>
  <filter id="grain" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="${seeds[0]}"/><feColorMatrix type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.1  0 0 0 0 0.1  0 0 0 0.12 0"/></filter>
  <filter id="scuff" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.03 0.05" numOctaves="3" seed="${seeds[1]}"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 0.97  0 0 0 0.9 -0.58"/></filter>
  <filter id="tatter" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="${seeds[2]}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${(w * 0.011 * rough).toFixed(1)}" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="worn" x="0" y="0" width="1" height="1"><feColorMatrix type="saturate" values="0.88"/><feComponentTransfer><feFuncR type="linear" slope="0.97" intercept="0.015"/><feFuncG type="linear" slope="0.96" intercept="0.015"/><feFuncB type="linear" slope="0.92" intercept="0.01"/></feComponentTransfer></filter>
  <filter id="halftone" x="0" y="0" width="1" height="1"><feTurbulence type="turbulence" baseFrequency="1.1" numOctaves="1" seed="${seeds[3]}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.07 0"/></filter>
  <radialGradient id="corner" cx="${cornerX}" cy="${cornerY}" r="${Math.round(w * 0.5)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${silverHi}" stop-opacity="0.8"/><stop offset="0.4" stop-color="${silverHi}" stop-opacity="0.3"/><stop offset="1" stop-color="${silverHi}" stop-opacity="0"/></radialGradient>
  <mask id="edge"><rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" fill="#fff" filter="url(#tatter)"/></mask>
  <clipPath id="art"><rect x="${artX}" y="${artY}" width="${artW}" height="${artH}"/></clipPath>
</defs>
<g mask="url(#edge)" filter="url(#worn)">
  <rect width="${w}" height="${h}" fill="url(#foil)"/>
  <rect width="${w}" height="${h}" filter="url(#grain)"/>
  <rect x="0" y="0" width="${railW}" height="${h}" fill="${rail}"/>
  <rect x="${w - railW}" y="0" width="${railW}" height="${h}" fill="${rail}"/>
  <text transform="translate(${Math.round(railW * 0.68)} ${Math.round(h * 0.5)}) rotate(-90)" text-anchor="middle" font-family="'Liberation Sans','Helvetica Neue',Arial,sans-serif" font-weight="700" font-size="${Math.round(railW * 0.5)}" fill="${railText}" letter-spacing="${(railW * 0.04).toFixed(1)}">${serial}</text>
  <text transform="translate(${Math.round(w - railW * 0.32)} ${Math.round(h * 0.5)}) rotate(90)" text-anchor="middle" font-family="'Liberation Sans','Helvetica Neue',Arial,sans-serif" font-weight="700" font-size="${Math.round(railW * 0.5)}" fill="${railText}" letter-spacing="${(railW * 0.04).toFixed(1)}">100 DAYS · ${region}</text>
  <rect x="${artX}" y="0" width="${artW}" height="${stripH}" fill="url(#strip)"/>
  <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${Math.round(pillH / 2)}" fill="none" stroke="#c8102e" stroke-width="${Math.max(1.5, pillH * 0.09).toFixed(1)}"/>
  <text x="${pillX + pillW / 2}" y="${pillY + pillH * 0.72}" text-anchor="middle" font-family="'Liberation Sans','Helvetica Neue',Arial,sans-serif" font-weight="700" font-size="${Math.round(pillH * 0.52)}" fill="#c8102e" letter-spacing="${(pillH * 0.02).toFixed(1)}">BIG HEAD</text>
  <text x="${pillX + pillW + Math.round(w * 0.018)}" y="${Math.round(stripH * 0.74)}" font-family="'Arial Black','Liberation Sans','Helvetica Neue',Arial,sans-serif" font-weight="900" font-style="italic" font-size="${markSize}" fill="${ink}" letter-spacing="${(markSize * 0.01).toFixed(1)}">CLUB</text>
  <text x="${artX + artW - Math.round(w * 0.02)}" y="${Math.round(stripH * 0.72)}" text-anchor="end" font-family="'Liberation Sans','Helvetica Neue',Arial,sans-serif" font-weight="700" font-size="${Math.round(stripH * 0.28)}" fill="${ink}" fill-opacity="0.7">TM</text>
  <rect x="${artX}" y="${artY}" width="${artW}" height="${artH}" fill="#101010"/>
  ${dataUri ? `<image xlink:href="${dataUri}" x="${artX}" y="${artY}" width="${artW}" height="${artH}" preserveAspectRatio="xMidYMid slice" clip-path="url(#art)"/>` : ''}
  ${t ? `<rect x="${artX}" y="${artY + artH - titleBlockH - gap * 2}" width="${artW}" height="${titleBlockH + gap * 2}" fill="url(#titleShade)" clip-path="url(#art)"/>${t.lines.map((line, i) => `<text x="${artX + artW / 2}" y="${(artY + artH - gap * 2.2 - lineH * (t.lines.length - 1 - i)).toFixed(0)}" text-anchor="middle" font-family="Impact,'Liberation Sans Narrow','Arial Narrow','Arial Black',Helvetica,sans-serif" font-weight="900" font-size="${t.size}" fill="#fff" stroke="#000" stroke-width="${(t.size * 0.06).toFixed(1)}" paint-order="stroke" letter-spacing="${(t.size * 0.02).toFixed(1)}">${esc(line)}</text>`).join('')}` : ''}
  <rect x="${artX}" y="${artY}" width="${artW}" height="${artH}" filter="url(#halftone)" clip-path="url(#art)"/>
  <rect x="${artX}" y="${artY}" width="${artW}" height="${artH}" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="${Math.max(1.5, w * 0.004).toFixed(1)}"/>
  ${g.variant ? `<text x="${artX + artW - gap}" y="${artY + Math.round(artW * 0.06)}" text-anchor="end" font-family="'Liberation Sans','Helvetica Neue',Arial,sans-serif" font-weight="700" font-size="${Math.round(artW * 0.045)}" fill="#fff" fill-opacity="0.85" stroke="#000" stroke-opacity="0.5" stroke-width="1.5" paint-order="stroke">${esc(g.variant.toUpperCase())}</text>` : ''}
  <rect width="${w}" height="${h}" filter="url(#scuff)" opacity="0.45"/>
  <rect width="${w}" height="${h}" fill="url(#corner)"/>
  ${scratches}
  ${nicks}
</g>
</svg>`;
}
