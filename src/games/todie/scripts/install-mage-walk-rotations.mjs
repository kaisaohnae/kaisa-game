/**
 * Install PixelLab action rotations for a todie job (8 directions).
 * Only updates the given action frames — other actions are untouched.
 *
 * Run:
 *   npm run todie:install-mage-walk
 *   npm run todie:install-warrior-walk
 *   npm run todie:install-mage-attack
 *   npm run todie:install-warrior-attack
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = 256;

const DEFAULT_SRC = {
  walk: {
    mage: 'C:/Users/kaisa/Desktop/케릭터/0ad17b16-ffef-4435-a785-3ae6d9235ef6-0ad17b16/0ad17b16/rotations',
    warrior:
      'C:/Users/kaisa/Desktop/케릭터/16c3fd35-4d06-4fa3-881b-a0ec311917ee-16c3fd35/16c3fd35/rotations',
  },
  attack: {
    mage: 'C:/Users/kaisa/Desktop/케릭터/bf21e19b-7d24-4ba3-870c-92b4f3cb8398-bf21e19b/bf21e19b/rotations',
    warrior:
      'C:/Users/kaisa/Desktop/케릭터/fbe9029c-7ec3-4558-8def-84162cdb5528-fbe9029c/fbe9029c/rotations',
  },
};

const ACTION = process.argv[2] ?? 'walk';
const JOB = process.argv[3] ?? 'mage';
const SRC = process.argv[4] ?? DEFAULT_SRC[ACTION]?.[JOB];
if (!SRC) throw new Error(`unknown ${ACTION}/${JOB} — check DEFAULT_SRC`);

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

function isGif(buf) {
  const sig = buf.toString('ascii', 0, 6);
  return sig === 'GIF87a' || sig === 'GIF89a';
}

function decodeGif(buf) {
  const bytes = new Uint8Array(buf);
  let pos = 0;
  const readByte = () => bytes[pos++];
  const readSubBlocks = () => {
    const out = [];
    while (true) {
      const size = readByte();
      if (size === 0) break;
      out.push(...bytes.slice(pos, pos + size));
      pos += size;
    }
    return out;
  };

  const header = String.fromCharCode(...bytes.slice(0, 6));
  if (header !== 'GIF87a' && header !== 'GIF89a') throw new Error('not gif');
  pos = 6;
  const width = bytes[pos] | (bytes[pos + 1] << 8);
  pos += 2;
  const height = bytes[pos] | (bytes[pos + 1] << 8);
  pos += 2;
  const packed = readByte();
  const gctFlag = (packed & 0x80) !== 0;
  const gctSize = packed & 0x07;
  readByte(); // bg
  readByte(); // aspect

  let gct = null;
  if (gctFlag) {
    const len = 3 * (2 ** (gctSize + 1));
    gct = bytes.slice(pos, pos + len);
    pos += len;
  }

  const canvas = new Uint8ClampedArray(width * height * 4);
  const frames = [];
  let transparentIndex = -1;
  let disposal = 0;
  let delay = 10;

  const colorAt = (table, idx) => [
    table[idx * 3],
    table[idx * 3 + 1],
    table[idx * 3 + 2],
    idx === transparentIndex ? 0 : 255,
  ];

  const lzwDecode = (minCodeSize, data) => {
    const clearCode = 1 << minCodeSize;
    const endCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let mask = (1 << codeSize) - 1;
    const dict = [];
    for (let i = 0; i < clearCode; i += 1) dict[i] = [i];
    dict[clearCode] = [];
    dict[endCode] = [];
    let nextCode = endCode + 1;
    let bitPos = 0;
    let bytePos = 0;
    const readCode = () => {
      let code = 0;
      let bits = 0;
      while (bits < codeSize) {
        if (bytePos >= data.length) return endCode;
        const b = data[bytePos++];
        code |= (b & 0xff) << bits;
        bits += 8;
      }
      return code & mask;
    };

    const out = [];
    let prev = null;
    while (true) {
      const code = readCode();
      if (code === endCode) break;
      if (code === clearCode) {
        dict.length = endCode + 1;
        nextCode = endCode + 1;
        codeSize = minCodeSize + 1;
        mask = (1 << codeSize) - 1;
        prev = null;
        continue;
      }
      let entry;
      if (code < dict.length && dict[code]) entry = dict[code].slice();
      else if (code === nextCode && prev) entry = prev.concat(prev[0]);
      else break;
      out.push(...entry);
      if (prev && nextCode < 4096) {
        dict[nextCode++] = prev.concat(entry[0]);
        if (nextCode > mask && codeSize < 12) {
          codeSize += 1;
          mask = (1 << codeSize) - 1;
        }
      }
      prev = entry;
    }
    return out;
  };

  while (pos < bytes.length) {
    const block = readByte();
    if (block === 0x3b) break;
    if (block === 0x21) {
      const ext = readByte();
      if (ext === 0xf9) {
        readByte();
        const gce = readByte();
        delay = bytes[pos] | (bytes[pos + 1] << 8);
        pos += 2;
        transparentIndex = (gce & 0x01) ? readByte() : readByte();
        if (!(gce & 0x01)) transparentIndex = -1;
        readByte();
      } else {
        readSubBlocks();
      }
    } else if (block === 0x2c) {
      const left = bytes[pos] | (bytes[pos + 1] << 8);
      pos += 2;
      const top = bytes[pos] | (bytes[pos + 1] << 8);
      pos += 2;
      const fw = bytes[pos] | (bytes[pos + 1] << 8);
      pos += 2;
      const fh = bytes[pos] | (bytes[pos + 1] << 8);
      pos += 2;
      const ipacked = readByte();
      const lctFlag = (ipacked & 0x80) !== 0;
      const interlace = (ipacked & 0x40) !== 0;
      let lct = gct;
      if (lctFlag) {
        const len = 3 * (2 ** ((ipacked & 0x07) + 1));
        lct = bytes.slice(pos, pos + len);
        pos += len;
      }
      const minCodeSize = readByte();
      const data = readSubBlocks();
      const indices = lzwDecode(minCodeSize, data);

      if (disposal === 2) {
        canvas.fill(0);
      }

      const framePx = new Uint8ClampedArray(width * height * 4);
      framePx.set(canvas);
      let idx = 0;
      for (let y = 0; y < fh; y += 1) {
        const yy = interlace
          ? [0, 4, 2, 1][Math.floor(y / (fh / 4))] + (y % Math.ceil(fh / 4)) * 8
          : y;
        if (yy >= fh) continue;
        for (let x = 0; x < fw; x += 1) {
          const ci = indices[idx++];
          const rgba = colorAt(lct, ci);
          const cx = left + x;
          const cy = top + yy;
          if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
          const di = (cy * width + cx) * 4;
          if (rgba[3] === 0) continue;
          framePx[di] = rgba[0];
          framePx[di + 1] = rgba[1];
          framePx[di + 2] = rgba[2];
          framePx[di + 3] = rgba[3];
          canvas[di] = rgba[0];
          canvas[di + 1] = rgba[1];
          canvas[di + 2] = rgba[2];
          canvas[di + 3] = rgba[3];
        }
      }
      frames.push({w: width, h: height, pixels: framePx, delay});
      disposal = 0;
      transparentIndex = -1;
    } else {
      throw new Error(`unknown gif block 0x${block.toString(16)} at ${pos}`);
    }
  }
  return frames;
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

function processFramePixels(pixels, w, h) {
  const t = trimOpaque(pixels, w, h, 1);
  return nearestFit(t.px, t.w, t.h, OUT, OUT);
}

function loadFrames(filePath) {
  const buf = fs.readFileSync(filePath);
  if (isGif(buf)) {
    const frames = decodeGif(buf);
    if (!frames.length) throw new Error(`no gif frames in ${filePath}`);
    return frames.map((f) => processFramePixels(f.pixels, f.w, f.h));
  }
  const {w, h, pixels} = decodePng(buf);
  return [processFramePixels(pixels, w, h)];
}

function concatHorizontal(frames) {
  const w = OUT * frames.length;
  const out = new Uint8ClampedArray(w * OUT * 4);
  for (let i = 0; i < frames.length; i += 1) {
    const frame = frames[i];
    for (let y = 0; y < OUT; y += 1) {
      for (let x = 0; x < OUT; x += 1) {
        const si = (y * OUT + x) * 4;
        const di = (y * w + (i * OUT + x)) * 4;
        out[di] = frame[si];
        out[di + 1] = frame[si + 1];
        out[di + 2] = frame[si + 2];
        out[di + 3] = frame[si + 3];
      }
    }
  }
  return {pixels: out, w, h: OUT, frameCount: frames.length};
}

if (!fs.existsSync(SRC)) throw new Error(`missing ${SRC}`);

const outDir = path.join(ROOT, 'jobs', JOB, 'actions');
fs.mkdirSync(outDir, {recursive: true});

let maxFrames = 1;
for (const [dir, file] of Object.entries(DIR_MAP)) {
  const src = path.join(SRC, file);
  if (!fs.existsSync(src)) throw new Error(`missing ${src}`);
  const framePx = loadFrames(src);
  maxFrames = Math.max(maxFrames, framePx.length);
  const sheet = concatHorizontal(framePx);
  const out = path.join(outDir, `${ACTION}_${dir}.png`);
  fs.writeFileSync(out, encodePng(sheet.pixels, sheet.w, sheet.h));
  console.log(`wrote ${JOB} ${ACTION}_${dir}.png (${sheet.frameCount} frames, ${sheet.w}x${sheet.h})`);
}

fs.copyFileSync(path.join(outDir, `${ACTION}_down.png`), path.join(outDir, `${ACTION}.png`));

const attrPath = path.join(ROOT, 'jobs', JOB, 'ATTRIBUTION.txt');
const walkNote =
  `${JOB} ${ACTION} 8-dir sprites from:\nPixelLab export ${SRC}\n` +
  `${maxFrames} frame(s) per direction (horizontal sheet)\n`;
if (fs.existsSync(attrPath)) {
  const prev = fs.readFileSync(attrPath, 'utf8');
  if (!prev.includes(`${JOB} ${ACTION} 8-dir`)) {
    fs.writeFileSync(attrPath, `${prev.trim()}\n\n${walkNote}`);
  }
} else {
  fs.writeFileSync(attrPath, walkNote);
}

console.log(`Done. ${JOB} ${ACTION} installed (${maxFrames} frames/dir).`);
