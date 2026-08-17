/**
 * Centered inventory/ground gear icons (not body-wear overlays).
 * Hero tier gets ornate glow + frame. Run: npm run todie:gear-icons
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', '..', '..', '..', 'public', 'todie');
const SIZE = 256;
const CX = 128;
const CY = 128;

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
  const i = (Math.round(y) * SIZE + Math.round(x)) * 4;
  if (i < 0 || i >= px.length) return;
  const da = a / 255;
  const oa = px[i + 3] / 255;
  const outA = da + oa * (1 - da);
  if (outA <= 0) return;
  px[i] = Math.round((r * da + px[i] * oa * (1 - da)) / outA);
  px[i + 1] = Math.round((g * da + px[i + 1] * oa * (1 - da)) / outA);
  px[i + 2] = Math.round((b * da + px[i + 2] * oa * (1 - da)) / outA);
  px[i + 3] = Math.round(outA * 255);
}
function softEllipse(px, cx, cy, rx, ry, rgba, soft = 0.14) {
  const [r, g, b, a] = rgba;
  const pad = Math.ceil(Math.max(rx, ry) * (1 + soft) + 2);
  const softIn = 1 - soft;
  for (let y = Math.max(0, Math.floor(cy - pad)); y <= Math.min(SIZE - 1, Math.ceil(cy + pad)); y += 1) {
    for (let x = Math.max(0, Math.floor(cx - pad)); x <= Math.min(SIZE - 1, Math.ceil(cx + pad)); x += 1) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (d > 1 + soft) continue;
      let cov = d > softIn ? 1 - (d - softIn) / (soft + 1e-4) : 1;
      if (cov > 0) blend(px, x, y, r, g, b, a * cov);
    }
  }
}
function softCapsule(px, x0, y0, x1, y1, rad, rgba, soft = 0.12) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const [r, g, b, a] = rgba;
  const softIn = rad * (1 - soft);
  const pad = rad * (1 + soft) + 2;
  for (let y = Math.max(0, Math.floor(Math.min(y0, y1) - pad)); y <= Math.min(SIZE - 1, Math.ceil(Math.max(y0, y1) + pad)); y += 1) {
    for (let x = Math.max(0, Math.floor(Math.min(x0, x1) - pad)); x <= Math.min(SIZE - 1, Math.ceil(Math.max(x0, x1) + pad)); x += 1) {
      let t = Math.max(0, Math.min(len, (x - x0) * ux + (y - y0) * uy));
      const d = Math.hypot(x - (x0 + ux * t), y - (y0 + uy * t));
      if (d > rad * (1 + soft)) continue;
      let cov = d > softIn ? 1 - (d - softIn) / (rad * soft + 1e-4) : 1;
      if (cov > 0) blend(px, x, y, r, g, b, a * cov);
    }
  }
}
function glow(px, cx, cy, r, rgba) {
  softEllipse(px, cx, cy, r, r, rgba, 0.88);
}
function shade(px, cx, cy, rx, ry, d, m, h) {
  softEllipse(px, cx + rx * 0.1, cy + ry * 0.12, rx * 1.05, ry * 1.05, d, 0.3);
  softEllipse(px, cx, cy, rx, ry, m, 0.2);
  softEllipse(px, cx - rx * 0.28, cy - ry * 0.32, rx * 0.5, ry * 0.42, h, 0.35);
}
function outline(px, rgba = [28, 20, 16, 230], width = 2) {
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
          if (px[(ny * SIZE + nx) * 4 + 3] < 40) blend(out, nx, ny, r, g, b, a);
        }
      }
    }
  }
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;
    blend(out, (i / 4) % SIZE, Math.floor(i / 4 / SIZE), px[i], px[i + 1], px[i + 2], px[i + 3]);
  }
  return out;
}

const TIER_BG = {
  basic: {glow: hex('#90a4ae', 0.18), rim: hex('#cfd8dc', 0.55), spark: false},
  ascend: {glow: hex('#42a5f5', 0.28), rim: hex('#90caf9', 0.7), spark: false},
  unique: {glow: hex('#ffd54f', 0.32), rim: hex('#ffe082', 0.85), spark: true},
  hero: {glow: hex('#ff6d00', 0.42), rim: hex('#ffab40', 0.95), spark: true, rays: true},
};

function tierBackdrop(tier) {
  const px = blank();
  const t = TIER_BG[tier] || TIER_BG.basic;
  // soft plate behind item
  softEllipse(px, CX, CY + 8, 98, 88, hex('#1a1410', 0.35), 0.5);
  glow(px, CX, CY, tier === 'hero' ? 110 : tier === 'unique' ? 95 : 80, t.glow);
  if (t.rays) {
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2 + 0.2;
      softCapsule(
        px,
        CX + Math.cos(a) * 28,
        CY + Math.sin(a) * 28,
        CX + Math.cos(a) * 108,
        CY + Math.sin(a) * 108,
        4 + (i % 2),
        hex('#ff9100', 0.22),
        0.5,
      );
    }
  }
  // rim ring
  for (let a = 0; a < 48; a += 1) {
    const ang = (a / 48) * Math.PI * 2;
    const rr = tier === 'hero' ? 108 : 96;
    softEllipse(px, CX + Math.cos(ang) * rr, CY + Math.sin(ang) * rr, 3.2, 3.2, t.rim, 0.4);
  }
  if (tier === 'hero') {
    // corner gems
    for (const [gx, gy] of [
      [48, 48],
      [208, 48],
      [48, 208],
      [208, 208],
    ]) {
      softEllipse(px, gx, gy, 10, 10, hex('#ff6d00'), 0.25);
      softEllipse(px, gx, gy, 6, 6, hex('#ffe082'), 0.22);
      softEllipse(px, gx - 2, gy - 2, 2.5, 2.5, hex('#ffffff'), 0.3);
    }
  }
  if (t.spark) {
    for (let i = 0; i < (tier === 'hero' ? 14 : 8); i += 1) {
      const ang = (i / 14) * Math.PI * 2;
      const rr = 55 + (i % 4) * 12;
      softEllipse(
        px,
        CX + Math.cos(ang) * rr,
        CY + Math.sin(ang) * rr - 6,
        tier === 'hero' ? 3.5 : 2.4,
        tier === 'hero' ? 3.5 : 2.4,
        hex('#ffffff', 0.75),
        0.4,
      );
    }
  }
  return px;
}

function composite(bg, fg) {
  const out = blank();
  out.set(bg);
  for (let i = 0; i < fg.length; i += 4) {
    if (fg[i + 3] < 8) continue;
    const x = (i / 4) % SIZE;
    const y = Math.floor(i / 4 / SIZE);
    blend(out, x, y, fg[i], fg[i + 1], fg[i + 2], fg[i + 3]);
  }
  return out;
}

/* —— centered item drawings —— */
function iconStick() {
  const px = blank();
  softCapsule(px, CX, 210, CX, 50, 14, hex('#5d4037'));
  softCapsule(px, CX, 210, CX, 50, 9, hex('#a1887f'));
  softCapsule(px, CX, 210, CX, 50, 4, hex('#d7ccc8'));
  softEllipse(px, CX, 48, 16, 14, hex('#e8b878'), 0.25);
  softEllipse(px, CX, 200, 18, 12, hex('#4e342e'), 0.28);
  return px;
}
function iconSword({hero = false} = {}) {
  const px = blank();
  if (hero) glow(px, CX, 90, 70, hex('#ff6d00', 0.35));
  const blade = hero ? hex('#ffe082') : hex('#eceff1');
  const edge = hero ? hex('#ff9100') : hex('#78909c');
  softCapsule(px, CX, 195, CX, 42, hero ? 16 : 13, edge);
  softCapsule(px, CX, 195, CX, 42, hero ? 10 : 8, blade);
  softCapsule(px, CX, 195, CX, 42, 3, hex('#ffffff', 0.7));
  softEllipse(px, CX, 40, 14, 18, hex('#ffffff', 0.85), 0.3);
  softCapsule(px, CX - 48, 178, CX + 48, 178, 10, hex('#5d4037'));
  softCapsule(px, CX - 48, 178, CX + 48, 178, 6, hero ? hex('#ffb74d') : hex('#a1887f'));
  softCapsule(px, CX, 178, CX, 230, 11, hex('#4e342e'));
  softCapsule(px, CX, 178, CX, 230, 6, hex('#8d6e63'));
  softEllipse(px, CX, 232, 16, 12, hero ? hex('#ff6d00') : hex('#6d4c41'), 0.25);
  if (hero) {
    softEllipse(px, CX, 100, 8, 8, hex('#ffd54f'), 0.22);
    softEllipse(px, CX - 18, 130, 5, 5, hex('#ffab40'), 0.28);
    softEllipse(px, CX + 18, 130, 5, 5, hex('#ffab40'), 0.28);
  }
  return px;
}
function iconStaff({hero = false, crystal = false} = {}) {
  const px = blank();
  softCapsule(px, CX, 220, CX, 90, 11, hex('#5d4037'));
  softCapsule(px, CX, 220, CX, 90, 6, hex('#a1887f'));
  const gem = hero ? hex('#ff9100') : crystal ? hex('#4fc3f7') : hex('#80deea');
  glow(px, CX, 70, hero ? 55 : 40, [...gem.slice(0, 3), 110]);
  softEllipse(px, CX, 70, hero ? 38 : 30, hero ? 38 : 30, gem, 0.2);
  softEllipse(px, CX, 70, hero ? 24 : 18, hero ? 24 : 18, hex('#ffffff', 0.35), 0.35);
  softEllipse(px, CX - 10, 58, 10, 10, hex('#ffffff', 0.85), 0.3);
  if (hero) {
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      softEllipse(px, CX + Math.cos(a) * 48, 70 + Math.sin(a) * 48, 6, 6, hex('#ffd54f'), 0.3);
    }
  }
  return px;
}
function iconHelm({kind}) {
  const px = blank();
  if (kind === 'cloth') {
    shade(px, CX, CY - 10, 70, 48, hex('#546e7a'), hex('#90a4ae'), hex('#cfd8dc'));
    softCapsule(px, CX + 40, CY, CX + 70, CY + 40, 8, hex('#78909c'));
  } else if (kind === 'cap') {
    shade(px, CX, CY - 8, 68, 50, hex('#5e35b1'), hex('#9575cd'), hex('#e1bee7'));
    softEllipse(px, CX + 50, CY + 20, 28, 14, hex('#7e57c2'), 0.3);
  } else if (kind === 'helm') {
    shade(px, CX, CY, 72, 70, hex('#37474f'), hex('#90a4ae'), hex('#eceff1'));
    softCapsule(px, CX - 50, CY - 8, CX + 50, CY - 8, 8, hex('#263238'));
    softEllipse(px, CX - 22, CY - 12, 14, 8, hex('#cfd8dc'), 0.3);
    softEllipse(px, CX + 22, CY - 12, 14, 8, hex('#cfd8dc'), 0.3);
    softEllipse(px, CX, CY - 48, 22, 16, hex('#5c6bc0'), 0.25);
  } else if (kind === 'hat') {
    softEllipse(px, CX, CY + 30, 95, 22, hex('#4527a0'), 0.28);
    shade(px, CX, CY - 20, 42, 70, hex('#4a148c'), hex('#7e57c2'), hex('#ce93d8'));
    softEllipse(px, CX, CY - 78, 14, 14, hex('#e1bee7'), 0.25);
  } else if (kind === 'crown') {
    glow(px, CX, CY - 20, 70, hex('#ff6d00', 0.4));
    softCapsule(px, CX - 70, CY + 10, CX + 70, CY + 10, 16, hex('#e65100'));
    softCapsule(px, CX - 70, CY + 10, CX + 70, CY + 10, 10, hex('#ffd54f'));
    for (const x of [-50, 0, 50]) {
      softEllipse(px, CX + x, CY - 30, 14, 28, hex('#ffca28'), 0.22);
      softEllipse(px, CX + x, CY - 48, 8, 8, hex('#fff59d'), 0.25);
    }
    softEllipse(px, CX, CY - 55, 12, 12, hex('#ff6d00'), 0.22);
  } else if (kind === 'circlet') {
    glow(px, CX, CY - 10, 60, hex('#ff9100', 0.35));
    softCapsule(px, CX - 68, CY + 8, CX + 68, CY + 8, 12, hex('#ce93d8'));
    softCapsule(px, CX - 68, CY + 8, CX + 68, CY + 8, 7, hex('#f3e5f5'));
    softEllipse(px, CX, CY - 18, 22, 22, hex('#ff9100'), 0.2);
    softEllipse(px, CX, CY - 18, 12, 12, hex('#ffe082'), 0.25);
    softEllipse(px, CX - 6, CY - 24, 5, 5, hex('#ffffff'), 0.3);
  }
  return px;
}
function iconArmor({kind}) {
  const px = blank();
  const paint = (d, m, h) => {
    shade(px, CX, CY + 8, 78, 70, d, m, h);
    softEllipse(px, CX - 58, CY - 30, 28, 22, m, 0.28);
    softEllipse(px, CX + 58, CY - 30, 28, 22, m, 0.28);
    softEllipse(px, CX - 58, CY - 34, 16, 12, h, 0.4);
    softEllipse(px, CX + 58, CY - 34, 16, 12, h, 0.4);
  };
  if (kind === 'ragged') {
    paint(hex('#4e342e'), hex('#8d6e63'), hex('#d7ccc8'));
  } else if (kind === 'blue') {
    paint(hex('#1a237e'), hex('#5c6bc0'), hex('#c5cae9'));
    softCapsule(px, CX - 30, CY - 20, CX + 30, CY - 20, 6, hex('#e8eaf6'));
  } else if (kind === 'plain') {
    paint(hex('#4a148c'), hex('#9575cd'), hex('#e1bee7'));
  } else if (kind === 'arcane') {
    paint(hex('#311b92'), hex('#5e35b1'), hex('#d1c4e9'));
    softEllipse(px, CX, CY + 6, 18, 18, hex('#80deea'), 0.25);
    glow(px, CX, CY + 6, 28, hex('#80deea', 0.3));
  } else if (kind === 'hero_plate') {
    glow(px, CX, CY, 80, hex('#ff6d00', 0.35));
    paint(hex('#bf360c'), hex('#ef6c00'), hex('#ffcc80'));
    softCapsule(px, CX - 40, CY - 22, CX + 40, CY - 22, 8, hex('#ffd54f'));
    softEllipse(px, CX, CY + 10, 20, 20, hex('#ffe082'), 0.25);
    softEllipse(px, CX, CY + 10, 10, 10, hex('#ff6d00'), 0.28);
  } else if (kind === 'hero_robe') {
    glow(px, CX, CY, 80, hex('#ff6d00', 0.32));
    paint(hex('#4a148c'), hex('#7b1fa2'), hex('#f3e5f5'));
    softEllipse(px, CX, CY + 4, 22, 22, hex('#ff9100'), 0.22);
    softEllipse(px, CX, CY + 4, 12, 12, hex('#ffe082'), 0.28);
  }
  return px;
}
function iconGloves(c1, c2 = c1, hero = false) {
  const px = blank();
  if (hero) glow(px, CX, CY, 55, hex('#ff6d00', 0.3));
  const d1 = c1.map((v, i) => (i < 3 ? Math.max(0, v - 40) : v));
  const d2 = c2.map((v, i) => (i < 3 ? Math.max(0, v - 40) : v));
  shade(px, CX - 40, CY, 36, 40, d1, c1, hex('#ffffff', 0.45));
  shade(px, CX + 40, CY, 36, 40, d2, c2, hex('#ffffff', 0.45));
  for (const sx of [-40, 40]) {
    softEllipse(px, CX + sx - 8, CY - 18, 10, 8, hex('#ffffff', 0.5), 0.4);
    if (hero) {
      softEllipse(px, CX + sx, CY + 8, 8, 8, hex('#ffd54f'), 0.28);
    }
  }
  return px;
}
function iconShoes(c1, hero = false) {
  const px = blank();
  if (hero) glow(px, CX, CY + 10, 50, hex('#ff6d00', 0.28));
  const d = c1.map((v, i) => (i < 3 ? Math.max(0, v - 45) : v));
  shade(px, CX - 38, CY + 10, 42, 28, d, c1, hex('#ffffff', 0.4));
  shade(px, CX + 38, CY + 10, 42, 28, d, c1, hex('#ffffff', 0.4));
  softEllipse(px, CX - 50, CY + 22, 18, 10, hex('#000000', 0.25), 0.4);
  softEllipse(px, CX + 26, CY + 22, 18, 10, hex('#000000', 0.25), 0.4);
  if (hero) {
    softEllipse(px, CX - 38, CY, 8, 8, hex('#ffd54f'), 0.28);
    softEllipse(px, CX + 38, CY, 8, 8, hex('#ffd54f'), 0.28);
  }
  return px;
}
function iconNecklace(c, heroish = false) {
  const px = blank();
  softCapsule(px, CX - 50, CY - 40, CX + 50, CY - 40, 6, hex('#fff8e1', 0.8));
  softCapsule(px, CX - 50, CY - 40, CX - 20, CY + 10, 5, hex('#ffe082', 0.7));
  softCapsule(px, CX + 50, CY - 40, CX + 20, CY + 10, 5, hex('#ffe082', 0.7));
  glow(px, CX, CY + 20, heroish ? 50 : 36, [...c.slice(0, 3), 120]);
  softEllipse(px, CX, CY + 20, 28, 32, c, 0.2);
  softEllipse(px, CX, CY + 20, 16, 18, hex('#ffffff', 0.45), 0.35);
  softEllipse(px, CX - 8, CY + 8, 8, 8, hex('#ffffff'), 0.28);
  return px;
}
function iconEarring(c) {
  const px = blank();
  for (const sx of [-36, 36]) {
    softEllipse(px, CX + sx, CY - 30, 10, 10, hex('#ffd54f'), 0.25);
    softCapsule(px, CX + sx, CY - 22, CX + sx, CY + 10, 4, hex('#ffe082'));
    softEllipse(px, CX + sx, CY + 28, 18, 22, c, 0.2);
    softEllipse(px, CX + sx - 5, CY + 18, 6, 6, hex('#ffffff'), 0.3);
  }
  return px;
}
function iconRing(c) {
  const px = blank();
  softEllipse(px, CX, CY, 48, 48, hex('#ffd54f'), 0.22);
  softEllipse(px, CX, CY, 34, 34, hex('#fff8e1'), 0.25);
  softEllipse(px, CX, CY, 22, 22, hex('#1a1410', 0.5), 0.3);
  softEllipse(px, CX, CY - 8, 14, 14, c, 0.22);
  softEllipse(px, CX - 4, CY - 14, 5, 5, hex('#ffffff'), 0.3);
  return px;
}

