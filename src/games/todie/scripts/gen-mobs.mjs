/**
 * Generate fiercer pixel mob sprites (normal + elite).
 * Run: node src/games/todie/scripts/gen-mobs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, '..', '..', '..', 'public', 'todie', 'mobs');
const PX = 64;
const OUT = 256;
const SCALE = OUT / PX;

const O = [12, 8, 10, 255];

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
function encodePng(pixels, w, h) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    const row = y * (w * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const o = row + 1 + x * 4;
      raw[o] = pixels[i];
      raw[o + 1] = pixels[i + 1];
      raw[o + 2] = pixels[i + 2];
      raw[o + 3] = pixels[i + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, {level: 9})),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function blank(n = PX) {
  return new Uint8ClampedArray(n * n * 4);
}
function set(px, x, y, rgba, n = PX) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= n || y >= n) return;
  const i = (y * n + x) * 4;
  const a = rgba[3] / 255;
  const inv = 1 - a;
  px[i] = Math.round(rgba[0] * a + px[i] * inv);
  px[i + 1] = Math.round(rgba[1] * a + px[i + 1] * inv);
  px[i + 2] = Math.round(rgba[2] * a + px[i + 2] * inv);
  px[i + 3] = Math.min(255, Math.round(px[i + 3] * inv + rgba[3]));
}
function fillCircle(px, cx, cy, r, rgba) {
  const rr = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= rr) set(px, x, y, rgba);
    }
  }
}
function fillEllipse(px, cx, cy, rx, ry, rgba) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = (x - cx) / Math.max(0.001, rx);
      const dy = (y - cy) / Math.max(0.001, ry);
      if (dx * dx + dy * dy <= 1) set(px, x, y, rgba);
    }
  }
}
function fillRect(px, x0, y0, w, h, rgba) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) set(px, x, y, rgba);
  }
}
function fillTri(px, x0, y0, x1, y1, x2, y2, rgba) {
  const minX = Math.floor(Math.min(x0, x1, x2));
  const maxX = Math.ceil(Math.max(x0, x1, x2));
  const minY = Math.floor(Math.min(y0, y1, y2));
  const maxY = Math.ceil(Math.max(y0, y1, y2));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const d1 = (x - x1) * (y0 - y1) - (x0 - x1) * (y - y1);
      const d2 = (x - x2) * (y1 - y2) - (x1 - x2) * (y - y2);
      const d3 = (x - x0) * (y2 - y0) - (x2 - x0) * (y - y0);
      if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) {
        set(px, x, y, rgba);
      }
    }
  }
}
function line(px, x0, y0, x1, y1, rgba, thick = 1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    for (let dy = 0; dy < thick; dy += 1) {
      for (let dx = 0; dx < thick; dx += 1) set(px, x + dx, y + dy, rgba);
    }
  }
}
function outline(px) {
  const out = blank();
  for (let y = 0; y < PX; y += 1) {
    for (let x = 0; x < PX; x += 1) {
      const i = (y * PX + x) * 4;
      if (px[i + 3] < 40) continue;
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= PX || ny >= PX) {
          set(out, nx, ny, O);
          continue;
        }
        if (px[(ny * PX + nx) * 4 + 3] < 40) set(out, nx, ny, O);
      }
    }
  }
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] > 40) {
      out[i] = px[i];
      out[i + 1] = px[i + 1];
      out[i + 2] = px[i + 2];
      out[i + 3] = px[i + 3];
    }
  }
  return out;
}
function upscale(px) {
  const out = blank(OUT);
  for (let y = 0; y < PX; y += 1) {
    for (let x = 0; x < PX; x += 1) {
      const i = (y * PX + x) * 4;
      if (px[i + 3] < 8) continue;
      const rgba = [px[i], px[i + 1], px[i + 2], px[i + 3]];
      for (let sy = 0; sy < SCALE; sy += 1) {
        for (let sx = 0; sx < SCALE; sx += 1) {
          set(out, x * SCALE + sx, y * SCALE + sy, rgba, OUT);
        }
      }
    }
  }
  return out;
}
function tintPurple(px) {
  const out = blank();
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 40) continue;
    out[i] = Math.min(255, Math.round(px[i] * 0.65 + 85));
    out[i + 1] = Math.min(255, Math.round(px[i + 1] * 0.5 + 35));
    out[i + 2] = Math.min(255, Math.round(px[i + 2] * 0.75 + 110));
    out[i + 3] = px[i + 3];
  }
  return out;
}
function addEliteHorns(px) {
  const horn = [160, 90, 230, 255];
  fillTri(px, 20, 16, 14, 2, 26, 14, horn);
  fillTri(px, 44, 16, 50, 2, 38, 14, horn);
}

/** Angry slit eyes */
function slitEyes(px, lx, ly, rx, ry) {
  const glow = [255, 60, 40, 255];
  const core = [255, 210, 120, 255];
  fillRect(px, lx - 3, ly, 6, 2, glow);
  fillRect(px, rx - 3, ry, 6, 2, glow);
  set(px, lx, ly, core);
  set(px, rx, ry, core);
  // brows angled down to center
  line(px, lx - 4, ly - 3, lx + 2, ly - 1, O, 1);
  line(px, rx + 4, ry - 3, rx - 2, ry - 1, O, 1);
}

