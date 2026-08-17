/**
 * Todie HQ soft-shaded art (256² PNG, not pixel)
 * - jobs/<job>/actions : underwear body
 * - jobs/<job>/skills : FX
 * - public/todie/gear/<job>/<tier>/<id>.png : wear + inventory
 * - public/todie/items/*.png
 * Run: npm run todie:sprites
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, '..', '..', '..', 'public', 'todie');
const SIZE = 256;
/** map old 48-space → 256 */
const U = SIZE / 48;

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
  const i = (y * SIZE + x) * 4;
  const da = a / 255;
  const oa = px[i + 3] / 255;
  const outA = da + oa * (1 - da);
  if (outA <= 0) return;
  px[i] = Math.round((r * da + px[i] * oa * (1 - da)) / outA);
  px[i + 1] = Math.round((g * da + px[i + 1] * oa * (1 - da)) / outA);
  px[i + 2] = Math.round((b * da + px[i + 2] * oa * (1 - da)) / outA);
  px[i + 3] = Math.round(outA * 255);
}

function softEllipse(px, cx, cy, rx, ry, rgba, soft = 0.12) {
  const [r, g, b, a] = rgba;
  const pad = Math.ceil(Math.max(rx, ry) * (1 + soft) + 2);
  const x0 = Math.max(0, Math.floor(cx - pad));
  const y0 = Math.max(0, Math.floor(cy - pad));
  const x1 = Math.min(SIZE - 1, Math.ceil(cx + pad));
  const y1 = Math.min(SIZE - 1, Math.ceil(cy + pad));
  const softIn = 1 - soft;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const d = Math.sqrt(nx * nx + ny * ny);
      if (d > 1 + soft) continue;
      let cov = 1;
      if (d > softIn) cov = 1 - (d - softIn) / (soft + 0.0001);
      if (cov <= 0) continue;
      blend(px, x, y, r, g, b, a * cov);
    }
  }
}

function softCapsule(px, x0, y0, x1, y1, rad, rgba, soft = 0.12) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const pad = rad * (1 + soft) + 2;
  const minX = Math.max(0, Math.floor(Math.min(x0, x1) - pad));
  const maxX = Math.min(SIZE - 1, Math.ceil(Math.max(x0, x1) + pad));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1) - pad));
  const maxY = Math.min(SIZE - 1, Math.ceil(Math.max(y0, y1) + pad));
  const [r, g, b, a] = rgba;
  const softIn = rad * (1 - soft);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const vx = x - x0;
      const vy = y - y0;
      let t = vx * ux + vy * uy;
      t = Math.max(0, Math.min(len, t));
      const px_ = x0 + ux * t;
      const py_ = y0 + uy * t;
      const d = Math.hypot(x - px_, y - py_);
      if (d > rad * (1 + soft)) continue;
      let cov = 1;
      if (d > softIn) cov = 1 - (d - softIn) / (rad * soft + 0.0001);
      if (cov <= 0) continue;
      blend(px, x, y, r, g, b, a * cov);
    }
  }
}

function glow(px, cx, cy, r, rgba) {
  softEllipse(px, cx, cy, r, r, rgba, 0.85);
}

/** dark ink outline around opaque pixels */
function strokeOutline(px, rgba = [35, 28, 24, 220], width = 2) {
  const out = blank();
  out.set(px);
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
          const ni = (ny * SIZE + nx) * 4;
          if (px[ni + 3] < 40) blend(out, nx, ny, r, g, b, a);
        }
      }
    }
  }
  // redraw fill on top
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;
    const x = (i / 4) % SIZE;
    const y = Math.floor(i / 4 / SIZE);
    blend(out, x, y, px[i], px[i + 1], px[i + 2], px[i + 3]);
  }
  return out;
}

function shadeBody(px, cx, cy, rx, ry, base, mid, hi) {
  softEllipse(px, cx + rx * 0.08, cy + ry * 0.12, rx * 1.05, ry * 1.05, base, 0.28);
  softEllipse(px, cx, cy, rx, ry, mid, 0.2);
  softEllipse(px, cx - rx * 0.28, cy - ry * 0.32, rx * 0.55, ry * 0.45, hi, 0.35);
}

function saveRel(rel, px) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, encodePng(px));
  console.log('wrote', rel);
}