function save(job, tier, id, drawFn) {
  const bg = tierBackdrop(tier);
  const fg = outline(drawFn());
  const px = composite(bg, fg);
  const out = path.join(PUBLIC, 'gear', job, tier, `${id}.png`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, encodePng(px));
  console.log('icon', job, tier, id);
}

function saveItem(name, drawFn) {
  const px = outline(drawFn());
  const out = path.join(PUBLIC, 'items', `${name}.png`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, encodePng(px));
  console.log('item', name);
}

console.log('Generating centered gear icons…');

// warrior
save('warrior', 'basic', 'stick', iconStick);
save('warrior', 'basic', 'cloth_wrap', () => iconHelm({kind: 'cloth'}));
save('warrior', 'basic', 'ragged_vest', () => iconArmor({kind: 'ragged'}));
save('warrior', 'basic', 'wrap_gloves', () => iconGloves(hex('#a1887f')));
save('warrior', 'basic', 'straw_shoes', () => iconShoes(hex('#6d4c41')));

save('warrior', 'ascend', 'iron_sword', () => iconSword());
save('warrior', 'ascend', 'knight_helm', () => iconHelm({kind: 'helm'}));
save('warrior', 'ascend', 'blue_plate', () => iconArmor({kind: 'blue'}));
save('warrior', 'ascend', 'iron_gauntlets', () => iconGloves(hex('#90a4ae'), hex('#607d8b')));
save('warrior', 'ascend', 'march_boots', () => iconShoes(hex('#5d4037')));

