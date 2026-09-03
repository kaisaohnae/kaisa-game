/**
 * Rough placeholder sprites for the new A~F tile variants (grass/wasteland/
 * stone_path/water_shallow) that didn't exist before. Background is near-black
 * so the client's punchDarkToAlpha() turns it transparent and the real biome
 * fill color (from TILE_DEFS) shows through — only the scattered detail marks
 * (leaves, pebbles, flecks, ripples) need to render. Periodic (sine-based)
 * placement keeps the pattern reasonably seamless when tiled.
 * Meant to be regenerated properly later via /studio (PixelLab), see
 * scripts/pixellab-studio/manifest.mjs.
 * Run: node src/games/todie/scripts/gen-tile-variants.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', '..', '..', '..', 'public', 'todie', 'tiles');
const SIZE = 64;

const hex = (h, a = 1) => {
  const n = h.replace('#', '');
  const v = parseInt(n.length === 3 ? [...n].map((c) => c + c).join('') : n, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255, Math.round(a * 255)];
};

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(pixels, size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const o = row + 1 + x * 4;
      raw[o] = pixels[i];
      raw[o + 1] = pixels[i + 1];
      raw[o + 2] = pixels[i + 2];
      raw[o + 3] = pixels[i + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, {level: 6})),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function blank(size) {
  return new Uint8ClampedArray(size * size * 4);
}
function blend(px, size, x, y, r, g, b, a) {
  const xi = ((Math.round(x) % size) + size) % size;
  const yi = ((Math.round(y) % size) + size) % size;
  if (a <= 0) return;
  const i = (yi * size + xi) * 4;
  const da = a / 255;
  const oa = px[i + 3] / 255;
  const outA = da + oa * (1 - da);
  if (outA <= 0) return;
  px[i] = Math.round((r * da + px[i] * oa * (1 - da)) / outA);
  px[i + 1] = Math.round((g * da + px[i + 1] * oa * (1 - da)) / outA);
  px[i + 2] = Math.round((b * da + px[i + 2] * oa * (1 - da)) / outA);
  px[i + 3] = Math.round(outA * 255);
}
function softDot(px, size, cx, cy, r, rgba, soft = 0.35) {
  const [rr, gg, bb, a] = rgba;
  const pad = Math.ceil(r * (1 + soft) + 1);
  for (let dy = -pad; dy <= pad; dy += 1) {
    for (let dx = -pad; dx <= pad; dx += 1) {
      const d = Math.hypot(dx, dy) / r;
      if (d > 1 + soft) continue;
      const cov = d > 1 - soft ? 1 - (d - (1 - soft)) / (soft + 1e-4) : 1;
      if (cov > 0) blend(px, size, cx + dx, cy + dy, rr, gg, bb, a * cov);
    }
  }
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function seedFromId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Background near-black so client punches it to transparent, showing the biome fill color beneath */
function baseNearBlack(size) {
  const px = blank(size);
  for (let i = 0; i < px.length; i += 4) {
    px[i] = 6;
    px[i + 1] = 6;
    px[i + 2] = 8;
    px[i + 3] = 255;
  }
  return px;
}

/** Scatter small periodic (wrap-safe) dots/marks — count/size/color driven by biome kind */
function scatterMarks(px, size, rand, count, sizeRange, colors) {
  for (let i = 0; i < count; i += 1) {
    const cx = rand() * size;
    const cy = rand() * size;
    const r = sizeRange[0] + rand() * (sizeRange[1] - sizeRange[0]);
    const [lo, hi] = colors;
    const c = rand() > 0.5 ? lo : hi;
    softDot(px, size, cx, cy, r, c, 0.4);
    // wrap-around echoes near edges so pattern tiles reasonably
    if (cx < r) softDot(px, size, cx + size, cy, r, c, 0.4);
    if (cx > size - r) softDot(px, size, cx - size, cy, r, c, 0.4);
    if (cy < r) softDot(px, size, cx, cy + size, r, c, 0.4);
    if (cy > size - r) softDot(px, size, cx, cy - size, r, c, 0.4);
  }
}