function savePublic(rel, px) {
  const out = path.join(PUBLIC, rel);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, encodePng(px));
  console.log('wrote public/todie/' + rel);
}

function bodyBase({pant, leg = 0, roll = false}) {
  const px = blank();
  const cy = 24 * U + leg * U;
  const skin = hex('#f0c2a0');
  const skinD = hex('#d49a78');
  const skinH = hex('#ffe0c8');
  const hair = hex('#3d2a1f');
  const pantC = pant;
  const pantD = pant.map((v, i) => (i < 3 ? Math.max(0, v - 40) : v));

  // soft ground shadow
  softEllipse(px, 23 * U, 38 * U, 11 * U, 3.2 * U, hex('#000000', 0.22), 0.6);

  // legs
  shadeBody(px, 19 * U, cy + 9 * U, 3.2 * U, 5.5 * U, skinD, skin, skinH);
  shadeBody(px, 27 * U, cy + 9 * U, 3.2 * U, 5.5 * U, skinD, skin, skinH);

  // pants
  shadeBody(px, 23 * U, cy + 4.5 * U, 9 * U, 5.5 * U, pantD, pantC, hex('#ffffff', 0.35));

  // torso (underwear)
  shadeBody(px, 23 * U, cy + 0.5 * U, 8.5 * U, 6.5 * U, skinD, skin, skinH);
  softEllipse(px, 23 * U, cy - 0.5 * U, 6 * U, 2.2 * U, hex('#ffffff', 0.28), 0.4);

  // arms
  shadeBody(px, 13.5 * U, cy - 1 * U, 3.4 * U, 6.2 * U, skinD, skin, skinH);
  shadeBody(px, 32.5 * U, cy - 1 * U, 3.4 * U, 6.2 * U, skinD, skin, skinH);

  // head
  shadeBody(px, 23 * U, cy - 12 * U, 8.2 * U, 7.6 * U, skinD, skin, skinH);
  softEllipse(px, 20.2 * U, cy - 13.2 * U, 1.3 * U, 1.6 * U, hex('#2b211c'), 0.25);
  softEllipse(px, 25.8 * U, cy - 13.2 * U, 1.3 * U, 1.6 * U, hex('#2b211c'), 0.25);
  softEllipse(px, 20 * U, cy - 13.6 * U, 0.45 * U, 0.45 * U, hex('#ffffff'), 0.2);
  softEllipse(px, 25.6 * U, cy - 13.6 * U, 0.45 * U, 0.45 * U, hex('#ffffff'), 0.2);
  softEllipse(px, 23 * U, cy - 10.2 * U, 1.6 * U, 0.9 * U, hex('#e89a8a', 0.7), 0.35);

  // hair
  softEllipse(px, 23 * U, cy - 17.5 * U, 8 * U, 4.2 * U, hair, 0.25);
  softEllipse(px, 18 * U, cy - 15 * U, 2.4 * U, 3.5 * U, hair, 0.3);
  softEllipse(px, 28 * U, cy - 15 * U, 2.4 * U, 3.5 * U, hair, 0.3);
  softEllipse(px, 21 * U, cy - 18.5 * U, 3 * U, 1.6 * U, hex('#5a4030'), 0.35);

  if (roll) {
    for (let a = 0; a < 18; a += 1) {
      const ang = (a / 18) * Math.PI * 2;
      softEllipse(
        px,
        23 * U + Math.cos(ang) * 18 * U,
        24 * U + Math.sin(ang) * 18 * U,
        1.6 * U,
        1.6 * U,
        hex('#ffcc80', 0.55),
        0.5,
      );
    }
  }
  return px;
}

function wearStick() {
  const px = blank();
  softCapsule(px, 35.5 * U, 10 * U, 36.5 * U, 32 * U, 2.2 * U, hex('#8d5a2b'));
  softCapsule(px, 35.5 * U, 10 * U, 36.5 * U, 32 * U, 1.4 * U, hex('#c4894a'));
  softEllipse(px, 36 * U, 11 * U, 1.8 * U, 1.8 * U, hex('#e8b878'), 0.3);
  softEllipse(px, 36 * U, 30 * U, 2 * U, 1.4 * U, hex('#6d4220'), 0.3);
  return px;
}

