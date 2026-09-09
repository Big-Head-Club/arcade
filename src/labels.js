// A cartridge label for a game: the sticker printed in the shell's photo window. Game Boy
// grammar, worn in: a dark band with the house name, the game's plate as the picture, the
// title on a colour block, a serial at the foot. Every label is an SVG at the exact pixel
// size of its shell's window, with the plate embedded so it renders inside an <img>. The
// wear is seeded by the slug, so a label is always the same label.
import { createHash } from 'node:crypto';

export const RENDERER = 'label-v2';   // bump to re-render every label

// The printed photo window of each shell, in the cut's own pixels (from hundred-carts
// art/cut/labels.json). The label is drawn at this size and fits the window exactly.
export const WINDOWS = {
  arch: [160, 208], crown: [155, 177], fish: [153, 198], galaxy: [178, 268], hare: [164, 175],
  lighthouse: [171, 208], moth: [164, 208], scarab: [133, 180], tower: [141, 178], whale: [146, 218],
};
// Each shell's plastic colour (hundred-carts art/cut/shell.json), for the band stripes and block.
export const SHELL_COLORS = {
  lighthouse: '#697372', hare: '#d0c1ad', crown: '#88150e', whale: '#074886', scarab: '#ca821b',
  arch: '#122d2d', galaxy: '#0e2526', moth: '#b0a4b6', tower: '#cb470d', fish: '#025761',
};

function rng(seed) {
  let a = parseInt(createHash('sha256').update(seed).digest('hex').slice(0, 8), 16) >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Split a title into at most two lines that fit a width at a given size (rough metrics). */
function fitTitle(name, boxW, maxSize) {
  const words = name.toUpperCase().split(/\s+/).filter(Boolean);
  const widthOf = (s, size) => s.length * size * 0.62;
  for (let size = maxSize; size >= 7; size -= 1) {
    if (widthOf(name, size) <= boxW) return { lines: [name.toUpperCase()], size };
    // two lines: best split point
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const w = Math.max(widthOf(a, size), widthOf(b, size));
      if (w <= boxW && (!best || w < best.w)) best = { lines: [a, b], size, w };
    }
    if (best) return best;
  }
  return { lines: [name.toUpperCase().slice(0, 14)], size: 7 };
}

/**
 * @param g   { slug, name, shell, started, variant }
 * @param plate { bytes, type }   the game's plate image
 */
export function labelSvg(g, plate, opts = {}) {
  const shell = WINDOWS[g.shell] ? g.shell : 'hare';
  const [W, H] = WINDOWS[shell];
  const scale = opts.scale || 4;                 // render crisp: 4x the window's pixels
  const w = W * scale, h = H * scale;
  const r = rng(g.slug + '|label');
  const shellColor = SHELL_COLORS[shell] || '#444';
  const light = ['hare', 'moth'].includes(shell);
  const band = light ? '#1d1a17' : '#151312';
  const ink = '#141210';
  const paper = '#ebe6d8';
  const accent = shellColor;
  const dataUri = plate ? `data:${plate.type};base64,${plate.bytes.toString('base64')}` : '';

  // layout, in label pixels
  const pad = Math.round(w * 0.045);
  const bandH = Math.round(h * 0.13);
  const titleH = Math.round(h * 0.2);
  const footH = Math.round(h * 0.06);
  const artY = bandH + pad, artH = h - bandH - titleH - footH - pad * 2;
  const artX = pad, artW = w - pad * 2;
  const titleY = artY + artH + Math.round(pad * 0.6);
  const markSize = Math.min(Math.round(bandH * 0.42), Math.round(w * 0.072));
  const t = fitTitle(g.name, artW - pad * 1.6, Math.round(titleH * 0.42));
  const lineH = t.size * 1.05;
  const titleTop = titleY + (titleH - lineH * t.lines.length) / 2;

  // wear, seeded
  const scratches = Array.from({ length: 3 + Math.floor(r() * 4) }, () => {
    const x1 = r() * w, y1 = r() * h, len = w * (0.15 + r() * 0.35), ang = r() * Math.PI;
    return `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${(x1 + Math.cos(ang) * len).toFixed(0)}" y2="${(y1 + Math.sin(ang) * len).toFixed(0)}" stroke="#fff" stroke-opacity="${(0.18 + r() * 0.25).toFixed(2)}" stroke-width="${(0.6 + r() * 1.2).toFixed(1)}"/>`;
  }).join('');
  const chips = Array.from({ length: 2 + Math.floor(r() * 3) }, () => {
    const onLeft = r() < 0.5, onTop = r() < 0.5;
    const cx = onLeft ? r() * pad : w - r() * pad, cy = onTop ? r() * h * 0.3 : h - r() * h * 0.3;
    return `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${(3 + r() * 9).toFixed(0)}" ry="${(2 + r() * 6).toFixed(0)}" fill="${paper}" fill-opacity="${(0.7 + r() * 0.3).toFixed(2)}"/>`;
  }).join('');
  const cornerX = r() < 0.5 ? 0 : w, cornerY = r() < 0.5 ? 0 : h;
  const fadeAngle = Math.floor(r() * 360);
  const rough = (0.8 + r() * 1.2).toFixed(2);
  const serial = `BHC-${createHash('sha1').update(g.slug).digest('hex').slice(0, 4).toUpperCase()}`;
  const mfg = g.started ? g.started.replace(/-/g, '.') : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${w} ${h}">
<defs>
  <filter id="paper" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${Math.floor(r() * 999)}"/><feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.17  0 0 0 0 0.12  0 0 0 0.10 0"/></filter>
  <filter id="scuff" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.035 0.06" numOctaves="3" seed="${Math.floor(r() * 999)}"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.98  0 0 0 0 0.93  0 0 0 0.9 -0.55"/></filter>
  <filter id="tatter" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="${Math.floor(r() * 999)}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${(w * 0.012 * rough).toFixed(1)}" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="worn" x="0" y="0" width="1" height="1"><feColorMatrix type="saturate" values="0.86"/><feComponentTransfer><feFuncR type="linear" slope="0.96" intercept="0.02"/><feFuncG type="linear" slope="0.95" intercept="0.02"/><feFuncB type="linear" slope="0.9" intercept="0.01"/></feComponentTransfer></filter>
  <pattern id="stripes" width="${Math.round(w * 0.045)}" height="${Math.round(w * 0.045)}" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)"><rect width="${Math.round(w * 0.045)}" height="${Math.round(w * 0.045)}" fill="${band}"/><rect width="${Math.round(w * 0.012)}" height="${Math.round(w * 0.045)}" fill="${accent}" fill-opacity="0.85"/></pattern>
  <linearGradient id="fade" gradientTransform="rotate(${fadeAngle})"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.16"/></linearGradient>
  <radialGradient id="corner" cx="${cornerX}" cy="${cornerY}" r="${Math.round(w * 0.55)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${paper}" stop-opacity="0.85"/><stop offset="0.35" stop-color="${paper}" stop-opacity="0.35"/><stop offset="1" stop-color="${paper}" stop-opacity="0"/></radialGradient>
  <mask id="edge"><rect x="0" y="0" width="${w}" height="${h}" rx="${Math.round(w * 0.03)}" fill="#fff" filter="url(#tatter)"/></mask>
  <clipPath id="art"><rect x="${artX}" y="${artY}" width="${artW}" height="${artH}" rx="${Math.round(w * 0.012)}"/></clipPath>
