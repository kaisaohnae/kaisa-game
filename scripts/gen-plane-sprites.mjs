/**
 * Generate top-down plane PNGs facing 12 o'clock (nose UP).
 * Enemies are rotated 180° in-game to face 6 o'clock.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'plane-shoot', 'planes');
const FX = path.join(__dirname, '..', 'public', 'plane-shoot', 'fx');

fs.mkdirSync(OUT, {recursive: true});
fs.mkdirSync(FX, {recursive: true});

/** @type {{id: string, body: string, wing: string, accent: string, cockpit: string, kind: 'player'|'enemy', wide?: boolean}[]} */
const PLANES = [
  // Player (3)
  {id: 'jet-blue', kind: 'player', body: '#1565c0', wing: '#42a5f5', accent: '#ffeb3b', cockpit: '#b3e5fc'},
  {id: 'jet-red', kind: 'player', body: '#c62828', wing: '#ef5350', accent: '#fff176', cockpit: '#ffcdd2'},
  {id: 'jet-green', kind: 'player', body: '#2e7d32', wing: '#66bb6a', accent: '#ffcc80', cockpit: '#c8e6c9'},
  // Enemy (10)
  {id: 'scout', kind: 'enemy', body: '#546e7a', wing: '#90a4ae', accent: '#ff7043', cockpit: '#cfd8dc'},
  {id: 'drone', kind: 'enemy', body: '#455a64', wing: '#78909c', accent: '#00e676', cockpit: '#a5d6a7', wide: true},
  {id: 'raider', kind: 'enemy', body: '#6a1b9a', wing: '#ab47bc', accent: '#ea80fc', cockpit: '#e1bee7'},
  {id: 'bomber', kind: 'enemy', body: '#5d4037', wing: '#8d6e63', accent: '#ffab40', cockpit: '#d7ccc8', wide: true},
  {id: 'stealth', kind: 'enemy', body: '#263238', wing: '#37474f', accent: '#80cbc4', cockpit: '#4db6ac'},
  {id: 'biplane', kind: 'enemy', body: '#ef6c00', wing: '#ffb74d', accent: '#fff59d', cockpit: '#ffe0b2'},
  {id: 'yellow-jet', kind: 'enemy', body: '#f9a825', wing: '#ffee58', accent: '#e53935', cockpit: '#fff9c4'},
  {id: 'cargo', kind: 'enemy', body: '#607d8b', wing: '#90a4ae', accent: '#ffca28', cockpit: '#eceff1', wide: true},
  {id: 'dark-ace', kind: 'enemy', body: '#212121', wing: '#424242', accent: '#f44336', cockpit: '#90caf9'},
  {id: 'titan', kind: 'enemy', body: '#1a237e', wing: '#3949ab', accent: '#ffd54f', cockpit: '#9fa8da', wide: true},
];

function planeSvg(p) {
  const w = 64;
  const h = 96;
  const cx = w / 2;
  // Nose points UP (12 o'clock)
  const bodyW = p.wide ? 14 : 11;
  const wingSpan = p.wide ? 56 : 48;
  const wingY = 48;
  const tailY = 78;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <!-- fuselage -->
  <ellipse cx="${cx}" cy="50" rx="${bodyW}" ry="34" fill="${p.body}"/>
  <!-- nose cone -->
  <path d="M${cx} 6 L${cx + bodyW - 2} 28 L${cx - bodyW + 2} 28 Z" fill="${p.body}"/>
  <path d="M${cx} 10 L${cx + 4} 24 L${cx - 4} 24 Z" fill="${p.accent}"/>
  <!-- cockpit -->
  <ellipse cx="${cx}" cy="34" rx="5" ry="9" fill="${p.cockpit}" opacity="0.95"/>
  <!-- main wings -->
  <path d="M${cx - wingSpan / 2} ${wingY + 6} L${cx - bodyW} ${wingY - 10} L${cx + bodyW} ${wingY - 10} L${cx + wingSpan / 2} ${wingY + 6} L${cx + wingSpan / 2 - 4} ${wingY + 14} L${cx + bodyW} ${wingY + 4} L${cx - bodyW} ${wingY + 4} L${cx - wingSpan / 2 + 4} ${wingY + 14} Z" fill="${p.wing}"/>
  <path d="M${cx - wingSpan / 2 + 6} ${wingY + 4} L${cx - bodyW} ${wingY - 4} L${cx + bodyW} ${wingY - 4} L${cx + wingSpan / 2 - 6} ${wingY + 4}" fill="${p.accent}" opacity="0.55"/>
  <!-- tail wings -->
  <path d="M${cx - 22} ${tailY + 4} L${cx - bodyW + 1} ${tailY - 8} L${cx + bodyW - 1} ${tailY - 8} L${cx + 22} ${tailY + 4} L${cx + 18} ${tailY + 10} L${cx - 18} ${tailY + 10} Z" fill="${p.wing}"/>
  <!-- vertical stabilizer tip (top of image = front, so small tab near nose for silhouette) -->
  <rect x="${cx - 2}" y="${tailY - 2}" width="4" height="14" rx="1" fill="${p.accent}"/>
  <!-- engine glow at rear (bottom) -->
  <ellipse cx="${cx}" cy="86" rx="4" ry="5" fill="#ff8a65" opacity="0.85"/>
  <ellipse cx="${cx}" cy="88" rx="2.5" ry="3" fill="#fff59d"/>
</svg>`;
}

function heartSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <path d="M24 42 C24 42 6 30 6 18 C6 11 11 6 18 6 C21 6 23.5 7.5 24 10 C24.5 7.5 27 6 30 6 C37 6 42 11 42 18 C42 30 24 42 24 42 Z" fill="#e53935"/>
  <ellipse cx="16" cy="16" rx="5" ry="3.5" fill="#fff" opacity="0.45" transform="rotate(-25 16 16)"/>
</svg>`;
}

async function writePng(filePath, svg, size) {
  const buf = await sharp(Buffer.from(svg))
    .ensureAlpha()
    .resize(size.w, size.h, {fit: 'fill', kernel: sharp.kernel.nearest})
    .png()
    .toBuffer();
  fs.writeFileSync(filePath, buf);
  console.log('wrote', path.relative(path.join(__dirname, '..'), filePath));
}

for (const p of PLANES) {
  await writePng(path.join(OUT, `${p.id}.png`), planeSvg(p), {w: 64, h: 96});
}

await writePng(path.join(FX, 'heart.png'), heartSvg(), {w: 48, h: 48});
console.log(`Done: ${PLANES.length} planes + heart`);
