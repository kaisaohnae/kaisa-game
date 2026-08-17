/**
 * Slice Calciumtrice OGA warrior sheet into todie 4-dir action frames.
 * Source: https://opengameart.org/content/4-direction-animated-warrior (CC BY 4.0)
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TMP = path.join(__dirname, '_tmp_warrior.png');
const OUT = 256;
const SHEET_URL = 'https://opengameart.org/sites/default/files/warrior_6.png';
const REF_URL = 'https://opengameart.org/sites/default/files/warrior_labelled_reference.png';

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

function decodePng(buf) {
  if (buf[0] !== 137) throw new Error('not png');
  let pos = 8;
  let w = 0;
  let h = 0;
  const idats = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6) throw new Error(`need 8bit RGBA ${w}x${h} bit=${data[8]} ct=${data[9]}`);
    } else if (type === 'IDAT') idats.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const inflated = zlib.inflateSync(Buffer.concat(idats));
  const bpp = 4;
  const stride = w * bpp + 1;
  const pixels = new Uint8ClampedArray(w * h * 4);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };
  let prev = new Uint8Array(w * bpp);
  for (let y = 0; y < h; y += 1) {
    const filter = inflated[y * stride];
    const row = inflated.subarray(y * stride + 1, y * stride + 1 + w * bpp);
    const cur = new Uint8Array(w * bpp);
    for (let i = 0; i < w * bpp; i += 1) {
      const raw = row[i];
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let val = raw;
      if (filter === 1) val = (raw + a) & 255;
      else if (filter === 2) val = (raw + b) & 255;
      else if (filter === 3) val = (raw + Math.floor((a + b) / 2)) & 255;
      else if (filter === 4) val = (raw + paeth(a, b, c)) & 255;
      else if (filter !== 0) throw new Error(`png filter ${filter}`);
      cur[i] = val;
    }
    for (let x = 0; x < w; x += 1) {
      const di = (y * w + x) * 4;
      const si = x * 4;
      pixels[di] = cur[si];
      pixels[di + 1] = cur[si + 1];
      pixels[di + 2] = cur[si + 2];
      pixels[di + 3] = cur[si + 3];
    }
    prev = cur;
  }
  return {w, h, pixels};
}

function alphaAt(px, w, x, y) {
  return px[(y * w + x) * 4 + 3];
}

/** Count opaque pixels in a band to find content columns/rows */
function contentScoreCol(px, w, h, x) {
  let n = 0;
  for (let y = 0; y < h; y += 1) if (alphaAt(px, w, x, y) > 20) n += 1;
  return n;
}
function contentScoreRow(px, w, h, y) {
  let n = 0;
  for (let x = 0; x < w; x += 1) if (alphaAt(px, w, x, y) > 20) n += 1;
  return n;
}

function findGaps(scores, minGap = 2) {
  const gaps = [];
  let run = 0;
  for (let i = 0; i < scores.length; i += 1) {
    if (scores[i] < 3) {
      run += 1;
    } else {
      if (run >= minGap) gaps.push({start: i - run, end: i - 1, len: run});
      run = 0;
    }
  }
  if (run >= minGap) gaps.push({start: scores.length - run, end: scores.length - 1, len: run});
  return gaps;
}

function crop(src, sw, x0, y0, cw, ch) {
  const out = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const sx = x0 + x;
      const sy = y0 + y;
      if (sx < 0 || sy < 0 || sx >= sw) continue;
      const si = (sy * sw + sx) * 4;
      const di = (y * cw + x) * 4;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
      out[di + 3] = src[si + 3];
    }
  }
  return out;
}

