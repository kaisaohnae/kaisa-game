/**
 * CraftPix-style 3/4 pixel characters — 4 cardinal dirs.
 * Hand-tuned pixel silhouettes (not geometric blobs).
 * Output: jobs/<job>/actions/<action>_<dir>.png (256² nearest from 64)
 *
 * Run: node src/games/todie/scripts/gen-dir-sprites.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, '..', '..', '..', 'public', 'todie');
const PX = 64;
const OUT = 256;
const SCALE = OUT / PX;
const DIRS = ['down', 'left', 'right', 'up'];

/** Palette — richer ramps like CraftPix packs */
const P = {
  // transparent
  _: [0, 0, 0, 0],
  // outline
  o: [24, 18, 28, 255],
  // skin
  s0: [168, 108, 78, 255],
  s1: [210, 148, 112, 255],
  s2: [238, 186, 148, 255],
  s3: [255, 220, 190, 255],
  // hair
  h0: [40, 28, 38, 255],
  h1: [62, 42, 55, 255],
  h2: [95, 62, 78, 255],
  // eyes
  ew: [255, 255, 255, 255],
  e1: [36, 110, 200, 255],
  e0: [18, 40, 70, 255],
  // warrior pants / tunic
  b0: [28, 55, 120, 255],
  b1: [48, 90, 175, 255],
  b2: [78, 130, 220, 255],
  // mage pants / robe accent
  m0: [70, 35, 110, 255],
  m1: [120, 65, 175, 255],
  m2: [165, 110, 220, 255],
  // tunic / shirt (warrior tan cloth)
  t0: [120, 78, 48, 255],
  t1: [165, 115, 72, 255],
  t2: [200, 155, 100, 255],
  // mage robe
  r0: [55, 40, 100, 255],
  r1: [90, 60, 150, 255],
  r2: [130, 95, 195, 255],
  // leather / boots / belt
  w0: [55, 32, 22, 255],
  w1: [95, 58, 35, 255],
  w2: [140, 95, 55, 255],
  w3: [180, 130, 80, 255],
  // metal / gold
  g0: [160, 110, 30, 255],
  g1: [230, 185, 55, 255],
  g2: [255, 230, 140, 255],
  k0: [90, 100, 115, 255],
  k1: [170, 185, 200, 255],
  k2: [235, 245, 255, 255],
  // gem
  c0: [30, 120, 170, 255],
  c1: [70, 200, 240, 255],
  c2: [200, 245, 255, 255],
  // blush / mouth
  p1: [220, 120, 110, 255],
  // roll spark
  y1: [255, 210, 110, 255],
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
  px[i] = rgba[0];
  px[i + 1] = rgba[1];
  px[i + 2] = rgba[2];
  px[i + 3] = rgba[3];
}

function fillRect(px, x0, y0, x1, y1, rgba) {
  const xa = Math.min(x0, x1);
  const xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1);
  const yb = Math.max(y0, y1);
  for (let y = ya; y <= yb; y += 1) for (let x = xa; x <= xb; x += 1) set(px, x, y, rgba);
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

/** Soft ellipse for shoulders / head */
function fillEllipse(px, cx, cy, rx, ry, rgba) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) set(px, x, y, rgba);
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
          set(out, nx, ny, P.o);
          continue;
        }
        const ni = (ny * PX + nx) * 4;
        if (px[ni + 3] < 40) set(out, nx, ny, P.o);
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

function mirrorX(px) {
  const out = blank();
  for (let y = 0; y < PX; y += 1) {
    for (let x = 0; x < PX; x += 1) {
      const i = (y * PX + x) * 4;
      const j = (y * PX + (PX - 1 - x)) * 4;
      out[j] = px[i];
      out[j + 1] = px[i + 1];
      out[j + 2] = px[i + 2];
      out[j + 3] = px[i + 3];
    }
  }
  return out;
}

function saveJob(job, action, dir, px) {
  const out = path.join(ROOT, 'jobs', job, 'actions', `${action}_${dir}.png`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, encodePng(upscale(outline(px)), OUT, OUT));
  console.log('wrote', `jobs/${job}/actions/${action}_${dir}.png`);
}

function saveGearWeapon(job, tier, id, dir, px) {
  const out = path.join(PUBLIC, 'gear', job, tier, `${id}_${dir}.png`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, encodePng(upscale(outline(px)), OUT, OUT));
  if (dir === 'down') {
    fs.writeFileSync(path.join(PUBLIC, 'gear', job, tier, `${id}.png`), encodePng(upscale(outline(px)), OUT, OUT));
  }
  console.log('wrote', `gear/${job}/${tier}/${id}_${dir}.png`);
}

