/**
 * Install AI-painted bodies/items into todie paths + punch dark backgrounds to alpha.
 * Uses only Node zlib + manual PNG decode (no deps).
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, '..', '..', '..', 'public', 'todie');
const ASSETS = path.join(
  'C:/Users/kaisa/.cursor/projects/d-workspace-kaisa-kaisa-logger/assets',
);
const OUT = 256;

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
  const cur = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[ip++];
    inflated.copy(cur, 0, ip, ip + stride);
    ip += stride;
    for (let i = 0; i < stride; i += 1) {
      const x = cur[i];
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = x;
      if (filter === 1) v = (x + a) & 255;
      else if (filter === 2) v = (x + b) & 255;
      else if (filter === 3) v = (x + ((a + b) >> 1)) & 255;
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
      } else if (colorType === 0) {
        out[di] = out[di + 1] = out[di + 2] = cur[si];
        out[di + 3] = 255;
      } else if (colorType === 4) {
        out[di] = out[di + 1] = out[di + 2] = cur[si];
        out[di + 3] = cur[si + 1];
      }
    }
    cur.copy(prev);
  }
  return {width, height, pixels: out};
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Magenta / green-screen / near-black → alpha (gray checker only via edge grow) */
function isHardKey(r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const chroma = mx - mn;
  const lum = luminance(r, g, b);
  if (r > 150 && b > 150 && g < 150 && r + b > g * 2.2) return true;
  if (g > 180 && r < 100 && b < 100 && g > r + 50 && g > b + 50) return true;
  if (lum < 38 && chroma < 34) return true;
  return false;
}

function isGrayFringe(r, g, b) {
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const lum = luminance(r, g, b);
  return chroma < 24 && lum >= 38 && lum <= 210;
}

function punchBg(pixels, w, h) {
  for (let i = 0; i < w * h; i += 1) {
    const o = i * 4;
    if (pixels[o + 3] < 8) continue;
    if (isHardKey(pixels[o], pixels[o + 1], pixels[o + 2])) {
      pixels[o + 3] = 0;
    }
  }

  // Grow transparency into gray checker / residual key only where touching alpha
  for (let iter = 0; iter < 10; iter += 1) {
    const kill = [];
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = y * w + x;
        const o = i * 4;
        if (pixels[o + 3] < 8) continue;
        const r = pixels[o];
        const g = pixels[o + 1];
        const b = pixels[o + 2];
        if (!isHardKey(r, g, b) && !isGrayFringe(r, g, b)) continue;
        let touch = false;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
            touch = true;
            break;
          }
          if (pixels[(ny * w + nx) * 4 + 3] < 8) {
            touch = true;
            break;
          }
        }
        if (touch) kill.push(o);
      }
    }
    if (!kill.length) break;
    for (const o of kill) pixels[o + 3] = 0;
  }

  // despill magenta on soft edges
  for (let i = 0; i < w * h; i += 1) {
    const o = i * 4;
    const a = pixels[o + 3];
    if (a < 8 || a > 250) continue;
    const r = pixels[o];
    const g = pixels[o + 1];
    const b = pixels[o + 2];
    if (r > 140 && b > 140 && g < 160) {
      const spill = Math.min(r, b) - g;
      if (spill > 10) {
        pixels[o] = Math.max(0, r - spill);
        pixels[o + 2] = Math.max(0, b - spill);
      }
    }
  }
}

/** remove cyan/blue staff blob on mage right side */
function eraseStaff(pixels, w, h) {
  for (let y = 0; y < h; y += 1) {
    for (let x = Math.floor(w * 0.58); x < w; x += 1) {
      const o = (y * w + x) * 4;
      const r = pixels[o];
      const g = pixels[o + 1];
      const b = pixels[o + 2];
      if (pixels[o + 3] < 8) continue;
      if (b > 140 && g > 100 && b > r + 30 && y < h * 0.78) {
        pixels[o + 3] = 0;
      } else if (b > 90 && g > 70 && r < 90 && b > r + 20 && x > w * 0.7) {
        pixels[o + 3] = 0;
      }
    }
  }
}

function resizeNearest(src, sw, sh, dw, dh) {
  const out = new Uint8ClampedArray(dw * dh * 4);
  for (let y = 0; y < dh; y += 1) {
    const sy = Math.min(sh - 1, Math.floor((y / dh) * sh));
    for (let x = 0; x < dw; x += 1) {
      const sx = Math.min(sw - 1, Math.floor((x / dw) * sw));
      const si = (sy * sw + sx) * 4;
      const di = (y * dw + x) * 4;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
      out[di + 3] = src[si + 3];
    }
  }
  return out;
}

