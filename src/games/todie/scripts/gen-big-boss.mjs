/**
 * Make a distinct bigBoss sprite from boss.png (crimson recolor + darker armor).
 * Run: node src/games/todie/scripts/gen-big-boss.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOBS = path.join(__dirname, '..', '..', '..', '..', 'public', 'todie', 'mobs');
const SRC = path.join(MOBS, 'boss.png');
const OUT = path.join(MOBS, 'bigBoss.png');

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
    chunk('IDAT', zlib.deflateSync(raw, {level: 6})),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}
function decodePng(buf) {
  if (buf[0] !== 137) throw new Error('not png');
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  const idats = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') idats.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('need 8-bit png');
  const inflated = zlib.inflateSync(Buffer.concat(idats));
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
  const stride = width * bpp;
  const out = new Uint8ClampedArray(width * height * 4);
  let ip = 0;
  const prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[ip++];
    const row = inflated.subarray(ip, ip + stride);
    ip += stride;
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i += 1) {
      const x = row[i];
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = x;
      if (filter === 1) v = (x + a) & 255;
      else if (filter === 2) v = (x + b) & 255;
      else if (filter === 3) v = (x + Math.floor((a + b) / 2)) & 255;
      else if (filter === 4) v = (x + paeth(a, b, c)) & 255;
      cur[i] = v;
    }
    for (let x = 0; x < width; x += 1) {
      const si = x * bpp;
      const di = (y * width + x) * 4;
      if (colorType === 6) {
        out[di] = cur[si];
        out[di + 1] = cur[si + 1];
        out[di + 2] = cur[si + 2];
        out[di + 3] = cur[si + 3];
      } else if (colorType === 2) {
        out[di] = cur[si];
        out[di + 1] = cur[si + 1];
        out[di + 2] = cur[si + 2];
        out[di + 3] = 255;
      }
    }
    cur.copy(prev);
  }
  return {width, height, pixels: out};
}

function recolorBoss(pixels) {
  const out = new Uint8ClampedArray(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    if (a < 20) {
      out[i + 3] = 0;
      continue;
    }
    // Orange / amber fur → deep crimson
    const isOrange =
      r > 140 && g > 60 && g < 200 && b < 120 && r > g && g > b * 0.9;
    // Gold / yellow trim → cold steel-violet
    const isGold = r > 160 && g > 120 && b < 100 && r + g > b * 3;
    // Bright yellow eyes → cyan-white glare
    const isEye = r > 180 && g > 160 && b < 90;
    // Skin-ish bright orange highlights
    const isBrightFur = r > 200 && g > 100 && g < 180 && b < 100;

    let nr = r;
    let ng = g;
    let nb = b;
    if (isEye) {
      nr = Math.min(255, 220 + (r - 180) * 0.2);
      ng = Math.min(255, 40 + (g - 160) * 0.1);
      nb = Math.min(255, 50 + b * 0.3);
    } else if (isGold) {
      nr = Math.round(r * 0.35 + 90);
      ng = Math.round(g * 0.25 + 40);
      nb = Math.round(b * 0.55 + 110);
    } else if (isBrightFur || isOrange) {
      // push hue toward blood red / maroon
      nr = Math.min(255, Math.round(r * 0.95 + 20));
      ng = Math.round(g * 0.28);
      nb = Math.round(b * 0.35 + 25);
    } else if (r < 60 && g < 60 && b < 70) {
      // black armor → slightly cooler / purple-black
      nr = Math.min(255, r + 18);
      ng = g;
      nb = Math.min(255, b + 28);
    }

    out[i] = nr;
    out[i + 1] = ng;
    out[i + 2] = nb;
    out[i + 3] = a;
  }
  return out;
}

if (!fs.existsSync(SRC)) {
  console.error('missing', SRC);
  process.exit(1);
}
const {width, height, pixels} = decodePng(fs.readFileSync(SRC));
const recolored = recolorBoss(pixels);
fs.writeFileSync(OUT, encodePng(recolored, width, height));
console.log('wrote', OUT);