function wearSword({hero = false} = {}) {
  const px = blank();
  const blade = hero ? hex('#ffe082') : hex('#e8eef5');
  const edge = hero ? hex('#ff9800') : hex('#90a4ae');
  softCapsule(px, 36 * U, 5 * U, 36 * U, 28 * U, 2.6 * U, edge);
  softCapsule(px, 36 * U, 5 * U, 36 * U, 28 * U, 1.6 * U, blade);
  softEllipse(px, 36 * U, 6.5 * U, 2.2 * U, 2.8 * U, hex('#ffffff', 0.85), 0.35);
  softCapsule(px, 32 * U, 27 * U, 40 * U, 27 * U, 1.8 * U, hex('#6d4c41'));
  softCapsule(px, 32 * U, 27 * U, 40 * U, 27 * U, 1.1 * U, hex('#a1887f'));
  softCapsule(px, 36 * U, 28 * U, 36 * U, 34 * U, 1.5 * U, hex('#5d4037'));
  if (hero) {
    glow(px, 36 * U, 10 * U, 6 * U, hex('#ff6d00', 0.35));
    softEllipse(px, 36 * U, 8 * U, 2.2 * U, 2.2 * U, hex('#ffd54f'), 0.25);
  }
  return px;
}

function wearStaff({hero = false, crystal = false} = {}) {
  const px = blank();
  softCapsule(px, 36 * U, 14 * U, 36 * U, 34 * U, 2 * U, hex('#6d4c41'));
  softCapsule(px, 36 * U, 14 * U, 36 * U, 34 * U, 1.2 * U, hex('#a1887f'));
  const gem = hero ? hex('#ff9100') : crystal ? hex('#4fc3f7') : hex('#80deea');
  glow(px, 36 * U, 9 * U, hero ? 9 * U : 7 * U, [...gem.slice(0, 3), 90]);
  softEllipse(px, 36 * U, 9 * U, 4.5 * U, 4.5 * U, gem, 0.22);
  softEllipse(px, 34.5 * U, 7.5 * U, 1.6 * U, 1.6 * U, hex('#ffffff', 0.9), 0.3);
  return px;
}

function wearHead(kind) {
  const px = blank();
  if (kind === 'cloth') {
    softEllipse(px, 23 * U, 8.5 * U, 9 * U, 4.5 * U, hex('#78909c'), 0.25);
    softEllipse(px, 23 * U, 7.5 * U, 8 * U, 3.2 * U, hex('#b0bec5'), 0.25);
    softEllipse(px, 20 * U, 6.5 * U, 3 * U, 1.4 * U, hex('#eceff1', 0.7), 0.4);
  } else if (kind === 'cap') {
    softEllipse(px, 23 * U, 8 * U, 8.5 * U, 4.2 * U, hex('#7e57c2'), 0.25);
    softEllipse(px, 23 * U, 7 * U, 7.5 * U, 3 * U, hex('#b39ddb'), 0.25);
    softEllipse(px, 29 * U, 10 * U, 3.5 * U, 1.5 * U, hex('#9575cd'), 0.35);
  } else if (kind === 'helm') {
    softEllipse(px, 23 * U, 9 * U, 9 * U, 6.5 * U, hex('#546e7a'), 0.22);
    softEllipse(px, 23 * U, 8 * U, 8 * U, 5.5 * U, hex('#90a4ae'), 0.2);
    softCapsule(px, 16 * U, 10 * U, 30 * U, 10 * U, 1.2 * U, hex('#37474f'));
    softEllipse(px, 23 * U, 4.5 * U, 3.2 * U, 2.4 * U, hex('#5c6bc0'), 0.25);
    softEllipse(px, 21 * U, 7 * U, 2.5 * U, 1.2 * U, hex('#cfd8dc', 0.75), 0.4);
  } else if (kind === 'hat') {
    softEllipse(px, 23 * U, 12 * U, 13 * U, 3.5 * U, hex('#4527a0'), 0.3);
    softEllipse(px, 23 * U, 6 * U, 5.5 * U, 7 * U, hex('#7e57c2'), 0.22);
    softEllipse(px, 23 * U, 2.5 * U, 1.8 * U, 1.8 * U, hex('#ce93d8'), 0.25);
    softEllipse(px, 21 * U, 5 * U, 2.2 * U, 2 * U, hex('#b39ddb', 0.7), 0.4);
  } else if (kind === 'crown') {
    softCapsule(px, 15 * U, 9 * U, 31 * U, 9 * U, 2.4 * U, hex('#ef6c00'));
    softCapsule(px, 15 * U, 9 * U, 31 * U, 9 * U, 1.5 * U, hex('#ffd54f'));
    softEllipse(px, 17 * U, 5.5 * U, 2 * U, 2.6 * U, hex('#ffca28'), 0.25);
    softEllipse(px, 23 * U, 4 * U, 2.4 * U, 3.2 * U, hex('#fff59d'), 0.25);
    softEllipse(px, 29 * U, 5.5 * U, 2 * U, 2.6 * U, hex('#ffca28'), 0.25);
    glow(px, 23 * U, 7 * U, 8 * U, hex('#ff6d00', 0.28));
  } else if (kind === 'circlet') {
    softCapsule(px, 15 * U, 9 * U, 31 * U, 9 * U, 1.6 * U, hex('#ce93d8'));
    softEllipse(px, 23 * U, 7 * U, 2.8 * U, 2.8 * U, hex('#80deea'), 0.22);
    softEllipse(px, 22 * U, 6 * U, 1 * U, 1 * U, hex('#ffffff'), 0.25);
    glow(px, 23 * U, 7 * U, 6 * U, hex('#80deea', 0.3));
  }
  return px;
}

