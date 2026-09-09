// A cartridge label for a game, in the grammar of the original Game Boy sticker: a silver
// ground; a grey rail down each side carrying the serial and the region, set vertically; a
// light strip across the top with the system wordmark; and under it the key art, edge to
// edge, with the title living inside the art the way a licensed label's logo does. Worn in:
// a tattered edge, scuffs, a few scratches, a faded corner. Every label is an SVG at the
// exact pixel size of its shell's photo window with the picture embedded, so it renders in an
// <img>. The wear is seeded by the slug, so a label is always the same label.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Display faces for the logo (OFL, vendored in fonts/). `em` is width per character, rough, for fitting.
const FONT_DIR = new URL('../fonts/', import.meta.url);
const FONTS = { Anton: { file: 'Anton-Regular.ttf', em: 0.5, condensed: true }, Bangers: { file: 'Bangers-Regular.ttf', em: 0.58 }, TitanOne: { file: 'TitanOne-Regular.ttf', em: 0.78 }, Bungee: { file: 'Bungee-Regular.ttf', em: 0.92 } };
const FONT_DATA = {};
try { for (const [name, f] of Object.entries(FONTS)) FONT_DATA[name] = readFileSync(new URL(f.file, FONT_DIR)).toString('base64'); } catch {}

export const RENDERER = 'label-v7';   // bump to re-render every label

