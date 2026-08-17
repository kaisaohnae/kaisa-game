/**
 * Generate warrior skill hotbar icons + world FX sprites (pixel art).
 * Run: node src/games/todie/scripts/gen-warrior-skills.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PX = 64;
const OUT = 256;
const SCALE = OUT / PX;

const C = {
  o: [28, 18, 12, 255],
  w: [255, 255, 255, 255],
  y0: [255, 236, 170, 255],
  y1: [255, 210, 70, 255],
  y2: [255, 160, 40, 255],
  o1: [255, 120, 50, 255],
  o2: [220, 70, 30, 255],
  r1: [255, 90, 70, 255],
  steel: [200, 215, 230, 255],
  steelH: [245, 250, 255, 255],
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
  // alpha blend over
  const a = rgba[3] / 255;
  const inv = 1 - a;
  px[i] = Math.round(rgba[0] * a + px[i] * inv);
  px[i + 1] = Math.round(rgba[1] * a + px[i + 1] * inv);
  px[i + 2] = Math.round(rgba[2] * a + px[i + 2] * inv);
  px[i + 3] = Math.min(255, px[i + 3] + rgba[3]);
}
function fillCircle(px, cx, cy, r, rgba) {
  const rr = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 1) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= rr) set(px, x, y, rgba);
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
          set(out, nx, ny, C.o);
          continue;
        }
        const ni = (ny * PX + nx) * 4;
        if (px[ni + 3] < 40) set(out, nx, ny, C.o);
      }
    }
  }
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;
    const x = (i / 4) % PX;
    const y = Math.floor(i / 4 / PX);
    set(out, x, y, [px[i], px[i + 1], px[i + 2], px[i + 3]]);
  }
  return out;
}
function upscale(src) {
  const out = blank(OUT);
  for (let y = 0; y < OUT; y += 1) {
    for (let x = 0; x < OUT; x += 1) {
      const sx = Math.floor(x / SCALE);
      const sy = Math.floor(y / SCALE);
      const si = (sy * PX + sx) * 4;
      const di = (y * OUT + x) * 4;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
      out[di + 3] = src[si + 3];
    }
  }
  return out;
}
function save(name, px) {
  const out = path.join(ROOT, 'jobs', 'warrior', 'skills', `${name}.png`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, encodePng(upscale(outline(px)), OUT, OUT));
  console.log('wrote', out);
}

/** Slash — crescent blade sweep (faces up in icon space) */
function iconSlash() {
  const px = blank();
  for (let i = 0; i < 28; i += 1) {
    const t = i / 27;
    const ang = -1.15 + t * 2.3;
    const r = 18 + Math.sin(t * Math.PI) * 4;
    const x = 32 + Math.cos(ang) * r;
    const y = 34 + Math.sin(ang) * r * 0.85;
    const thick = 3.2 - Math.abs(t - 0.5) * 2.2;
    fillCircle(px, x, y, thick + 1.2, C.y2);
    fillCircle(px, x, y, thick, C.y1);
    fillCircle(px, x - 0.6, y - 0.6, Math.max(0.8, thick * 0.45), C.w);
  }
  // tip sparks
  fillCircle(px, 48, 22, 2.2, C.w);
  fillCircle(px, 50, 20, 1.2, C.y0);
  fillCircle(px, 16, 22, 2.2, C.w);
  // small motion ticks
  for (let i = 0; i < 5; i += 1) {
    const ang = -0.7 + i * 0.35;
    fillCircle(px, 32 + Math.cos(ang) * 26, 34 + Math.sin(ang) * 22, 1, C.y0);
  }
  return px;
}

/** Spin — ring of blades */
function iconSpin() {
  const px = blank();
  for (let a = 0; a < 36; a += 1) {
    const ang = (a / 36) * Math.PI * 2;
    const r = 20;
    const x = 32 + Math.cos(ang) * r;
    const y = 32 + Math.sin(ang) * r;
    const col = a % 3 === 0 ? C.w : a % 3 === 1 ? C.y1 : C.o1;
    fillCircle(px, x, y, 2.6, C.y2);
    fillCircle(px, x, y, 1.8, col);
  }
  // inner glow
  for (let a = 0; a < 16; a += 1) {
    const ang = (a / 16) * Math.PI * 2 + 0.2;
    fillCircle(px, 32 + Math.cos(ang) * 12, 32 + Math.sin(ang) * 12, 1.2, C.y0);
  }
  // center swirl mark
  fillCircle(px, 32, 32, 4, C.y2);
  fillCircle(px, 32, 32, 2.2, C.w);
  return px;
}

/** Bash / dash — impact wedge + speed lines */
function iconBash() {
  const px = blank();
  // speed lines (left → right thrust upward-ish for icon)
  for (let i = 0; i < 7; i += 1) {
    const y = 18 + i * 4;
    const len = 10 + (i % 3) * 4;
    for (let x = 8; x < 8 + len; x += 1) {
      set(px, x, y, i % 2 ? C.y1 : C.o1);
      set(px, x, y + 1, C.y2);
    }
  }
  // impact burst
  fillCircle(px, 42, 32, 10, C.o2);
  fillCircle(px, 42, 32, 7, C.y2);
  fillCircle(px, 42, 32, 4, C.y1);
  fillCircle(px, 40, 30, 2.2, C.w);
  // shock shards
  for (let a = 0; a < 8; a += 1) {
    const ang = (a / 8) * Math.PI * 2;
    fillCircle(px, 42 + Math.cos(ang) * 14, 32 + Math.sin(ang) * 14, 1.6, a % 2 ? C.w : C.y0);
  }
  return px;
}

save('slash', iconSlash());
save('spin', iconSpin());
save('bash', iconBash());
console.log('Done warrior skill icons.');