function clothes(job) {
  if (job === 'warrior') {
    return {pant: P.b1, pantD: P.b0, pantH: P.b2, shirt: P.t1, shirtD: P.t0, shirtH: P.t2};
  }
  return {pant: P.m1, pantD: P.m0, pantH: P.m2, shirt: P.r1, shirtD: P.r0, shirtH: P.r2};
}

/**
 * CraftPix-like 3/4 body: big head, short torso, clear silhouette.
 * dir: down | up | right (left = mirror of right)
 */
function bodyPixel({job, dir, walk = 0, roll = false}) {
  if (dir === 'left') {
    const right = bodyPixel({job, dir: 'right', walk, roll});
    return mirrorX(right);
  }

  const px = blank();
  const c = clothes(job);
  const cx = 32;
  const foot = 56;
  const lo = walk;

  const boot = (x, y, w = 6) => {
    fillRect(px, x, y, x + w, y + 3, P.w0);
    fillRect(px, x + 1, y, x + w - 1, y + 2, P.w1);
    fillRect(px, x + 1, y, x + 2, y + 1, P.w2);
  };

  if (dir === 'down') {
    // boots + legs (walk bob)
    boot(22 + lo, foot);
    boot(35 - lo, foot);
    fillRect(px, 24, 45, 29, 55, c.pantD);
    fillRect(px, 25, 45, 28, 54, c.pant);
    fillRect(px, 26, 46, 27, 50, c.pantH);
    fillRect(px, 34, 45, 39, 55, c.pantD);
    fillRect(px, 35, 45, 38, 54, c.pant);
    fillRect(px, 36, 46, 37, 50, c.pantH);
    // hips
    fillEllipse(px, cx, 43, 10, 5, c.pantD);
    fillEllipse(px, cx, 42, 9, 4, c.pant);
    fillRect(px, 26, 41, 38, 43, c.pantH);
    // belt
    fillRect(px, 23, 39, 40, 41, P.w0);
    fillRect(px, 24, 39, 39, 40, P.w1);
    fillRect(px, 30, 39, 33, 41, P.g1);
    fillRect(px, 31, 39, 32, 40, P.g2);
    // torso / tunic
    fillEllipse(px, cx, 33, 11, 8, c.shirtD);
    fillEllipse(px, cx, 32, 10, 7, c.shirt);
    fillEllipse(px, cx - 2, 29, 4, 3, c.shirtH);
    // collar / neck
    fillRect(px, 29, 25, 34, 28, P.s1);
    fillRect(px, 30, 25, 33, 27, P.s2);
    // far/near arms hanging
    fillEllipse(px, 17, 34, 4, 7, P.s0);
    fillEllipse(px, 17, 33, 3, 6, P.s1);
    fillEllipse(px, 17, 30, 2, 2, P.s2);
    fillCircle(px, 17, 41, 3.2, P.s1);
    fillCircle(px, 16, 40, 1.2, P.s3);
    fillEllipse(px, 47, 34, 4, 7, P.s0);
    fillEllipse(px, 47, 33, 3, 6, P.s1);
    fillEllipse(px, 47, 30, 2, 2, P.s2);
    fillCircle(px, 47, 41, 3.2, P.s1);
    fillCircle(px, 46, 40, 1.2, P.s3);
    // head
    fillEllipse(px, cx, 17, 11, 12, P.s0);
    fillEllipse(px, cx, 17, 10, 11, P.s1);
    fillEllipse(px, cx, 17, 9, 10, P.s2);
    fillEllipse(px, cx - 3, 14, 3, 3, P.s3);
    // hair crown + spikes (CraftPix style)
    fillEllipse(px, cx, 10, 11, 7, P.h0);
    fillEllipse(px, cx, 9, 10, 6, P.h1);
    fillRect(px, 21, 12, 43, 16, P.h1);
    // bangs / spikes
    fillRect(px, 22, 7, 26, 13, P.h1);
    fillRect(px, 28, 5, 32, 12, P.h2);
    fillRect(px, 34, 6, 38, 13, P.h1);
    fillRect(px, 39, 8, 43, 14, P.h0);
    fillRect(px, 20, 14, 24, 22, P.h1);
    fillRect(px, 40, 14, 44, 22, P.h1);
    // side locks over cheeks
    fillRect(px, 21, 16, 24, 24, P.h0);
    fillRect(px, 40, 16, 43, 24, P.h0);
    // brows
    fillRect(px, 25, 15, 29, 16, P.h0);
    fillRect(px, 34, 15, 38, 16, P.h0);
    // eyes
    fillRect(px, 25, 17, 29, 21, P.ew);
    fillRect(px, 34, 17, 38, 21, P.ew);
    fillRect(px, 26, 17, 29, 21, P.e1);
    fillRect(px, 35, 17, 38, 21, P.e1);
    fillRect(px, 28, 17, 29, 20, P.e0);
    fillRect(px, 37, 17, 38, 20, P.e0);
    fillRect(px, 27, 17, 27, 17, P.ew);
    fillRect(px, 36, 17, 36, 17, P.ew);
    // nose / mouth / blush
    fillRect(px, 31, 21, 32, 23, P.s0);
    fillRect(px, 30, 25, 33, 26, P.p1);
    fillRect(px, 24, 22, 26, 23, P.p1);
    fillRect(px, 37, 22, 39, 23, P.p1);
  } else if (dir === 'up') {
    boot(22 + lo, foot);
    boot(35 - lo, foot);
    fillRect(px, 24, 45, 29, 55, c.pantD);
    fillRect(px, 25, 45, 28, 54, c.pant);
    fillRect(px, 34, 45, 39, 55, c.pantD);
    fillRect(px, 35, 45, 38, 54, c.pant);
    fillEllipse(px, cx, 43, 10, 5, c.pantD);
    fillEllipse(px, cx, 42, 9, 4, c.pant);
    fillRect(px, 23, 39, 40, 41, P.w0);
    fillRect(px, 24, 39, 39, 40, P.w1);
    fillEllipse(px, cx, 33, 11, 8, c.shirtD);
    fillEllipse(px, cx, 32, 10, 7, c.shirt);
    // arms from behind
    fillEllipse(px, 17, 34, 4, 7, P.s0);
    fillEllipse(px, 17, 33, 3, 6, P.s1);
    fillCircle(px, 17, 41, 3.2, P.s1);
    fillEllipse(px, 47, 34, 4, 7, P.s0);
    fillEllipse(px, 47, 33, 3, 6, P.s1);
    fillCircle(px, 47, 41, 3.2, P.s1);
    // back of head — hair mass
    fillEllipse(px, cx, 17, 11, 12, P.h0);
    fillEllipse(px, cx, 16, 10, 11, P.h1);
    fillEllipse(px, cx, 10, 9, 6, P.h2);
    fillRect(px, 20, 14, 44, 28, P.h1);
    fillRect(px, 22, 6, 27, 14, P.h1);
    fillRect(px, 30, 5, 34, 12, P.h2);
    fillRect(px, 36, 6, 41, 14, P.h1);
    // neck peek under hair
    fillRect(px, 29, 27, 34, 30, P.s1);
  } else {
    // right profile / 3/4
    boot(30, foot);
    boot(37 + lo, foot - 1, 5);
    fillRect(px, 30, 45, 39, 55, c.pantD);
    fillRect(px, 31, 45, 38, 54, c.pant);
    fillRect(px, 33, 46, 35, 50, c.pantH);
    fillEllipse(px, 34, 42, 8, 5, c.pantD);
    fillEllipse(px, 34, 41, 7, 4, c.pant);
    fillRect(px, 28, 39, 40, 41, P.w0);
    fillRect(px, 29, 39, 39, 40, P.w1);
    fillRect(px, 33, 39, 35, 41, P.g1);
    // torso
    fillEllipse(px, 34, 32, 8, 8, c.shirtD);
    fillEllipse(px, 34, 31, 7, 7, c.shirt);
    fillEllipse(px, 35, 28, 3, 3, c.shirtH);
    // far arm
    fillEllipse(px, 26, 33, 3, 5, P.s0);
    fillCircle(px, 26, 38, 2.5, P.s0);
    // near arm forward
    fillEllipse(px, 42, 31, 4, 7, P.s0);
    fillEllipse(px, 42, 30, 3, 6, P.s1);
    fillCircle(px, 44, 39, 3.2, P.s1);
    fillCircle(px, 43, 38, 1.2, P.s3);
    // neck
    fillRect(px, 32, 23, 36, 27, P.s1);
    // head
    fillEllipse(px, 35, 16, 9, 11, P.s0);
    fillEllipse(px, 35, 16, 8, 10, P.s1);
    fillEllipse(px, 35, 16, 7, 9, P.s2);
    fillEllipse(px, 37, 13, 2, 2, P.s3);
    // hair
    fillEllipse(px, 34, 10, 9, 7, P.h0);
    fillEllipse(px, 34, 9, 8, 6, P.h1);
    fillRect(px, 27, 10, 40, 16, P.h1);
    fillRect(px, 38, 6, 43, 13, P.h2);
    fillRect(px, 26, 12, 30, 22, P.h0);
    fillRect(px, 40, 14, 44, 22, P.h1);
    // eye (one)
    fillRect(px, 37, 16, 41, 20, P.ew);
    fillRect(px, 38, 16, 41, 20, P.e1);
    fillRect(px, 40, 16, 41, 19, P.e0);
    fillRect(px, 39, 16, 39, 16, P.ew);
    fillRect(px, 36, 15, 40, 16, P.h0);
    fillRect(px, 36, 21, 37, 22, P.s0);
    fillRect(px, 38, 24, 40, 25, P.p1);
  }

  if (roll) {
    for (let a = 0; a < 14; a += 1) {
      const ang = (a / 14) * Math.PI * 2;
      fillCircle(px, cx + Math.cos(ang) * 23, 32 + Math.sin(ang) * 19, 1.8, P.y1);
    }
  }
  return px;
}