function wearArmor(kind) {
  const px = blank();
  if (kind === 'ragged') {
    shadeBody(px, 23 * U, 20 * U, 10 * U, 8 * U, hex('#5d4037'), hex('#8d6e63'), hex('#bcaaa4'));
  } else if (kind === 'blue') {
    shadeBody(px, 23 * U, 20 * U, 10.5 * U, 8.5 * U, hex('#3949ab'), hex('#5c6bc0'), hex('#9fa8da'));
    softEllipse(px, 23 * U, 16 * U, 6 * U, 2 * U, hex('#e8eaf6', 0.75), 0.4);
  } else if (kind === 'plain') {
    shadeBody(px, 23 * U, 21 * U, 10.5 * U, 9.5 * U, hex('#6a1b9a'), hex('#9575cd'), hex('#ce93d8'));
  } else if (kind === 'arcane') {
    shadeBody(px, 23 * U, 21 * U, 11 * U, 10 * U, hex('#311b92'), hex('#5e35b1'), hex('#b39ddb'));
    softEllipse(px, 23 * U, 18 * U, 3 * U, 3 * U, hex('#80deea', 0.85), 0.3);
    glow(px, 23 * U, 18 * U, 5 * U, hex('#80deea', 0.25));
  } else if (kind === 'hero_plate') {
    shadeBody(px, 23 * U, 20 * U, 11 * U, 9 * U, hex('#bf360c'), hex('#ef6c00'), hex('#ffcc80'));
    softCapsule(px, 17 * U, 15 * U, 29 * U, 15 * U, 1.4 * U, hex('#ffd54f'));
    glow(px, 23 * U, 18 * U, 8 * U, hex('#ff6d00', 0.3));
  } else if (kind === 'hero_robe') {
    shadeBody(px, 23 * U, 21 * U, 11.5 * U, 10.5 * U, hex('#4a148c'), hex('#7b1fa2'), hex('#e1bee7'));
    softEllipse(px, 23 * U, 17 * U, 3.5 * U, 3.5 * U, hex('#ff9100'), 0.25);
    glow(px, 23 * U, 17 * U, 7 * U, hex('#ff6d00', 0.28));
  }
  return px;
}

function wearGloves(c1, c2 = c1) {
  const px = blank();
  const d1 = c1.map((v, i) => (i < 3 ? Math.max(0, v - 35) : v));
  const d2 = c2.map((v, i) => (i < 3 ? Math.max(0, v - 35) : v));
  shadeBody(px, 13 * U, 19 * U, 4 * U, 4.2 * U, d1, c1, hex('#ffffff', 0.4));
  shadeBody(px, 33 * U, 19 * U, 4 * U, 4.2 * U, d2, c2, hex('#ffffff', 0.4));
  return px;
}

