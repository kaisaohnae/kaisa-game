/**
 * Rough placeholder sprites for plane-shoot projectiles + weapon items.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BULLETS_DIR = path.join(ROOT, 'public', 'plane-shoot', 'projectiles');
const ITEMS_DIR = path.join(ROOT, 'public', 'plane-shoot', 'items');

fs.mkdirSync(BULLETS_DIR, {recursive: true});
fs.mkdirSync(ITEMS_DIR, {recursive: true});

async function writePng(filePath, svg, size) {
  const buf = await sharp(Buffer.from(svg))
    .ensureAlpha()
    .resize(size.w, size.h, {fit: 'fill', kernel: sharp.kernel.nearest})
    .png()
    .toBuffer();
  fs.writeFileSync(filePath, buf);
  console.log('wrote', path.relative(ROOT, filePath));
}

const PROJECTILES = [
  {
    id: 'basic',
    size: {w: 16, h: 28},
    svg: `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="16" height="28" viewBox="0 0 16 28">
      <rect x="5" y="2" width="6" height="22" rx="3" fill="#ffee58"/>
      <rect x="6" y="0" width="4" height="8" rx="2" fill="#fffde7"/>
      <ellipse cx="8" cy="24" rx="4" ry="3" fill="#ff9800" opacity="0.85"/>
    </svg>`,
  },
  {
    id: 'spread',
    size: {w: 20, h: 24},
    svg: `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="20" height="24" viewBox="0 0 20 24">
      <path d="M10 1 L13 14 L10 12 L7 14 Z" fill="#4fc3f7"/>
      <path d="M4 6 L8 16 L5 15 L2 18 Z" fill="#29b6f6"/>
      <path d="M16 6 L18 18 L15 15 L12 16 Z" fill="#29b6f6"/>
      <circle cx="10" cy="8" r="2.5" fill="#e1f5fe"/>
    </svg>`,
  },
  {
    id: 'laser',
    size: {w: 12, h: 40},
    svg: `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="12" height="40" viewBox="0 0 12 40">
      <rect x="4" y="0" width="4" height="40" rx="2" fill="#76ff03"/>
      <rect x="5" y="0" width="2" height="40" fill="#ffff8d"/>
      <rect x="3" y="0" width="6" height="40" rx="3" fill="#b2ff59" opacity="0.35"/>
    </svg>`,
  },
  {
    id: 'plasma',
    size: {w: 28, h: 28},
    svg: `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="12" fill="#7c4dff" opacity="0.35"/>
      <circle cx="14" cy="14" r="8" fill="#b388ff"/>
      <circle cx="14" cy="14" r="5" fill="#ea80fc"/>
      <circle cx="11" cy="11" r="2" fill="#fff"/>
    </svg>`,
  },
  {
    id: 'star',
    size: {w: 32, h: 32},
    svg: `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <polygon points="16,2 19,12 30,12 21,18 24,28 16,22 8,28 11,18 2,12 13,12" fill="#ffd54f"/>
      <polygon points="16,7 18,13 24,13 19,16 21,22 16,18 11,22 13,16 8,13 14,13" fill="#fff59d"/>
      <circle cx="16" cy="16" r="3" fill="#ff6f00"/>
    </svg>`,
  },
  {
    id: 'enemy-bolt',
    size: {w: 14, h: 22},
    svg: `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="14" height="22" viewBox="0 0 14 22">
      <rect x="4" y="0" width="6" height="18" rx="3" fill="#ef5350"/>
      <rect x="5" y="14" width="4" height="8" rx="2" fill="#ffcdd2"/>
      <ellipse cx="7" cy="3" rx="4" ry="3" fill="#ff1744" opacity="0.8"/>
    </svg>`,
  },
];

const WEAPON_ITEMS = [
  {id: 'weapon-spread', fill: '#29b6f6', mark: 'S', label: 'spread'},
  {id: 'weapon-laser', fill: '#76ff03', mark: 'L', label: 'laser'},
  {id: 'weapon-plasma', fill: '#b388ff', mark: 'P', label: 'plasma'},
  {id: 'weapon-star', fill: '#ffd54f', mark: '★', label: 'star'},
];

function itemSvg(it) {
  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="18" fill="${it.fill}" opacity="0.35"/>
    <circle cx="20" cy="20" r="14" fill="${it.fill}"/>
    <circle cx="20" cy="20" r="10" fill="#fff" opacity="0.85"/>
    <text x="20" y="25" text-anchor="middle" font-size="14" font-family="Arial Black, sans-serif" font-weight="700" fill="#37474f">${it.mark}</text>
  </svg>`;
}

for (const p of PROJECTILES) {
  await writePng(path.join(BULLETS_DIR, `${p.id}.png`), p.svg, p.size);
}

for (const it of WEAPON_ITEMS) {
  await writePng(path.join(ITEMS_DIR, `${it.id}.png`), itemSvg(it), {w: 40, h: 40});
}

console.log(`Done: ${PROJECTILES.length} projectiles + ${WEAPON_ITEMS.length} items`);