function weaponStick(dir) {
  const px = blank();
  if (dir === 'down') {
    fillRect(px, 45, 16, 48, 46, P.w0);
    fillRect(px, 46, 16, 47, 46, P.w1);
    fillRect(px, 46, 16, 47, 22, P.w3);
  } else if (dir === 'up') {
    fillRect(px, 15, 12, 18, 40, P.w0);
    fillRect(px, 16, 12, 17, 40, P.w1);
  } else if (dir === 'right') {
    fillRect(px, 42, 10, 46, 44, P.w0);
    fillRect(px, 43, 10, 45, 44, P.w1);
    fillRect(px, 43, 10, 45, 16, P.w3);
  } else {
    return mirrorX(weaponStick('right'));
  }
  return px;
}

function weaponSword(dir) {
  const px = blank();
  if (dir === 'down') {
    fillRect(px, 45, 8, 48, 34, P.k0);
    fillRect(px, 46, 8, 47, 34, P.k1);
    fillRect(px, 46, 8, 47, 14, P.k2);
    fillRect(px, 42, 32, 51, 35, P.w1);
    fillRect(px, 46, 35, 47, 44, P.w0);
    fillRect(px, 45, 35, 48, 37, P.g1);
  } else if (dir === 'up') {
    fillRect(px, 15, 6, 18, 32, P.k0);
    fillRect(px, 16, 6, 17, 32, P.k1);
    fillRect(px, 12, 30, 21, 33, P.w1);
    fillRect(px, 16, 33, 17, 42, P.w0);
  } else if (dir === 'right') {
    fillRect(px, 42, 4, 46, 32, P.k0);
    fillRect(px, 43, 4, 45, 32, P.k1);
    fillRect(px, 43, 4, 45, 10, P.k2);
    fillRect(px, 39, 30, 49, 34, P.w1);
    fillRect(px, 43, 34, 45, 44, P.w0);
    fillRect(px, 42, 34, 46, 36, P.g1);
  } else {
    return mirrorX(weaponSword('right'));
  }
  return px;
}