function trimOpaque(px, w, h, pad = 2) {
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (px[(y * w + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return {px, w, h};
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const nw = maxX - minX + 1;
  const nh = maxY - minY + 1;
  return {px: crop(px, w, minX, minY, nw, nh), w: nw, h: nh};
}

function fitCenter(src, sw, sh, dw, dh) {
  const out = new Uint8ClampedArray(dw * dh * 4);
  const scale = Math.min(dw / sw, dh / sh) * 0.92;
  const tw = Math.max(1, Math.round(sw * scale));
  const th = Math.max(1, Math.round(sh * scale));
  const ox = Math.floor((dw - tw) / 2);
  const oy = Math.floor((dh - th) / 2);
  for (let y = 0; y < th; y += 1) {
    for (let x = 0; x < tw; x += 1) {
      const sx = Math.min(sw - 1, Math.floor((x / tw) * sw));
      const sy = Math.min(sh - 1, Math.floor((y / th) * sh));
      const si = (sy * sw + sx) * 4;
      const di = ((oy + y) * dw + (ox + x)) * 4;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
      out[di + 3] = src[si + 3];
    }
  }
  return out;
}

function save(job, action, dir, pixels) {
  const out = path.join(ROOT, 'jobs', job, 'actions', `${action}_${dir}.png`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, encodePng(pixels, OUT, OUT));
  console.log('wrote', `jobs/${job}/actions/${action}_${dir}.png`);
}

console.log('downloading sheet…');
const bin = Buffer.from(await (await fetch(SHEET_URL)).arrayBuffer());
fs.writeFileSync(TMP, bin);
const {w, h, pixels} = decodePng(bin);
console.log('sheet', w, 'x', h);

// Prefer fixed 64×64 if it divides evenly (Calciumtrice common)
let cellW = 0;
let cellH = 0;
if (w % 64 === 0 && h % 64 === 0) {
  cellW = 64;
  cellH = 64;
} else if (w % 32 === 0 && h % 64 === 0) {
  cellW = 32;
  cellH = 64;
} else {
  cellW = 64;
  cellH = 64;
}
const cols = Math.floor(w / cellW);
const rows = Math.floor(h / cellH);
console.log('grid', cols, 'x', rows, 'cell', cellW, cellH);

// Dump a few preview tiles so we can verify layout
const previewDir = path.join(__dirname, '_preview');
fs.mkdirSync(previewDir, {recursive: true});
for (let r = 0; r < Math.min(rows, 12); r += 1) {
  for (let c = 0; c < Math.min(cols, 8); c += 1) {
    let tile = crop(pixels, w, c * cellW, r * cellH, cellW, cellH);
    const t = trimOpaque(tile, cellW, cellH, 1);
    if (t.w < 4 || t.h < 4) continue;
    const fitted = fitCenter(t.px, t.w, t.h, OUT, OUT);
    fs.writeFileSync(path.join(previewDir, `r${r}_c${c}.png`), encodePng(fitted, OUT, OUT));
  }
}
console.log('preview tiles in', previewDir);

/**
 * Sheet layout (warrior_6.png @ 64² cells):
 * Adjacent row pairs are near-duplicates (unarmed vs sword, or bob frames).
 * Unique facing rows: 0,2,4,6 = idle dirs; 8,10,12,14 = move dirs.
 * Adjacent cols are often duplicated — use even cols: 0,2,4,…
 * Dir order matches OGA preview: down, right, up, left.
 */
const DIR_ORDER = ['down', 'right', 'up', 'left'];

function pickFrame(row, col) {
  let tile = crop(pixels, w, col * cellW, row * cellH, cellW, cellH);
  const t = trimOpaque(tile, cellW, cellH, 2);
  return fitCenter(t.px, t.w, t.h, OUT, OUT);
}

for (let i = 0; i < 4; i += 1) {
  const dir = DIR_ORDER[i];
  const idleRow = i * 2;
  const walkRow = 8 + i * 2;
  save('warrior', 'idle', dir, pickFrame(idleRow, 0));
  save('warrior', 'walk', dir, pickFrame(walkRow, 2));
  save('warrior', 'roll', dir, pickFrame(walkRow, 4));
}

for (const action of ['idle', 'walk', 'roll']) {
  fs.copyFileSync(
    path.join(ROOT, 'jobs', 'warrior', 'actions', `${action}_down.png`),
    path.join(ROOT, 'jobs', 'warrior', 'actions', `${action}.png`),
  );
}

fs.writeFileSync(
  path.join(ROOT, 'jobs', 'warrior', 'ATTRIBUTION.txt'),
  `Warrior action sprites sliced from:\n` +
    `4 Direction Animated Warrior by Calciumtrice\n` +
    `https://opengameart.org/content/4-direction-animated-warrior\n` +
    `License: CC BY 4.0 — attribution required.\n`,
);

console.log('Done.');