function fangs(px, cx, cy) {
  const tooth = [235, 230, 215, 255];
  fillTri(px, cx - 5, cy, cx - 3, cy + 7, cx - 1, cy, tooth);
  fillTri(px, cx + 1, cy, cx + 3, cy + 7, cx + 5, cy, tooth);
}

function drawSlime() {
  const px = blank();
  const g0 = [18, 48, 28, 255];
  const g1 = [32, 78, 36, 255];
  const g2 = [48, 110, 44, 255];
  const g3 = [70, 140, 55, 255];
  const goo = [24, 60, 32, 220];
  // irregular lumpy body (not a perfect circle)
  fillEllipse(px, 32, 40, 17, 14, g1);
  fillEllipse(px, 24, 36, 10, 12, g0);
  fillEllipse(px, 40, 38, 11, 11, g2);
  fillEllipse(px, 32, 32, 12, 10, g2);
  fillEllipse(px, 28, 30, 5, 4, g3);
  // crown spikes
  fillTri(px, 16, 30, 10, 12, 22, 28, g0);
  fillTri(px, 26, 26, 22, 6, 32, 24, g1);
  fillTri(px, 36, 26, 38, 8, 44, 26, g0);
  fillTri(px, 46, 30, 54, 14, 50, 32, g1);
  // side barbs
  fillTri(px, 14, 40, 6, 36, 16, 46, g0);
  fillTri(px, 50, 40, 58, 34, 48, 48, g0);
  // drips
  fillEllipse(px, 20, 52, 3, 7, goo);
  fillEllipse(px, 34, 54, 4, 8, goo);
  fillEllipse(px, 46, 50, 3, 6, goo);
  slitEyes(px, 24, 36, 40, 36);
  fangs(px, 32, 42);
  // mouth gash
  line(px, 26, 44, 38, 44, [20, 10, 10, 255], 1);
  return px;
}

function drawBat() {
  const px = blank();
  const f0 = [28, 18, 40, 255];
  const f1 = [50, 32, 70, 255];
  const f2 = [78, 50, 100, 255];
  const mem = [70, 28, 55, 255];
  const mem2 = [110, 40, 70, 255];
  // wide jagged wings
  fillTri(px, 32, 32, 2, 16, 8, 44, mem);
  fillTri(px, 32, 32, 62, 16, 56, 44, mem);
  fillTri(px, 16, 30, 0, 10, 12, 38, mem2);
  fillTri(px, 48, 30, 64, 10, 52, 38, mem2);
  fillTri(px, 10, 36, 2, 48, 16, 42, mem);
  fillTri(px, 54, 36, 62, 48, 48, 42, mem);
  // leaner body
  fillEllipse(px, 32, 34, 8, 11, f1);
  fillEllipse(px, 32, 32, 6, 8, f2);
  // tall pointed ears
  fillTri(px, 24, 24, 18, 4, 28, 22, f0);
  fillTri(px, 40, 24, 46, 4, 36, 22, f0);
  fillTri(px, 24, 20, 20, 10, 26, 20, [140, 60, 90, 255]);
  fillTri(px, 40, 20, 44, 10, 38, 20, [140, 60, 90, 255]);
  slitEyes(px, 27, 32, 37, 32);
  fangs(px, 32, 38);
  line(px, 28, 40, 36, 40, [20, 8, 12, 255], 1);
  // wing claws
  fillTri(px, 6, 44, 2, 52, 10, 48, [200, 200, 210, 255]);
  fillTri(px, 58, 44, 62, 52, 54, 48, [200, 200, 210, 255]);
  return px;
}

function drawBlock() {
  const px = blank();
  const s0 = [40, 34, 30, 255];
  const s1 = [72, 62, 52, 255];
  const s2 = [105, 92, 78, 255];
  const crack = [18, 12, 10, 255];
  const glow = [255, 70, 20, 255];
  // chunky irregular rock
  fillRect(px, 14, 16, 36, 36, s1);
  fillRect(px, 18, 20, 28, 28, s2);
  fillRect(px, 12, 28, 6, 16, s0);
  fillRect(px, 46, 24, 6, 20, s0);
  fillTri(px, 14, 16, 8, 8, 22, 18, s0);
  fillTri(px, 50, 16, 58, 6, 44, 20, s0);
  fillTri(px, 22, 14, 18, 2, 30, 14, s0);
  fillTri(px, 42, 14, 48, 2, 36, 16, s0);
  fillTri(px, 30, 14, 28, 4, 36, 14, s1);
  // deep cracks
  line(px, 28, 22, 34, 48, crack, 2);
  line(px, 20, 34, 44, 30, crack, 1);
  line(px, 36, 24, 48, 44, crack, 1);
  // angry slit glow eyes
  fillRect(px, 20, 28, 8, 3, glow);
  fillRect(px, 36, 28, 8, 3, glow);
  set(px, 22, 29, [255, 220, 140, 255]);
  set(px, 38, 29, [255, 220, 140, 255]);
  line(px, 18, 26, 28, 28, O, 1);
  line(px, 46, 26, 36, 28, O, 1);
  // jagged maw
  fillRect(px, 24, 40, 16, 5, crack);
  for (let i = 0; i < 5; i += 1) {
    fillTri(px, 25 + i * 3, 40, 26 + i * 3, 46, 28 + i * 3, 40, s0);
  }
  return px;
}