function weaponStaff(dir) {
  const px = blank();
  if (dir === 'down') {
    fillRect(px, 45, 18, 48, 50, P.w0);
    fillRect(px, 46, 18, 47, 50, P.w1);
    fillCircle(px, 46, 14, 5, P.c0);
    fillCircle(px, 46, 14, 3.5, P.c1);
    fillCircle(px, 45, 12, 1.5, P.c2);
  } else if (dir === 'up') {
    fillRect(px, 15, 14, 18, 46, P.w0);
    fillRect(px, 16, 14, 17, 46, P.w1);
    fillCircle(px, 16, 10, 5, P.c0);
    fillCircle(px, 16, 10, 3.5, P.c1);
  } else if (dir === 'right') {
    fillRect(px, 42, 14, 46, 48, P.w0);
    fillRect(px, 43, 14, 45, 48, P.w1);
    fillCircle(px, 44, 10, 5, P.c0);
    fillCircle(px, 44, 10, 3.5, P.c1);
    fillCircle(px, 43, 8, 1.5, P.c2);
  } else {
    return mirrorX(weaponStaff('right'));
  }
  return px;
}

function skillSlashArc() {
  const px = blank();
  for (let i = 0; i < 22; i += 1) {
    const t = i / 21;
    const ang = -0.95 + t * 1.9;
    fillCircle(px, 32 + Math.cos(ang) * 19, 28 + Math.sin(ang) * 15, 2.2 - t, i % 2 ? P.g1 : P.k2);
  }
  return px;
}