function wearShoes(c1) {
  const px = blank();
  const d = c1.map((v, i) => (i < 3 ? Math.max(0, v - 40) : v));
  shadeBody(px, 18.5 * U, 34 * U, 4.5 * U, 2.8 * U, d, c1, hex('#ffffff', 0.35));
  shadeBody(px, 27.5 * U, 34 * U, 4.5 * U, 2.8 * U, d, c1, hex('#ffffff', 0.35));
  return px;
}

function wearNecklace(c) {
  const px = blank();
  softCapsule(px, 19 * U, 15.5 * U, 27 * U, 15.5 * U, 0.9 * U, hex('#fff8e1', 0.7));
  glow(px, 23 * U, 17.5 * U, 4.5 * U, [...c.slice(0, 3), 100]);
  softEllipse(px, 23 * U, 17.5 * U, 2.6 * U, 2.6 * U, c, 0.22);
  softEllipse(px, 22 * U, 16.5 * U, 0.9 * U, 0.9 * U, hex('#ffffff'), 0.25);
  return px;
}

function wearEarring(side, c) {
  const px = blank();
  const x = side === 'l' ? 15 * U : 31 * U;
  softEllipse(px, x, 11.5 * U, 1.6 * U, 1.6 * U, hex('#ffe082'), 0.25);
  softEllipse(px, x, 14 * U, 2 * U, 2.4 * U, c, 0.22);
  softEllipse(px, x - 0.5 * U, 13 * U, 0.7 * U, 0.7 * U, hex('#ffffff'), 0.25);
  return px;
}

function wearRing(side, c) {
  const px = blank();
  const x = side === 'l' ? 12.5 * U : 33.5 * U;
  softEllipse(px, x, 20.5 * U, 2.2 * U, 2.2 * U, hex('#ffd54f'), 0.25);
  softEllipse(px, x, 20.5 * U, 1.2 * U, 1.2 * U, hex('#fff8e1'), 0.3);
  softEllipse(px, x, 20.5 * U, 0.7 * U, 0.7 * U, c, 0.25);
  return px;
}

function skillSlash() {
  const px = blank();
  for (let i = 0; i < 22; i += 1) {
    const t = i / 21;
    softEllipse(
      px,
      (8 + t * 30) * U,
      (34 - t * 24) * U,
      (2.2 - t) * U,
      (2.2 - t) * U,
      hex(i % 2 ? '#fff59d' : '#ffb74d', 0.85),
      0.45,
    );
  }
  glow(px, 24 * U, 20 * U, 14 * U, hex('#ff9800', 0.25));
  return px;
}

function skillSpin() {
  const px = blank();
  for (let a = 0; a < 36; a += 1) {
    const ang = (a / 36) * Math.PI * 2;
    softEllipse(
      px,
      23 * U + Math.cos(ang) * 14 * U,
      23 * U + Math.sin(ang) * 14 * U,
      2.2 * U,
      2.2 * U,
      hex(a % 2 ? '#ffe082' : '#ff7043', 0.8),
      0.5,
    );
  }
  glow(px, 23 * U, 23 * U, 12 * U, hex('#ff6d00', 0.3));
  return px;
}

function skillBash() {
  const px = blank();
  softCapsule(px, 6 * U, 23 * U, 26 * U, 23 * U, 4 * U, hex('#ff9800', 0.85));
  softEllipse(px, 32 * U, 23 * U, 8 * U, 8 * U, hex('#ffe082', 0.9), 0.35);
  glow(px, 28 * U, 23 * U, 14 * U, hex('#ff6d00', 0.35));
  return px;
}

function skillBolt() {
  const px = blank();
  glow(px, 23 * U, 23 * U, 16 * U, hex('#29b6f6', 0.35));
  softEllipse(px, 23 * U, 23 * U, 8 * U, 8 * U, hex('#4fc3f7'), 0.25);
  softEllipse(px, 23 * U, 23 * U, 4 * U, 4 * U, hex('#e1f5fe'), 0.25);
  softEllipse(px, 20 * U, 20 * U, 1.8 * U, 1.8 * U, hex('#ffffff'), 0.25);
  return px;
}

function skillNova() {
  const px = blank();
  glow(px, 23 * U, 23 * U, 20 * U, hex('#7e57c2', 0.4));
  softEllipse(px, 23 * U, 23 * U, 16 * U, 16 * U, hex('#9575cd', 0.55), 0.45);
  softEllipse(px, 23 * U, 23 * U, 8 * U, 8 * U, hex('#e1bee7', 0.8), 0.35);
  softEllipse(px, 20 * U, 20 * U, 2.5 * U, 2.5 * U, hex('#ffffff'), 0.3);
  return px;
}