// The sticker on each shell, measured by hand on the cut (x0, y0, x1, y1 in the cut's own
// pixels; cut sizes from hundred-carts art/cut). The label is drawn at the sticker's size and
// the rack prints it there, so it covers the stock sticker edge to edge.
export const CUTS = { arch: [262, 400], crown: [281, 400], fish: [265, 400], galaxy: [258, 400], hare: [249, 400], lighthouse: [257, 400], moth: [269, 400], scarab: [248, 400], tower: [261, 400], whale: [254, 400] };
export const STICKERS = { arch: [40, 62, 193, 261], crown: [85, 46, 238, 218], fish: [52, 69, 208, 248], galaxy: [42, 46, 219, 312], hare: [42, 43, 206, 218], lighthouse: [44, 46, 215, 254], moth: [45, 48, 216, 260], scarab: [56, 48, 196, 227], tower: [76, 40, 217, 218], whale: [57, 53, 215, 245] };
export const WINDOWS = Object.fromEntries(Object.entries(STICKERS).map(([k, [x0, y0, x1, y1]]) => [k, [x1 - x0, y1 - y0]]));
/** The sticker as fractions of the cut, for anything that draws a shell and prints the label on it. */
export function shellBoxes() {
  return Object.fromEntries(Object.entries(STICKERS).map(([k, [x0, y0, x1, y1]]) => { const [W, H] = CUTS[k]; return [k, { cut: CUTS[k], sticker: STICKERS[k], box: [+(x0 / W * 100).toFixed(2), +(y0 / H * 100).toFixed(2), +((x1 - x0) / W * 100).toFixed(2), +((y1 - y0) / H * 100).toFixed(2)] }]; }));
}
// Each shell's plastic colour (hundred-carts art/cut/shell.json), for the poster ink and the block.
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
function fitTitle(name, boxW, maxSize, em = 0.56, minSize = 8, maxSize2 = maxSize) {
  const words = name.toUpperCase().split(/\s+/).filter(Boolean);
  const widthOf = (s, size) => s.length * size * em;
  for (let size = maxSize; size >= minSize; size -= 1) {
    if (widthOf(name, size) <= boxW) return { lines: [name.toUpperCase()], size };
    if (size > maxSize2) continue;   // two lines only at a size two lines can afford
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
export function labelSvg(g, plate, opts = {}) {
  const shell = WINDOWS[g.shell] ? g.shell : 'hare';
  const [W, H] = WINDOWS[shell];
  const scale = opts.scale || 4;
  const w = W * scale, h = H * scale;
  const r = rng(g.slug + '|label');
  const dataUri = plate ? `data:${plate.type};base64,${plate.bytes.toString('base64')}` : '';
  const ownArt = !!(plate && plate.own);
  const ink = '#111';
  const frameColor = '#ece9e2';
  const designer = (g.designers && g.designers[0]) ? String(g.designers[0]).toUpperCase() : 'BIG HEAD';
  // a screenshot printed as a poster: dark ink to the shell's colour, brightened so it reads at label size
  const hex = (SHELL_COLORS[shell] || '#888').slice(1);
  const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lum = 0.3 * rgb[0] + 0.59 * rgb[1] + 0.11 * rgb[2];
  const lift = lum < 0.35 ? 0.35 / Math.max(lum, 0.05) : 1;
  const inkTone = rgb.map((c) => Math.min(1, c * lift));
  // each output channel = grey * (1 - tone) + grey * tone... simpler: out = dark + grey * (bright - dark)
  const tone = inkTone.map((c) => `${(0.06).toFixed(2)} ${(c - 0.06).toFixed(3)}`);   // [offset, slope] per channel

  // The real thing: art wall to wall inside a thin frame. Everything else is small.
  const frame = Math.round(w * 0.055);                 // the white border, wordmark and serial live in it
  const ax = frame, ay = frame, aw = w - frame * 2, ah = h - frame * 2;
  const seal = Math.round(w * 0.11);                   // the round seal, top right
  const pub = { w: Math.round(w * 0.3), h: Math.round(h * 0.055) };   // the publisher box, bottom left

  // the logo gets its own block at the foot, so the picture above it stays clear. Long names
  // take a condensed face; short ones draw from the chunkier ones, seeded.
  const blockH = Math.round(ah * 0.3);
  const artH = ah - blockH;
  const fontName = g.name.replace(/\s+/g, '').length > 11 ? 'Anton' : ['Bangers', 'TitanOne', 'Bungee', 'Anton'][Math.floor(r() * 4)];
  const font = FONTS[fontName];
  const t = fitTitle(g.name, aw * 0.9, Math.round(blockH * 0.7), font.em, 8, Math.round(blockH * 0.4));
  const lineH = t.size * 0.95;
  const logoTop = ay + artH + (blockH - lineH * t.lines.length) / 2;
  const logoFill = ['#ffd94a', '#ff8a3d', '#7fe3ff', '#ff6b9d', '#c8ff5a', '#ffffff'][Math.floor(r() * 6)];
  const tilt = ((r() - 0.5) * 3).toFixed(1);

  // wear, seeded: scuffs on the frame, a scratch or two across the art, a rubbed corner
  const scratches = Array.from({ length: 2 + Math.floor(r() * 3) }, () => {
    const x1 = r() * w, y1 = r() * h, len = w * (0.12 + r() * 0.3), ang = r() * Math.PI;
    return `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${(x1 + Math.cos(ang) * len).toFixed(0)}" y2="${(y1 + Math.sin(ang) * len).toFixed(0)}" stroke="#fff" stroke-opacity="${(0.15 + r() * 0.2).toFixed(2)}" stroke-width="${(0.6 + r() * 1).toFixed(1)}"/>`;
  }).join('');
  const blockFill = `rgb(${inkTone.map((c) => Math.round(c * 255 * 0.55)).join(',')})`;
  const cornerX = r() < 0.5 ? 0 : w, cornerY = r() < 0.5 ? 0 : h;
  const rough = (0.7 + r() * 0.9).toFixed(2);
  const serial = `BHC-${createHash('sha1').update(g.slug).digest('hex').slice(0, 3).toUpperCase()}-USA`;
  const seeds = [0, 0, 0, 0].map(() => Math.floor(r() * 999));

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${w} ${h}">
<defs>
  ${FONT_DATA[fontName] ? `<style>@font-face{font-family:'${fontName}';src:url(data:font/ttf;base64,${FONT_DATA[fontName]}) format('truetype')}</style>` : ''}
  <filter id="grain" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="${seeds[0]}"/><feColorMatrix type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.09  0 0 0 0 0.07  0 0 0 0.09 0"/></filter>
  <filter id="scuff" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.03 0.05" numOctaves="3" seed="${seeds[1]}"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.98  0 0 0 0 0.94  0 0 0 0.9 -0.6"/></filter>
  <filter id="tatter" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="${seeds[2]}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${(w * 0.009 * rough).toFixed(1)}" xChannelSelector="R" yChannelSelector="G"/></filter>
  ${ownArt
    ? `<filter id="print" x="0" y="0" width="1" height="1"><feColorMatrix type="saturate" values="1.05"/></filter>`
    : `<filter id="print" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncR type="discrete" tableValues="0 0.35 0.7 1"/><feFuncG type="discrete" tableValues="0 0.35 0.7 1"/><feFuncB type="discrete" tableValues="0 0.35 0.7 1"/></feComponentTransfer>
    <feColorMatrix type="matrix" values="${tone[0].split(' ')[1]} 0 0 0 ${tone[0].split(' ')[0]}  0 ${tone[1].split(' ')[1]} 0 0 ${tone[1].split(' ')[0]}  0 0 ${tone[2].split(' ')[1]} 0 ${tone[2].split(' ')[0]}  0 0 0 1 0"/>
  </filter>`}
  <filter id="worn" x="0" y="0" width="1" height="1"><feColorMatrix type="saturate" values="0.9"/><feComponentTransfer><feFuncR type="linear" slope="0.97" intercept="0.02"/><feFuncG type="linear" slope="0.96" intercept="0.02"/><feFuncB type="linear" slope="0.92" intercept="0.01"/></feComponentTransfer></filter>
  <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feGaussianBlur stdDeviation="${(t.size * 0.05).toFixed(1)}"/></filter>
  <linearGradient id="logo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="0.45" stop-color="${logoFill}"/><stop offset="1" stop-color="${logoFill}"/></linearGradient>
  <linearGradient id="sheen" gradientTransform="rotate(${Math.floor(r() * 360)})"><stop offset="0" stop-color="#fff" stop-opacity="0.18"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.08"/></linearGradient>
  <radialGradient id="corner" cx="${cornerX}" cy="${cornerY}" r="${Math.round(w * 0.45)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${frameColor}" stop-opacity="0.75"/><stop offset="0.4" stop-color="${frameColor}" stop-opacity="0.25"/><stop offset="1" stop-color="${frameColor}" stop-opacity="0"/></radialGradient>
  <pattern id="stripes" width="${Math.round(w * 0.06)}" height="${Math.round(w * 0.06)}" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><rect width="${Math.round(w * 0.012)}" height="${Math.round(w * 0.06)}" fill="#fff" fill-opacity="0.07"/></pattern>
  <mask id="edge"><rect x="0" y="0" width="${w}" height="${h}" rx="${Math.round(w * 0.035)}" fill="#fff" filter="url(#tatter)"/></mask>
  <clipPath id="art"><rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" rx="${Math.round(w * 0.012)}"/></clipPath>
</defs>
<g mask="url(#edge)" filter="url(#worn)">
  <rect width="${w}" height="${h}" fill="${frameColor}"/>
  <rect width="${w}" height="${h}" filter="url(#grain)"/>
  <rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" fill="#1a1612"/>
  ${dataUri ? `<image xlink:href="${dataUri}" x="${ax}" y="${ay}" width="${aw}" height="${ownArt ? ah : artH}" preserveAspectRatio="${ownArt ? 'xMidYMid' : 'xMidYMin'} slice" clip-path="url(#art)" filter="url(#print)"/>` : ''}
  ${ownArt ? '' : `<rect x="${ax}" y="${ay + artH}" width="${aw}" height="${blockH}" fill="${blockFill}"/>
  <rect x="${ax}" y="${ay + artH}" width="${aw}" height="${blockH}" fill="url(#stripes)"/>
  <rect x="${ax}" y="${ay + artH - Math.round(h * 0.004)}" width="${aw}" height="${Math.round(h * 0.008)}" fill="${ink}" fill-opacity="0.6"/>`}
  ${ownArt ? '' : `
  <g transform="translate(${w / 2} ${logoTop}) rotate(${tilt})" text-anchor="middle" font-family="'${fontName}',Impact,'Arial Black',sans-serif" font-size="${t.size}" letter-spacing="${(t.size * (font.condensed ? 0.03 : 0.01)).toFixed(1)}">
    ${t.lines.map((line, i) => `<text x="${(t.size * 0.06).toFixed(0)}" y="${(lineH * i + t.size * 0.84 + t.size * 0.06).toFixed(0)}" fill="#000" fill-opacity="0.55" filter="url(#shadow)">${esc(line)}</text>`).join('')}
    ${t.lines.map((line, i) => `<text x="0" y="${(lineH * i + t.size * 0.84).toFixed(0)}" fill="url(#logo)" stroke="${ink}" stroke-width="${(t.size * (font.condensed ? 0.07 : 0.09)).toFixed(1)}" stroke-linejoin="round" paint-order="stroke fill">${esc(line)}</text>`).join('')}
  </g>`}
  <rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" rx="${Math.round(w * 0.012)}" fill="none" stroke="${ink}" stroke-opacity="0.35" stroke-width="${Math.max(1.5, w * 0.004).toFixed(1)}"/>
  <text transform="translate(${(frame * 0.68).toFixed(0)} ${(h - frame * 1.2).toFixed(0)}) rotate(-90)" font-family="'Arial Black','Liberation Sans',Arial,sans-serif" font-weight="900" font-size="${Math.round(frame * 0.62)}" fill="${ink}" letter-spacing="${(frame * 0.03).toFixed(1)}">Big Head <tspan font-style="italic">CLUB</tspan><tspan font-size="${Math.round(frame * 0.32)}" dy="-${Math.round(frame * 0.25)}">™</tspan></text>
  <text transform="translate(${(w - frame * 0.28).toFixed(0)} ${(frame * 1.2).toFixed(0)}) rotate(90)" font-family="'Liberation Sans',Arial,sans-serif" font-weight="700" font-size="${Math.round(frame * 0.42)}" fill="${ink}" fill-opacity="0.8" letter-spacing="${(frame * 0.05).toFixed(1)}">${serial} · THIS SIDE OUT</text>
  <g transform="translate(${(w - frame - seal * 0.62).toFixed(0)} ${(ay + seal * 0.62).toFixed(0)})">
    <circle r="${(seal * 0.5).toFixed(0)}" fill="#f6e7a6" stroke="#8a6d1f" stroke-width="${(seal * 0.05).toFixed(1)}"/>
    <circle r="${(seal * 0.36).toFixed(0)}" fill="none" stroke="#8a6d1f" stroke-width="${(seal * 0.03).toFixed(1)}"/>
    <text y="${(seal * 0.06).toFixed(0)}" text-anchor="middle" font-family="'Arial Black','Liberation Sans',Arial,sans-serif" font-weight="900" font-size="${Math.round(seal * 0.17)}" fill="#5a4612">100</text>
    <text y="${(seal * 0.22).toFixed(0)}" text-anchor="middle" font-family="'Liberation Sans',Arial,sans-serif" font-weight="700" font-size="${Math.round(seal * 0.09)}" fill="#5a4612">DAYS</text>
  </g>
  <g transform="translate(${(ax + frame * 0.5).toFixed(0)} ${(ay + frame * 0.5).toFixed(0)})">
    <rect width="${pub.w}" height="${pub.h}" fill="#fff" stroke="${ink}" stroke-width="${Math.max(1.5, w * 0.004).toFixed(1)}"/>
    <text x="${(pub.w / 2).toFixed(0)}" y="${(pub.h * 0.72).toFixed(0)}" text-anchor="middle" font-family="'Arial Black','Liberation Sans',Arial,sans-serif" font-weight="900" font-size="${Math.round(pub.h * 0.62)}" fill="${ink}" letter-spacing="${(pub.h * 0.06).toFixed(1)}">${esc(designer)}</text>
  </g>
  <rect width="${w}" height="${h}" fill="url(#sheen)"/>
  <rect width="${w}" height="${h}" filter="url(#scuff)" opacity="0.45"/>
  <rect width="${w}" height="${h}" fill="url(#corner)"/>
  ${scratches}
</g>
</svg>`;
}