</defs>
<g mask="url(#edge)" filter="url(#worn)">
  <rect width="${w}" height="${h}" fill="${paper}"/>
  <rect width="${w}" height="${h}" filter="url(#paper)"/>
  <rect x="0" y="0" width="${w}" height="${bandH}" fill="url(#stripes)"/>
  <rect x="0" y="${bandH - Math.round(h * 0.006)}" width="${w}" height="${Math.round(h * 0.006)}" fill="${accent}"/>
  <text x="${pad}" y="${Math.round(bandH * 0.66)}" font-family="'Arial Black','Liberation Sans','Helvetica Neue',Arial,sans-serif" font-weight="900" font-size="${markSize}" fill="#f4efe4" letter-spacing="${(markSize * 0.04).toFixed(1)}">BIG HEAD CLUB</text>
  ${w - pad * 2 - markSize * 0.72 * 13 > markSize * 0.6 * 10 ? `<text x="${w - pad}" y="${Math.round(bandH * 0.66)}" text-anchor="end" font-family="'Liberation Sans','Helvetica Neue',Arial,sans-serif" font-weight="700" font-size="${Math.round(markSize * 0.7)}" fill="#f4efe4" fill-opacity="0.8">${esc(mfg)}</text>` : ''}
  <rect x="${artX}" y="${artY}" width="${artW}" height="${artH}" fill="#0f0e0c"/>
  ${dataUri ? `<image xlink:href="${dataUri}" x="${artX}" y="${artY}" width="${artW}" height="${artH}" preserveAspectRatio="xMidYMid slice" clip-path="url(#art)"/>` : ''}
  <rect x="${artX}" y="${artY}" width="${artW}" height="${artH}" rx="${Math.round(w * 0.012)}" fill="none" stroke="${ink}" stroke-opacity="0.55" stroke-width="${Math.max(2, w * 0.006).toFixed(1)}"/>
  <rect x="${pad}" y="${titleY}" width="${artW}" height="${titleH}" rx="${Math.round(w * 0.012)}" fill="${accent}"/>
  ${t.lines.map((line, i) => `<text x="${w / 2}" y="${(titleTop + lineH * (i + 0.82)).toFixed(0)}" text-anchor="middle" font-family="Impact,'Liberation Sans Narrow','Arial Narrow','Arial Black',Helvetica,sans-serif" font-weight="900" font-size="${t.size}" fill="${light ? ink : '#f6f1e6'}" letter-spacing="${(t.size * 0.03).toFixed(1)}">${esc(line)}</text>`).join('')}
  <text x="${pad}" y="${h - Math.round(footH * 0.35)}" font-family="'Liberation Sans','Helvetica Neue',Arial,sans-serif" font-size="${Math.round(footH * 0.6)}" fill="${ink}" fill-opacity="0.7" letter-spacing="1">${serial}${g.variant ? ' · ' + esc(g.variant.toUpperCase()) : ''}</text>
  <text x="${w - pad}" y="${h - Math.round(footH * 0.35)}" text-anchor="end" font-family="'Liberation Sans','Helvetica Neue',Arial,sans-serif" font-size="${Math.round(footH * 0.6)}" fill="${ink}" fill-opacity="0.7">100 DAYS™</text>
  <rect width="${w}" height="${h}" fill="url(#fade)"/>
  <rect width="${w}" height="${h}" filter="url(#scuff)" opacity="0.5"/>
  <rect width="${w}" height="${h}" fill="url(#corner)"/>
  ${scratches}
  ${chips}
</g>
</svg>`;
}