function skillShield() {
  const px = blank();
  glow(px, 23 * U, 23 * U, 18 * U, hex('#66bb6a', 0.35));
  softEllipse(px, 23 * U, 23 * U, 14 * U, 14 * U, hex('#43a047', 0.55), 0.4);
  softEllipse(px, 23 * U, 23 * U, 9 * U, 9 * U, hex('#a5d6a7', 0.7), 0.35);
  softEllipse(px, 19 * U, 19 * U, 2.5 * U, 2.5 * U, hex('#ffffff'), 0.3);
  return px;
}

function itemPotion() {
  const px = blank();
  softEllipse(px, 128, 210, 48, 14, hex('#000000', 0.2), 0.6);
  softCapsule(px, 128, 70, 128, 100, 14, hex('#6d4c41'));
  softEllipse(px, 128, 155, 46, 58, hex('#c62828'), 0.22);
  softEllipse(px, 128, 150, 38, 48, hex('#ef5350'), 0.22);
  softEllipse(px, 112, 125, 12, 22, hex('#ffcdd2', 0.75), 0.4);
  softEllipse(px, 128, 70, 22, 12, hex('#a1887f'), 0.25);
  softEllipse(px, 128, 58, 16, 10, hex('#d7ccc8'), 0.25);
  return px;
}

function itemMana() {
  const px = blank();
  softEllipse(px, 128, 210, 48, 14, hex('#000000', 0.2), 0.6);
  softCapsule(px, 128, 70, 128, 100, 14, hex('#37474f'));
  softEllipse(px, 128, 155, 46, 58, hex('#1565c0'), 0.22);
  softEllipse(px, 128, 150, 38, 48, hex('#42a5f5'), 0.22);
  softEllipse(px, 112, 125, 12, 22, hex('#bbdefb', 0.75), 0.4);
  softEllipse(px, 128, 70, 22, 12, hex('#90a4ae'), 0.25);
  softEllipse(px, 128, 58, 16, 10, hex('#cfd8dc'), 0.25);
  return px;
}

function itemScroll() {
  const px = blank();
  softEllipse(px, 128, 210, 54, 14, hex('#000000', 0.18), 0.6);
  softEllipse(px, 128, 128, 70, 78, hex('#f9a825'), 0.2);
  softEllipse(px, 128, 128, 60, 68, hex('#ffe082'), 0.2);
  softEllipse(px, 108, 100, 16, 28, hex('#fff8e1', 0.7), 0.4);
  softCapsule(px, 100, 118, 156, 118, 3, hex('#ef6c00', 0.7));
  softCapsule(px, 104, 138, 152, 138, 2.5, hex('#ef6c00', 0.55));
  softEllipse(px, 128, 160, 10, 10, hex('#e65100'), 0.25);
  return px;
}

console.log('Generating HQ 256² sprites…');

const pantW = hex('#3f6fd8');
const pantM = hex('#8e4cc8');

saveRel('jobs/warrior/actions/idle.png', bodyBase({pant: pantW}));
saveRel('jobs/warrior/actions/walk.png', bodyBase({pant: pantW, leg: 1}));
saveRel('jobs/warrior/actions/roll.png', bodyBase({pant: pantW, roll: true, leg: -1}));
saveRel('jobs/warrior/skills/slash.png', strokeOutline(skillSlash(), [40, 20, 0, 200], 2));
saveRel('jobs/warrior/skills/spin.png', strokeOutline(skillSpin(), [40, 20, 0, 200], 2));
saveRel('jobs/warrior/skills/bash.png', strokeOutline(skillBash(), [40, 20, 0, 200], 2));

saveRel('jobs/mage/actions/idle.png', bodyBase({pant: pantM}));
saveRel('jobs/mage/actions/walk.png', bodyBase({pant: pantM, leg: 1}));
saveRel('jobs/mage/actions/roll.png', bodyBase({pant: pantM, roll: true, leg: -1}));
saveRel('jobs/mage/skills/bolt.png', strokeOutline(skillBolt(), [10, 40, 60, 200], 2));
saveRel('jobs/mage/skills/nova.png', strokeOutline(skillNova(), [40, 10, 60, 200], 2));
saveRel('jobs/mage/skills/shield.png', strokeOutline(skillShield(), [10, 50, 20, 200], 2));

