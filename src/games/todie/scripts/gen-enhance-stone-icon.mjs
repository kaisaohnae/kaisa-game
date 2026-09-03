/**
 * 강화석(enhance stone) inventory icon — simple faceted gem, teal glow.
 * Run: node src/games/todie/scripts/gen-enhance-stone-icon.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', '..', '..', '..', 'public', 'todie', 'items', 'enhance_stone.png');
const SIZE = 256;
const CX = 128;
const CY = 128;

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
      let cov = d > softIn ? 1 - (d - softIn) / (soft + 1e-4) : 1;
      if (cov > 0) blend(px, x, y, r, g, b, a * cov);
    }
  }
}
function glow(px, cx, cy, r, rgba) {
  softEllipse(px, cx, cy, r, r, rgba, 0.88);
}
function polygon(px, points, rgba) {
  const [r, g, b, a] = rgba;
  let minY = SIZE, maxY = 0;
  for (const [, y] of points) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(SIZE - 1, Math.ceil(maxY)); y += 1) {
    const xs = [];
    for (let i = 0; i < points.length; i += 1) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[(i + 1) % points.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        const t = (y - y0) / (y1 - y0);
        xs.push(x0 + t * (x1 - x0));
      }
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i < xs.length; i += 2) {
      const xa = xs[i];
      const xb = xs[i + 1];
      if (xb == null) continue;
      for (let x = Math.max(0, Math.round(xa)); x <= Math.min(SIZE - 1, Math.round(xb)); x += 1) {
        blend(px, x, y, r, g, b, a);
      }
    }
  }
}

const px = blank();
// soft ground shadow + teal glow
softEllipse(px, CX, CY + 30, 74, 22, hex('#000000', 0.35), 0.6);
glow(px, CX, CY, 100, hex('#4dd0c8', 0.32));
glow(px, CX, CY, 60, hex('#80cbc4', 0.4));

// faceted gem body (hexagonal crystal), built from a few overlapping polygons for shading
const top = [CX, CY - 76];
const bottom = [CX, CY + 88];
const L = [CX - 58, CY - 14];
const R = [CX + 58, CY - 14];
const LB = [CX - 34, CY + 46];
const RB = [CX + 34, CY + 46];

// base body (mid tone)
polygon(px, [top, R, RB, bottom, LB, L], hex('#26a69a', 1));
// left facet (shadow)
polygon(px, [top, L, LB, bottom], hex('#1c7d75', 1));
// right facet (highlight)
polygon(px, [top, R, RB, bottom], hex('#4dd0c8', 1));
// center bright facet
polygon(px, [top, L, R], hex('#b2ebe6', 0.9));
// inner sparkle facet lines
polygon(px, [
  [CX, CY - 76],
  [CX - 10, CY - 8],
  [CX + 10, CY - 8],
], hex('#e0f7f5', 0.85));

// outline
function strokePoly(points, rgba, width) {
  const [r, g, b, a] = rgba;
  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const steps = Math.ceil(len);
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      for (let dy = -width; dy <= width; dy += 1) {
        for (let dx = -width; dx <= width; dx += 1) {
          if (dx * dx + dy * dy > width * width) continue;
          blend(px, x + dx, y + dy, r, g, b, a);
        }
      }
    }
  }
}
strokePoly([top, R, RB, bottom, LB, L], hex('#0f5f59', 0.9), 2);
strokePoly([top, L, R], hex('#0f5f59', 0.55), 1.2);

// small sparkles
for (const [sx, sy, r] of [[CX - 34, CY - 30, 4], [CX + 30, CY + 6, 3], [CX + 6, CY - 48, 2.5]]) {
  softEllipse(px, sx, sy, r, r, hex('#ffffff', 0.85), 0.3);
}

fs.mkdirSync(path.dirname(OUT), {recursive: true});
fs.writeFileSync(OUT, encodePng(px));
console.log('wrote', OUT);