function drawRipples(px, size, rand, colors) {
  const [lo, hi] = colors;
  for (let band = 0; band < 5; band += 1) {
    const y = (band / 5) * size + rand() * 4;
    for (let x = 0; x < size; x += 3) {
      const wobble = Math.sin((x / size) * Math.PI * 2 * 2 + band) * 2;
      softDot(px, size, x, y + wobble, 1.4, band % 2 === 0 ? lo : hi, 0.5);
    }
  }
}

const TILE_VARIANTS = [
  // grass — new C/D/E/F
  {id: 'grass_c', kind: 'grass', hex: '#7ba363'},
  {id: 'grass_d', kind: 'grass', hex: '#587d47'},
  {id: 'grass_e', kind: 'grass', hex: '#83a86e'},
  {id: 'grass_f', kind: 'grass', hex: '#4f7040'},
  // wasteland — new C/D/E/F
  {id: 'wasteland_c', kind: 'wasteland', hex: '#ad8a68'},
  {id: 'wasteland_d', kind: 'wasteland', hex: '#7c5f45'},
  {id: 'wasteland_e', kind: 'wasteland', hex: '#b89473'},
  {id: 'wasteland_f', kind: 'wasteland', hex: '#6e5238'},
  // stone_path — new B..F (stone_path/"A" already exists as a real asset)
  {id: 'stone_path_b', kind: 'stone', hex: '#9a9c96'},
  {id: 'stone_path_c', kind: 'stone', hex: '#7c7e79'},
  {id: 'stone_path_d', kind: 'stone', hex: '#a3a58f'},
  {id: 'stone_path_e', kind: 'stone', hex: '#6f716c'},
  {id: 'stone_path_f', kind: 'stone', hex: '#b0a98f'},
  // water_shallow — new B..F
  {id: 'water_shallow_b', kind: 'water', hex: '#5aa0c9'},
  {id: 'water_shallow_c', kind: 'water', hex: '#3f7a9e'},
  {id: 'water_shallow_d', kind: 'water', hex: '#6bb4d6'},
  {id: 'water_shallow_e', kind: 'water', hex: '#34637f'},
  {id: 'water_shallow_f', kind: 'water', hex: '#7fc4dd'},
];

function drawTile(variant) {
  const px = baseNearBlack(SIZE);
  const rand = seededRandom(seedFromId(variant.id));
  const base = hex(variant.hex, 0.9);
  const light = hex(variant.hex, 0.55);
  if (variant.kind === 'grass') {
    scatterMarks(px, SIZE, rand, 26, [1.2, 2.4], [base, light]);
    // a few tiny flower flecks
    scatterMarks(px, SIZE, rand, 4, [0.9, 1.4], [hex('#fff59d', 0.8), hex('#ffffff', 0.7)]);
  } else if (variant.kind === 'wasteland') {
    scatterMarks(px, SIZE, rand, 20, [1.4, 3.2], [base, light]);
    scatterMarks(px, SIZE, rand, 6, [0.8, 1.6], [hex('#3e2f22', 0.6), hex('#000000', 0.4)]);
  } else if (variant.kind === 'stone') {
    scatterMarks(px, SIZE, rand, 14, [3, 6], [base, light]);
    scatterMarks(px, SIZE, rand, 10, [0.8, 1.4], [hex('#2b2b28', 0.5), hex('#ffffff', 0.25)]);
  } else {
    drawRipples(px, SIZE, rand, [base, light]);
    scatterMarks(px, SIZE, rand, 8, [0.8, 1.6], [hex('#ffffff', 0.35), light]);
  }
  return px;
}

fs.mkdirSync(PUBLIC, {recursive: true});
for (const variant of TILE_VARIANTS) {
  const px = drawTile(variant);
  fs.writeFileSync(path.join(PUBLIC, `${variant.id}.png`), encodePng(px, SIZE));
  console.log('wrote', variant.id);
}
console.log('done —', TILE_VARIANTS.length, 'tile sprites written to', PUBLIC);
