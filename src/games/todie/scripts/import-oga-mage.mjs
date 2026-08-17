/**
 * Slice 2DPIXX isometric wizard into todie mage 4-dir frames.
 * Source: https://opengameart.org/content/wizard-animated-character-isometric (CC BY 3.0)
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = 256;
const IDLE_URL =
  'https://opengameart.org/sites/default/files/2dpixx_-_free_assets_-_wizard_character_size_128x160_isometric_-_idle.png';
const WALK_URL =
  'https://opengameart.org/sites/default/files/2dpixx_-_free_assets_-_wizard_character_size_128x160_isometric_-_walk.png';

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
      if (data[8] !== 8 || data[9] !== 6) throw new Error(`need RGBA8 got ${data[8]}/${data[9]} ${w}x${h}`);
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

function crop(src, sw, x0, y0, cw, ch) {
  const out = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const si = ((y0 + y) * sw + (x0 + x)) * 4;
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

function save(action, dir, pixels) {
  const out = path.join(ROOT, 'jobs', 'mage', 'actions', `${action}_${dir}.png`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, encodePng(pixels, OUT, OUT));
  console.log('wrote', `jobs/mage/actions/${action}_${dir}.png`);
}

async function load(url) {
  console.log('downloading', url.split('/').pop());
  const bin = Buffer.from(await (await fetch(url)).arrayBuffer());
  return decodePng(bin);
}

function guessCell(w, h) {
  // Documented 128×160 frames
  if (w % 128 === 0 && h % 160 === 0) return {cw: 128, ch: 160};
  if (w % 128 === 0 && h % 128 === 0) return {cw: 128, ch: 128};
  return {cw: 128, ch: 160};
}

function opaque(sheet, row, col, cw, ch) {
  let n = 0;
  for (let y = 0; y < ch; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      const i = ((row * ch + y) * sheet.w + (col * cw + x)) * 4 + 3;
      if (sheet.pixels[i] > 20) n += 1;
    }
  }
  return n;
}

function frame(sheet, row, col, cw, ch) {
  const tile = crop(sheet.pixels, sheet.w, col * cw, row * ch, cw, ch);
  const t = trimOpaque(tile, cw, ch, 2);
  return fitCenter(t.px, t.w, t.h, OUT, OUT);
}

/** Prefer row=dir layout; fall back to col=dir. */
function mapDirs(sheet, cw, ch) {
  const cols = Math.floor(sheet.w / cw);
  const rows = Math.floor(sheet.h / ch);
  console.log('sheet', sheet.w, 'x', sheet.h, 'grid', cols, 'x', rows, 'cell', cw, ch);

  // Heuristic: isometric packs often put dirs as rows OR as columns.
  const rowScores = [];
  for (let r = 0; r < Math.min(rows, 4); r += 1) rowScores.push(opaque(sheet, r, 0, cw, ch));
  const colScores = [];
  for (let c = 0; c < Math.min(cols, 4); c += 1) colScores.push(opaque(sheet, 0, c, cw, ch));
  const rowOk = rowScores.length >= 4 && rowScores.every((s) => s > 200);
  const colOk = colScores.length >= 4 && colScores.every((s) => s > 200);

  // Common 2DPIXX: 4 rows (dirs) × N frame cols
  // Dir order often: S, W, N, E or S, E, N, W — use down,left,up,right then fix if needed.
  const DIR_ORDER = ['down', 'left', 'up', 'right'];

  if (rowOk) {
    console.log('layout: rows=dirs', rowScores);
    return DIR_ORDER.map((dir, i) => ({dir, row: i, col: 0}));
  }
  if (colOk) {
    console.log('layout: cols=dirs', colScores);
    return DIR_ORDER.map((dir, i) => ({dir, row: 0, col: i}));
  }
  // fallback: rows
  console.log('layout fallback rows', rowScores, colScores);
  return DIR_ORDER.map((dir, i) => ({dir, row: Math.min(i, rows - 1), col: 0}));
}

const idleSheet = await load(IDLE_URL);
const walkSheet = await load(WALK_URL);
const {cw, ch} = guessCell(idleSheet.w, idleSheet.h);

const idleMap = mapDirs(idleSheet, cw, ch);
const walkMap = mapDirs(walkSheet, cw, ch);

for (const {dir, row, col} of idleMap) {
  save('idle', dir, frame(idleSheet, row, col, cw, ch));
}
for (const {dir, row, col} of walkMap) {
  // prefer a mid walk frame if available
  const cols = Math.floor(walkSheet.w / cw);
  const walkCol = Math.min(col + (cols > 2 ? 1 : 0), cols - 1);
  const rollCol = Math.min(col + (cols > 3 ? 2 : 0), cols - 1);
  save('walk', dir, frame(walkSheet, row, walkCol, cw, ch));
  save('roll', dir, frame(walkSheet, row, rollCol, cw, ch));
}

for (const action of ['idle', 'walk', 'roll']) {
  fs.copyFileSync(
    path.join(ROOT, 'jobs', 'mage', 'actions', `${action}_down.png`),
    path.join(ROOT, 'jobs', 'mage', 'actions', `${action}.png`),
  );
}

fs.writeFileSync(
  path.join(ROOT, 'jobs', 'mage', 'ATTRIBUTION.txt'),
  `Mage action sprites sliced from:\n` +
    `Wizard (Animated Character | Isometric) by Jana Ochse (2D!PIXX)\n` +
    `https://opengameart.org/content/wizard-animated-character-isometric\n` +
    `License: CC BY 3.0 — attribution required.\n`,
);

// also protect mage from procedural overwrite
console.log('Done.');