/** bilinear-ish soft resize for nicer HQ */
function resizeSoft(src, sw, sh, dw, dh) {
  const out = new Uint8ClampedArray(dw * dh * 4);
  for (let y = 0; y < dh; y += 1) {
    const fy = ((y + 0.5) / dh) * sh - 0.5;
    const y0 = Math.max(0, Math.floor(fy));
    const y1 = Math.min(sh - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < dw; x += 1) {
      const fx = ((x + 0.5) / dw) * sw - 0.5;
      const x0 = Math.max(0, Math.floor(fx));
      const x1 = Math.min(sw - 1, x0 + 1);
      const tx = fx - x0;
      const di = (y * dw + x) * 4;
      for (let c = 0; c < 4; c += 1) {
        const v00 = src[(y0 * sw + x0) * 4 + c];
        const v10 = src[(y0 * sw + x1) * 4 + c];
        const v01 = src[(y1 * sw + x0) * 4 + c];
        const v11 = src[(y1 * sw + x1) * 4 + c];
        const v0 = v00 * (1 - tx) + v10 * tx;
        const v1 = v01 * (1 - tx) + v11 * tx;
        out[di + c] = Math.round(v0 * (1 - ty) + v1 * ty);
      }
    }
  }
  return out;
}

function processBody(srcName, {eraseStaffFlag = false} = {}) {
  const buf = fs.readFileSync(path.join(ASSETS, srcName));
  const {width, height, pixels} = decodePng(buf);
  punchBg(pixels, width, height);
  if (eraseStaffFlag) eraseStaff(pixels, width, height);
  return resizeSoft(pixels, width, height, OUT, OUT);
}

function processIcon(srcName) {
  const buf = fs.readFileSync(path.join(ASSETS, srcName));
  const {width, height, pixels} = decodePng(buf);
  punchBg(pixels, width, height);
  return resizeSoft(pixels, width, height, OUT, OUT);
}

function saveJob(job, action, px) {
  const out = path.join(ROOT, 'jobs', job, 'actions', `${action}.png`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, encodePng(px, OUT, OUT));
  console.log('body', job, action);
}

function saveItem(name, px) {
  const out = path.join(PUBLIC, 'items', `${name}.png`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, encodePng(px, OUT, OUT));
  console.log('item', name);
}

function nudge(px, dy) {
  const out = new Uint8ClampedArray(OUT * OUT * 4);
  for (let y = 0; y < OUT; y += 1) {
    const sy = y - dy;
    if (sy < 0 || sy >= OUT) continue;
    out.set(px.subarray(sy * OUT * 4, (sy + 1) * OUT * 4), y * OUT * 4);
  }
  return out;
}

console.log('Installing painted HQ art (v2, chroma key)…');
const warrior = processBody('warrior-v2.png');
saveJob('warrior', 'idle', warrior);
saveJob('warrior', 'walk', nudge(warrior, 4));
saveJob('warrior', 'roll', nudge(warrior, -3));

const mage = processBody('mage-v2.png');
saveJob('mage', 'idle', mage);
saveJob('mage', 'walk', nudge(mage, 4));
saveJob('mage', 'roll', nudge(mage, -3));

saveItem('potion', processIcon('potion-v2.png'));
saveItem('mana', processIcon('mana-v2.png'));

function saveMob(name, px) {
  const out = path.join(PUBLIC, 'mobs', `${name}.png`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, encodePng(px, OUT, OUT));
  console.log('mob', name);
}

const mobFiles = [
  ['slime', 'slime-v2.png'],
  ['bat', 'bat-v2.png'],
  ['block', 'block-v2.png'],
  ['boss', 'boss-v2.png'],
  ['slime_elite', 'slime-elite-v2.png'],
  ['bat_elite', 'bat-elite-v2.png'],
  ['block_elite', 'block-elite-v2.png'],
];
for (const [id, file] of mobFiles) {
  if (!fs.existsSync(path.join(ASSETS, file))) {
    console.warn('missing mob source', file);
    continue;
  }
  saveMob(id, processIcon(file));
}

console.log('Done bodies + consumables + mobs.');
