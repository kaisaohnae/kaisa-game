/**
 * Install Desktop rotations packs into todie job action frames (8 directions).
 * rotations1 = mage (법사), rotations2 = warrior (검사)
 * Keeps source alpha (no black chroma punch).
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = 256;

const PACKS = [
  {job: 'mage', src: 'C:/Users/kaisa/Desktop/rotations1', label: 'Desktop/rotations1 (법사)'},
  {job: 'warrior', src: 'C:/Users/kaisa/Desktop/rotations2', label: 'Desktop/rotations2 (검사)'},
];

/** game dir → desktop filename */
const DIR_MAP = {
  down: 'south.png',
  downRight: 'south-east.png',
  right: 'east.png',
  upRight: 'north-east.png',
  up: 'north.png',
  upLeft: 'north-west.png',
  left: 'west.png',
  downLeft: 'south-west.png',
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

function decodePng(buf) {
  if (buf[0] !== 137) throw new Error('not png');
  let pos = 8;
  let w = 0;
  let h = 0;
  let bitDepth = 8;
  let colorType = 6;
  const idats = [];
  let plte = null;
  let trns = null;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'PLTE') plte = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idats.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const inflated = zlib.inflateSync(Buffer.concat(idats));
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };

  let bpp;
  if (colorType === 6 && bitDepth === 8) bpp = 4;
  else if (colorType === 2 && bitDepth === 8) bpp = 3;
  else if (colorType === 3 && bitDepth === 8) bpp = 1;
  else if (colorType === 4 && bitDepth === 8) bpp = 2;
  else throw new Error(`unsupported png ct=${colorType} bit=${bitDepth} ${w}x${h}`);

  const stride = w * bpp + 1;
  const rawRows = [];
  let prev = new Uint8Array(w * bpp);
  for (let y = 0; y < h; y += 1) {
    const filter = inflated[y * stride];
    const row = inflated.subarray(y * stride + 1, y * stride + 1 + w * bpp);
    const cur = new Uint8Array(w * bpp);
    for (let i = 0; i < w * bpp; i += 1) {
      const x = row[i];
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let val = x;
      if (filter === 1) val = (x + a) & 255;
      else if (filter === 2) val = (x + b) & 255;
      else if (filter === 3) val = (x + ((a + b) >> 1)) & 255;
      else if (filter === 4) val = (x + paeth(a, b, c)) & 255;
      else if (filter !== 0) throw new Error(`png filter ${filter}`);
      cur[i] = val;
    }
    rawRows.push(cur);
    prev = cur;
  }

  const pixels = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    const row = rawRows[y];
    for (let x = 0; x < w; x += 1) {
      const di = (y * w + x) * 4;
      if (colorType === 6) {
        const si = x * 4;
        pixels[di] = row[si];
        pixels[di + 1] = row[si + 1];
        pixels[di + 2] = row[si + 2];
        pixels[di + 3] = row[si + 3];
      } else if (colorType === 2) {
        const si = x * 3;
        pixels[di] = row[si];
        pixels[di + 1] = row[si + 1];
        pixels[di + 2] = row[si + 2];
        pixels[di + 3] = 255;
      } else if (colorType === 4) {
        const si = x * 2;
        pixels[di] = row[si];
        pixels[di + 1] = row[si];
        pixels[di + 2] = row[si];
        pixels[di + 3] = row[si + 1];
      } else if (colorType === 3) {
        const idx = row[x];
        pixels[di] = plte[idx * 3];
        pixels[di + 1] = plte[idx * 3 + 1];
        pixels[di + 2] = plte[idx * 3 + 2];
        pixels[di + 3] = trns && idx < trns.length ? trns[idx] : 255;
      }
    }
  }
  return {w, h, pixels};
}

function trimOpaque(px, w, h, pad = 1) {
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
  const out = new Uint8ClampedArray(nw * nh * 4);
  for (let y = 0; y < nh; y += 1) {
    for (let x = 0; x < nw; x += 1) {
      const si = ((minY + y) * w + (minX + x)) * 4;
      const di = (y * nw + x) * 4;
      out[di] = px[si];
      out[di + 1] = px[si + 1];
      out[di + 2] = px[si + 2];
      out[di + 3] = px[si + 3];
    }
  }
  return {px: out, w: nw, h: nh};
}

function nearestFit(src, sw, sh, dw, dh) {
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

function processFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const {w, h, pixels} = decodePng(buf);
  const t = trimOpaque(pixels, w, h, 1);
  return nearestFit(t.px, t.w, t.h, OUT, OUT);
}

for (const pack of PACKS) {
  if (!fs.existsSync(pack.src)) throw new Error(`missing ${pack.src}`);
  const outDir = path.join(ROOT, 'jobs', pack.job, 'actions');
  fs.mkdirSync(outDir, {recursive: true});

  for (const [dir, file] of Object.entries(DIR_MAP)) {
    const src = path.join(pack.src, file);
    if (!fs.existsSync(src)) throw new Error(`missing ${src}`);
    const px = processFile(src);
    for (const action of ['idle', 'walk', 'roll']) {
      const out = path.join(outDir, `${action}_${dir}.png`);
      fs.writeFileSync(out, encodePng(px, OUT, OUT));
      console.log('wrote', pack.job, `${action}_${dir}.png`);
    }
  }

  for (const action of ['idle', 'walk', 'roll']) {
    fs.copyFileSync(path.join(outDir, `${action}_down.png`), path.join(outDir, `${action}.png`));
  }

  fs.writeFileSync(
    path.join(ROOT, 'jobs', pack.job, 'ATTRIBUTION.txt'),
    `${pack.job} 8-dir sprites from:\n${pack.label}\n` +
      `south→down, south-east→downRight, east→right, north-east→upRight,\n` +
      `north→up, north-west→upLeft, west→left, south-west→downLeft\n`,
  );
}

console.log('Done. 8-dir mage/warrior installed.');