function skillSpinRing() {
  const px = blank();
  for (let a = 0; a < 28; a += 1) {
    const ang = (a / 28) * Math.PI * 2;
    fillCircle(px, 32 + Math.cos(ang) * 18, 32 + Math.sin(ang) * 18, 2.2, a % 2 ? P.g1 : [255, 140, 80, 255]);
  }
  return px;
}

function skillBashBurst() {
  const px = blank();
  fillRect(px, 28, 8, 35, 40, [255, 160, 60, 220]);
  fillCircle(px, 32, 10, 6, P.g1);
  return px;
}

function skillBoltOrb() {
  const px = blank();
  fillCircle(px, 32, 32, 11, P.c0);
  fillCircle(px, 32, 32, 7, P.c1);
  fillCircle(px, 30, 29, 3, P.c2);
  return px;
}

function skillNovaRing() {
  const px = blank();
  fillCircle(px, 32, 32, 18, [150, 80, 220, 160]);
  fillCircle(px, 32, 32, 10, [200, 150, 255, 200]);
  return px;
}

function skillShieldBubble() {
  const px = blank();
  fillCircle(px, 32, 32, 16, [80, 200, 120, 160]);
  fillCircle(px, 32, 32, 10, [160, 240, 180, 180]);
  return px;
}

console.log('Generating CraftPix-style 4-dir sprites…');

for (const job of ['warrior', 'mage']) {
  // Keep hand-authored / imported bodies (see import-oga-*.mjs).
  if (fs.existsSync(path.join(ROOT, 'jobs', job, 'ATTRIBUTION.txt'))) {
    console.log(`skip ${job} bodies (ATTRIBUTION.txt present)`);
    continue;
  }
  for (const dir of DIRS) {
    saveJob(job, 'idle', dir, bodyPixel({job, dir, walk: 0}));
    saveJob(job, 'walk', dir, bodyPixel({job, dir, walk: dir === 'left' || dir === 'right' ? 1 : 2}));
    saveJob(job, 'roll', dir, bodyPixel({job, dir, walk: -1, roll: true}));
  }
}

for (const dir of DIRS) {
  saveGearWeapon('warrior', 'basic', 'stick', dir, weaponStick(dir));
  saveGearWeapon('warrior', 'ascend', 'iron_sword', dir, weaponSword(dir));
  saveGearWeapon('warrior', 'hero', 'wasteland_blade', dir, weaponSword(dir));
  saveGearWeapon('mage', 'basic', 'stick', dir, weaponStick(dir));
  saveGearWeapon('mage', 'ascend', 'crystal_staff', dir, weaponStaff(dir));
  saveGearWeapon('mage', 'hero', 'wasteland_staff', dir, weaponStaff(dir));
}

function saveSkill(job, id, px) {
  const out = path.join(ROOT, 'jobs', job, 'skills', `${id}.png`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, encodePng(upscale(outline(px)), OUT, OUT));
  console.log('wrote', `jobs/${job}/skills/${id}.png`);
}

// Warrior skill icons: npm run todie:warrior-skills (do not overwrite here)
saveSkill('mage', 'bolt', skillBoltOrb());
saveSkill('mage', 'nova', skillNovaRing());
saveSkill('mage', 'shield', skillShieldBubble());

for (const job of ['warrior', 'mage']) {
  if (fs.existsSync(path.join(ROOT, 'jobs', job, 'ATTRIBUTION.txt'))) continue;
  for (const action of ['idle', 'walk', 'roll']) {
    const src = path.join(ROOT, 'jobs', job, 'actions', `${action}_down.png`);
    const dst = path.join(ROOT, 'jobs', job, 'actions', `${action}.png`);
    fs.copyFileSync(src, dst);
    console.log('alias', `${action}.png <- ${action}_down.png`);
  }
}

console.log('Done.');