save('warrior', 'unique', 'courage_pendant', () => iconNecklace(hex('#ffd54f'), true));
save('warrior', 'unique', 'battle_ear', () => iconEarring(hex('#ff7043')));
save('warrior', 'unique', 'power_ring', () => iconRing(hex('#ef5350')));

save('warrior', 'hero', 'wasteland_blade', () => iconSword({hero: true}));
save('warrior', 'hero', 'war_crown', () => iconHelm({kind: 'crown'}));
save('warrior', 'hero', 'hero_plate', () => iconArmor({kind: 'hero_plate'}));
save('warrior', 'hero', 'hero_gauntlets', () => iconGloves(hex('#ff7043'), hex('#e64a19'), true));
save('warrior', 'hero', 'hero_greaves', () => iconShoes(hex('#bf360c'), true));

// mage
save('mage', 'basic', 'stick', iconStick);
save('mage', 'basic', 'apprentice_cap', () => iconHelm({kind: 'cap'}));
save('mage', 'basic', 'plain_robe', () => iconArmor({kind: 'plain'}));
save('mage', 'basic', 'soft_gloves', () => iconGloves(hex('#ce93d8')));
save('mage', 'basic', 'cloth_shoes', () => iconShoes(hex('#8e24aa')));

save('mage', 'ascend', 'crystal_staff', () => iconStaff({crystal: true}));
save('mage', 'ascend', 'wizard_hat', () => iconHelm({kind: 'hat'}));
save('mage', 'ascend', 'arcane_robe', () => iconArmor({kind: 'arcane'}));
save('mage', 'ascend', 'silk_gloves', () => iconGloves(hex('#e1bee7'), hex('#ba68c8')));
save('mage', 'ascend', 'mana_boots', () => iconShoes(hex('#6a1b9a')));