const gear = (job, tier, id, px) =>
  savePublic(`gear/${job}/${tier}/${id}.png`, strokeOutline(px));

gear('warrior', 'basic', 'stick', wearStick());
gear('warrior', 'basic', 'cloth_wrap', wearHead('cloth'));
gear('warrior', 'basic', 'ragged_vest', wearArmor('ragged'));
gear('warrior', 'basic', 'wrap_gloves', wearGloves(hex('#a1887f')));
gear('warrior', 'basic', 'straw_shoes', wearShoes(hex('#6d4c41')));

gear('warrior', 'ascend', 'iron_sword', wearSword());
gear('warrior', 'ascend', 'knight_helm', wearHead('helm'));
gear('warrior', 'ascend', 'blue_plate', wearArmor('blue'));
gear('warrior', 'ascend', 'iron_gauntlets', wearGloves(hex('#90a4ae'), hex('#607d8b')));
gear('warrior', 'ascend', 'march_boots', wearShoes(hex('#5d4037')));

gear('warrior', 'unique', 'courage_pendant', wearNecklace(hex('#ffd54f')));
gear('warrior', 'unique', 'battle_ear_l', wearEarring('l', hex('#ff7043')));
gear('warrior', 'unique', 'battle_ear_r', wearEarring('r', hex('#ff7043')));
gear('warrior', 'unique', 'power_ring_l', wearRing('l', hex('#ef5350')));
gear('warrior', 'unique', 'power_ring_r', wearRing('r', hex('#ef5350')));

gear('warrior', 'hero', 'wasteland_blade', wearSword({hero: true}));
gear('warrior', 'hero', 'war_crown', wearHead('crown'));
gear('warrior', 'hero', 'hero_plate', wearArmor('hero_plate'));
gear('warrior', 'hero', 'hero_gauntlets', wearGloves(hex('#ff7043'), hex('#e64a19')));
gear('warrior', 'hero', 'hero_greaves', wearShoes(hex('#bf360c')));

gear('mage', 'basic', 'stick', wearStick());
gear('mage', 'basic', 'apprentice_cap', wearHead('cap'));
gear('mage', 'basic', 'plain_robe', wearArmor('plain'));
gear('mage', 'basic', 'soft_gloves', wearGloves(hex('#ce93d8')));
gear('mage', 'basic', 'cloth_shoes', wearShoes(hex('#8e24aa')));

gear('mage', 'ascend', 'crystal_staff', wearStaff({crystal: true}));
gear('mage', 'ascend', 'wizard_hat', wearHead('hat'));
gear('mage', 'ascend', 'arcane_robe', wearArmor('arcane'));
gear('mage', 'ascend', 'silk_gloves', wearGloves(hex('#e1bee7'), hex('#ba68c8')));
gear('mage', 'ascend', 'mana_boots', wearShoes(hex('#6a1b9a')));

gear('mage', 'unique', 'wisdom_pendant', wearNecklace(hex('#80deea')));
gear('mage', 'unique', 'mana_ear_l', wearEarring('l', hex('#81c784')));
gear('mage', 'unique', 'mana_ear_r', wearEarring('r', hex('#81c784')));
gear('mage', 'unique', 'mind_ring_l', wearRing('l', hex('#64b5f6')));
gear('mage', 'unique', 'mind_ring_r', wearRing('r', hex('#64b5f6')));

gear('mage', 'hero', 'wasteland_staff', wearStaff({hero: true}));
gear('mage', 'hero', 'arcane_circlet', wearHead('circlet'));
gear('mage', 'hero', 'hero_robe', wearArmor('hero_robe'));
gear('mage', 'hero', 'hero_gloves', wearGloves(hex('#ff7043'), hex('#ab47bc')));
gear('mage', 'hero', 'hero_slippers', wearShoes(hex('#bf360c')));

savePublic('items/potion.png', strokeOutline(itemPotion()));
savePublic('items/mana.png', strokeOutline(itemMana()));
savePublic('items/scroll.png', strokeOutline(itemScroll()));

console.log('Done.');