function drawWolf() {
  const px = blank();
  const f0 = [32, 22, 16, 255];
  const f1 = [70, 48, 32, 255];
  const f2 = [110, 82, 52, 255];
  const belly = [150, 130, 100, 255];
  // elongated body / lean predator stance
  fillEllipse(px, 28, 38, 15, 8, f1);
  fillEllipse(px, 26, 38, 8, 5, belly);
  // larger head + snout
  fillEllipse(px, 44, 28, 10, 8, f2);
  fillEllipse(px, 52, 30, 7, 4, f1);
  fillTri(px, 56, 28, 62, 30, 56, 34, f0);
  // tall ears
  fillTri(px, 38, 22, 34, 4, 44, 20, f0);
  fillTri(px, 46, 20, 50, 2, 52, 20, f0);
  fillTri(px, 39, 18, 36, 8, 42, 18, [160, 70, 70, 255]);
  // lanky legs
  fillRect(px, 16, 42, 3, 12, f0);
  fillRect(px, 24, 44, 3, 10, f0);
  fillRect(px, 34, 42, 3, 12, f0);
  fillRect(px, 42, 44, 3, 10, f0);
  // bushy tail
  fillTri(px, 12, 34, 2, 24, 14, 40, f1);
  fillTri(px, 10, 30, 0, 20, 8, 34, f0);
  slitEyes(px, 42, 26, 48, 26);
  fangs(px, 54, 32);
  line(px, 48, 34, 58, 34, [20, 8, 8, 255], 1);
  // mane spike
  fillTri(px, 34, 24, 30, 14, 38, 24, f0);
  return px;
}

function drawSpider() {
  const px = blank();
  const b0 = [20, 14, 18, 255];
  const b1 = [42, 28, 34, 255];
  const b2 = [70, 40, 42, 255];
  const leg = [28, 20, 26, 255];
  const mark = [170, 25, 25, 255];
  // jointed legs (8)
  const legs = [
    [22, 26, 4, 10],
    [20, 32, 2, 28],
    [22, 38, 6, 50],
    [24, 42, 10, 56],
    [42, 26, 60, 10],
    [44, 32, 62, 28],
    [42, 38, 58, 50],
    [40, 42, 54, 56],
  ];
  for (const [x0, y0, x1, y1] of legs) {
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2 - 4;
    line(px, x0, y0, mx, my, leg, 2);
    line(px, mx, my, x1, y1, leg, 2);
    fillCircle(px, x1, y1, 1, [180, 180, 190, 255]);
  }
  // bulbous abdomen with ridges
  fillEllipse(px, 26, 36, 11, 13, b1);
  fillEllipse(px, 24, 36, 7, 9, b2);
  fillEllipse(px, 26, 32, 4, 5, mark);
  line(px, 20, 34, 30, 34, b0, 1);
  line(px, 20, 40, 30, 40, b0, 1);
  // head / fangs
  fillEllipse(px, 40, 32, 8, 7, b0);
  fillEllipse(px, 42, 30, 5, 4, b1);
  // cluster of small angry eyes
  for (const [ex, ey] of [
    [38, 28],
    [42, 27],
    [46, 28],
    [40, 30],
    [44, 30],
  ]) {
    fillCircle(px, ex, ey, 1, [220, 40, 30, 255]);
    set(px, ex, ey, [255, 200, 80, 255]);
  }
  fillTri(px, 44, 34, 42, 42, 46, 36, [220, 210, 200, 255]);
  fillTri(px, 48, 34, 50, 42, 46, 36, [220, 210, 200, 255]);
  return px;
}

function save(name, px) {
  const lined = outline(px);
  const big = upscale(lined);
  fs.mkdirSync(PUBLIC, {recursive: true});
  fs.writeFileSync(path.join(PUBLIC, `${name}.png`), encodePng(big, OUT, OUT));
  console.log('wrote', name);
}

function saveElite(name, draw) {
  const px = draw();
  addEliteHorns(px);
  save(`${name}_elite`, tintPurple(px));
}

const makers = {
  slime: drawSlime,
  bat: drawBat,
  block: drawBlock,
  wolf: drawWolf,
  spider: drawSpider,
};

for (const [id, fn] of Object.entries(makers)) {
  save(id, fn());
  saveElite(id, fn);
}

console.log('Done mobs →', PUBLIC);