save('mage', 'unique', 'wisdom_pendant', () => iconNecklace(hex('#80deea'), true));
save('mage', 'unique', 'mana_ear', () => iconEarring(hex('#81c784')));
save('mage', 'unique', 'mind_ring', () => iconRing(hex('#64b5f6')));

save('mage', 'hero', 'wasteland_staff', () => iconStaff({hero: true}));
save('mage', 'hero', 'arcane_circlet', () => iconHelm({kind: 'circlet'}));
save('mage', 'hero', 'hero_robe', () => iconArmor({kind: 'hero_robe'}));
save('mage', 'hero', 'hero_gloves', () => iconGloves(hex('#ff7043'), hex('#ab47bc'), true));
save('mage', 'hero', 'hero_slippers', () => iconShoes(hex('#bf360c'), true));

// consumables — prettier bottles
saveItem('potion', () => {
  const px = blank();
  softEllipse(px, CX, 220, 50, 14, hex('#000000', 0.25), 0.55);
  softCapsule(px, CX, 55, CX, 95, 16, hex('#6d4c41'));
  softEllipse(px, CX, 150, 52, 70, hex('#b71c1c'), 0.22);
  softEllipse(px, CX, 145, 42, 58, hex('#ef5350'), 0.2);
  softEllipse(px, CX - 16, 115, 12, 28, hex('#ffcdd2', 0.8), 0.4);
  softEllipse(px, CX, 55, 24, 14, hex('#a1887f'), 0.25);
  softEllipse(px, CX, 42, 16, 10, hex('#efebe9'), 0.25);
  softEllipse(px, CX, 160, 8, 8, hex('#ffffff', 0.5), 0.4);
  return px;
});
saveItem('mana', () => {
  const px = blank();
  softEllipse(px, CX, 220, 50, 14, hex('#000000', 0.25), 0.55);
  softCapsule(px, CX, 55, CX, 95, 16, hex('#37474f'));
  softEllipse(px, CX, 150, 52, 70, hex('#0d47a1'), 0.22);
  softEllipse(px, CX, 145, 42, 58, hex('#42a5f5'), 0.2);
  softEllipse(px, CX - 16, 115, 12, 28, hex('#bbdefb', 0.8), 0.4);
  softEllipse(px, CX, 55, 24, 14, hex('#90a4ae'), 0.25);
  softEllipse(px, CX, 42, 16, 10, hex('#eceff1'), 0.25);
  softEllipse(px, CX, 160, 8, 8, hex('#ffffff', 0.5), 0.4);
  return px;
});

console.log('Done gear icons →', path.join(PUBLIC, 'gear'));
