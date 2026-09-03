/**
 * Rough placeholder sprites for new village building/shop map objects
 * (house_big, house_small, house_wizard, shop_boots). Transparent background,
 * drawn directly (same convention as the existing tree/rock/crate objects) —
 * meant to be regenerated properly later via /studio (PixelLab), see
 * scripts/pixellab-studio/manifest.mjs.
 * Run: node src/games/todie/scripts/gen-buildings.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', '..', '..', '..', 'public', 'todie', 'objects');
const SIZE = 128;
const CX = 64;

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
function encodePng(pixels) {
  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    const row = y * (SIZE * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < SIZE; x += 1) {
      const i = (y * SIZE + x) * 4;
      const o = row + 1 + x * 4;
      raw[o] = pixels[i];
      raw[o + 1] = pixels[i + 1];
      raw[o + 2] = pixels[i + 2];
      raw[o + 3] = pixels[i + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, {level: 6})),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function blank() {
  return new Uint8ClampedArray(SIZE * SIZE * 4);
}
function blend(px, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || a <= 0) return;
  const i = (Math.round(y) * SIZE + Math.round(x)) * 4;
  if (i < 0 || i >= px.length) return;
  const da = a / 255;
  const oa = px[i + 3] / 255;
  const outA = da + oa * (1 - da);
  if (outA <= 0) return;
  px[i] = Math.round((r * da + px[i] * oa * (1 - da)) / outA);
  px[i + 1] = Math.round((g * da + px[i + 1] * oa * (1 - da)) / outA);
  px[i + 2] = Math.round((b * da + px[i + 2] * oa * (1 - da)) / outA);
  px[i + 3] = Math.round(outA * 255);
}
function softEllipse(px, cx, cy, rx, ry, rgba, soft = 0.14) {
  const [r, g, b, a] = rgba;
  const pad = Math.ceil(Math.max(rx, ry) * (1 + soft) + 2);
  const softIn = 1 - soft;
  for (let y = Math.max(0, Math.floor(cy - pad)); y <= Math.min(SIZE - 1, Math.ceil(cy + pad)); y += 1) {
    for (let x = Math.max(0, Math.floor(cx - pad)); x <= Math.min(SIZE - 1, Math.ceil(cx + pad)); x += 1) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (d > 1 + soft) continue;
      const cov = d > softIn ? 1 - (d - softIn) / (soft + 1e-4) : 1;
      if (cov > 0) blend(px, x, y, r, g, b, a * cov);
    }
  }
}
function glow(px, cx, cy, r, rgba) {
  softEllipse(px, cx, cy, r, r, rgba, 0.9);
}
function fillRect(px, x0, y0, x1, y1, rgba, soft = 1) {
  const [r, g, b, a] = rgba;
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y += 1) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x += 1) {
      blend(px, x, y, r, g, b, a);
    }
  }
}
function fillTriangle(px, ax, ay, bx, by, cx, cy, rgba) {
  const [r, g, b, a] = rgba;
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
  const maxY = Math.min(SIZE - 1, Math.ceil(Math.max(ay, by, cy)));
  const sign = (px1, py1, px2, py2, px3, py3) =>
    (px1 - px3) * (py2 - py3) - (px2 - px3) * (py1 - py3);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const d1 = sign(x, y, ax, ay, bx, by);
      const d2 = sign(x, y, bx, by, cx, cy);
      const d3 = sign(x, y, cx, cy, ax, ay);
      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
      const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(hasNeg && hasPos)) blend(px, x, y, r, g, b, a);
    }
  }
}
function outline(px, rgba = [20, 14, 10, 235], width = 2.4) {
  const out = blank();
  const [r, g, b, a] = rgba;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const i = (y * SIZE + x) * 4;
      if (px[i + 3] < 40) continue;
      for (let dy = -width; dy <= width; dy += 1) {
        for (let dx = -width; dx <= width; dx += 1) {
          if (dx * dx + dy * dy > width * width + 1) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
          if (px[(ny * SIZE + nx) * 4 + 3] < 40) blend(out, nx, ny, r, g, b, a);
        }
      }
    }
  }
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;
    blend(out, (i / 4) % SIZE, Math.floor(i / 4 / SIZE), px[i], px[i + 1], px[i + 2], px[i + 3]);
  }
  return out;
}

function groundShadow(px, w) {
  softEllipse(px, CX, 118, w, 10, hex('#000000', 0.32), 0.55);
}

function drawHouseBig(px) {
  groundShadow(px, 46);
  // main two-story wall block
  fillRect(px, 22, 58, 106, 112, hex('#c9b896'));
  fillRect(px, 22, 58, 106, 64, hex('#a8977a')); // upper trim band
  // roof
  fillTriangle(px, 10, 60, 118, 60, 64, 12, hex('#7a3b2e'));
  fillTriangle(px, 10, 60, 118, 60, 64, 18, hex('#8f4a38'));
  // ridge line
  fillRect(px, 62, 14, 66, 58, hex('#5c2b21'), 0);
  // chimney + smoke
  fillRect(px, 86, 22, 98, 42, hex('#6d4c41'));
  glow(px, 92, 16, 10, hex('#cfd8dc', 0.35));
  softEllipse(px, 90, 10, 6, 6, hex('#eceff1', 0.5), 0.6);
  // door
  fillRect(px, 56, 86, 74, 112, hex('#5d4037'));
  softEllipse(px, 70, 99, 1.6, 1.6, hex('#3e2723', 0.9), 0.2);
  // windows (glowing warm)
  for (const wx of [34, 92]) {
    fillRect(px, wx - 8, 72, wx + 8, 84, hex('#4e3b2c'));
    softEllipse(px, wx, 78, 6, 5, hex('#ffe082', 0.9), 0.3);
  }
  return outline(px);
}

function drawHouseSmall(px) {
  groundShadow(px, 34);
  fillRect(px, 36, 66, 92, 112, hex('#d9c9a3'));
  // thatched triangular roof
  fillTriangle(px, 24, 68, 104, 68, 64, 26, hex('#c9a24a'));
  fillTriangle(px, 24, 68, 104, 68, 64, 34, hex('#dbb85e'));
  // door
  fillRect(px, 56, 88, 72, 112, hex('#6d4c41'));
  // one small window
  fillRect(px, 42, 78, 54, 90, hex('#4e3b2c'));
  softEllipse(px, 48, 84, 4.5, 4, hex('#ffe082', 0.9), 0.3);
  return outline(px);
}

function drawHouseWizard(px) {
  groundShadow(px, 38);
  // tall tower body
  fillRect(px, 44, 52, 84, 114, hex('#8d7fb0'));
  fillRect(px, 44, 52, 84, 60, hex('#6f5f96'));
  // pointed cone roof (purple)
  fillTriangle(px, 30, 56, 98, 56, 64, 8, hex('#5c4b8a'));
  fillTriangle(px, 30, 56, 98, 56, 64, 14, hex('#6f5aa8'));
  // stars on roof
  for (const [sx, sy] of [
    [50, 34],
    [78, 30],
    [64, 44],
  ]) {
    softEllipse(px, sx, sy, 2, 2, hex('#fff59d', 0.85), 0.3);
  }
  // crescent moon accent near tip
  softEllipse(px, 64, 16, 6, 6, hex('#ffe082', 0.9), 0.25);
  softEllipse(px, 67, 15, 5, 5, hex('#5c4b8a', 1), 0.25);
  // glowing round window
  glow(px, 64, 82, 16, hex('#80deea', 0.35));
  softEllipse(px, 64, 82, 9, 9, hex('#263859', 0.95), 0.15);
  softEllipse(px, 64, 82, 6, 6, hex('#4dd0e1', 0.9), 0.3);
  // door
  fillRect(px, 56, 96, 72, 114, hex('#3e3252'));
  return outline(px);
}

function drawShopBoots(px) {
  groundShadow(px, 42);
  // storefront wall
  fillRect(px, 24, 64, 104, 112, hex('#8a6a52'));
  // awning (striped triangle strip)
  fillTriangle(px, 16, 64, 112, 64, 64, 44, hex('#6d4c41'));
  fillRect(px, 16, 60, 112, 66, hex('#a1887f'));
  // display window
  fillRect(px, 34, 76, 74, 100, hex('#cfe8f3', 0.85));
  fillRect(px, 34, 76, 74, 100, hex('#4e3b2c'), 0); // frame drawn via outline pass
  // simple boot silhouette in the window
  fillRect(px, 44, 84, 54, 96, hex('#5d4037'));
  fillRect(px, 44, 92, 62, 98, hex('#5d4037'));
  softEllipse(px, 62, 95, 3, 3, hex('#3e2723', 0.9), 0.2);
  // door
  fillRect(px, 82, 84, 98, 112, hex('#5d4037'));
  // hanging boot sign
  fillRect(px, 88, 30, 92, 46, hex('#3e2723'));
  fillRect(px, 78, 46, 100, 56, hex('#6d4c41'));
  fillRect(px, 78, 54, 96, 60, hex('#6d4c41'));
  return outline(px);
}

const BUILDINGS = [
  {id: 'house_big', draw: drawHouseBig},
  {id: 'house_small', draw: drawHouseSmall},
  {id: 'house_wizard', draw: drawHouseWizard},
  {id: 'shop_boots', draw: drawShopBoots},
];

fs.mkdirSync(PUBLIC, {recursive: true});
for (const b of BUILDINGS) {
  const px = b.draw(blank());
  fs.writeFileSync(path.join(PUBLIC, `${b.id}.png`), encodePng(px));
  console.log('wrote', b.id);
}
console.log('done —', BUILDINGS.length, 'building sprites written to', PUBLIC);
