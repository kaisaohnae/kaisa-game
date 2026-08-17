/**
 * Todie pixel art generator
 * - jobs/<job>/actions : underwear body only (no weapon)
 * - public/todie/gear/<job>/<tier>/<id>.png : inventory icon + wear overlay
 * Run: npm run todie:sprites
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC_GEAR = path.join(ROOT, '..', '..', '..', 'public', 'todie', 'gear');
const SIZE = 48;

const C = {
  _: [0, 0, 0, 0],
  K: [28, 24, 32, 255],
  Skin: [242, 198, 162, 255],
  SkinD: [210, 150, 120, 255],
  SkinH: [255, 220, 190, 255],
  PantB: [70, 120, 210, 255],
  PantP: [130, 80, 180, 255],
  Wood: [150, 95, 48, 255],
  WoodD: [100, 60, 28, 255],
  WoodH: [190, 130, 70, 255],
  W: [236, 240, 245, 255],
  S: [170, 180, 195, 255],
  Sd: [110, 120, 135, 255],
  B: [70, 130, 220, 255],
  Bh: [120, 170, 245, 255],
  Br: [120, 75, 40, 255],
  P: [120, 70, 170, 255],
  Pd: [75, 40, 120, 255],
  Ph: [160, 110, 210, 255],
  Gem: [80, 230, 255, 255],
  Gem2: [255, 240, 120, 255],
  Y: [255, 220, 90, 255],
  Or: [255, 160, 80, 255],
  G: [90, 200, 140, 255],
  Wh: [255, 255, 255, 255],
  Hair: [60, 42, 30, 255],
  Gold: [255, 202, 40, 255],
  Pink: [255, 138, 101, 255],
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
    chunk('IDAT', zlib.deflateSync(raw, {level: 9})),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function blank() {
  return new Uint8ClampedArray(SIZE * SIZE * 4);
}

function set(px, x, y, rgba) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  px[i] = rgba[0];
  px[i + 1] = rgba[1];
  px[i + 2] = rgba[2];
  px[i + 3] = rgba[3];
}

function fill(px, x0, y0, x1, y1, rgba) {
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) set(px, x, y, rgba);
}

function oval(px, cx, cy, rx, ry, rgba) {
  for (let y = -ry; y <= ry; y += 1) {
    for (let x = -rx; x <= rx; x += 1) {
      if (x * x * ry * ry + y * y * rx * rx <= rx * rx * ry * ry) set(px, cx + x, cy + y, rgba);
    }
  }
}

function outlineDots(px, color = C.K) {
  const out = blank();
  out.set(px);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const i = (y * SIZE + x) * 4;
      if (px[i + 3] < 128) continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
        if (px[(ny * SIZE + nx) * 4 + 3] < 128) set(out, nx, ny, color);
      }
    }
  }
  return out;
}

function saveRel(rel, px) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, encodePng(px));
  console.log('wrote', rel);
}

function saveGear(job, tier, id, px) {
  const out = path.join(PUBLIC_GEAR, job, tier, `${id}.png`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, encodePng(px));
  console.log('wrote public', `todie/gear/${job}/${tier}/${id}.png`);
}

/** Underwear only — no weapon */
function bodyBase(opts = {}) {
  const {leg = 0, roll = false, pant = C.PantB} = opts;
  const px = blank();
  const cy = 24 + leg;
  fill(px, 17, cy + 6, 20, cy + 11, C.Skin);
  fill(px, 26, cy + 6, 29, cy + 11, C.Skin);
  fill(px, 17, cy + 10, 20, cy + 11, C.SkinD);
  fill(px, 26, cy + 10, 29, cy + 11, C.SkinD);
  oval(px, 23, cy + 4, 8, 5, pant);
  fill(px, 18, cy + 2, 28, cy + 5, pant);
  fill(px, 20, cy + 1, 26, cy + 2, C.Wh);
  oval(px, 23, cy - 4, 8, 7, C.SkinD);
  oval(px, 23, cy - 5, 7, 6, C.Skin);
  oval(px, 23, cy - 6, 4, 3, C.SkinH);
  fill(px, 12, cy - 6, 15, cy + 2, C.Skin);
  fill(px, 31, cy - 6, 34, cy + 2, C.Skin);
  oval(px, 23, cy - 14, 7, 6, C.SkinD);
  oval(px, 23, cy - 15, 6, 5, C.Skin);
  oval(px, 23, cy - 16, 4, 3, C.SkinH);
  fill(px, 20, cy - 20, 26, cy - 18, C.Hair);
  set(px, 23, cy - 21, C.Hair);
  if (roll) {
    for (let a = 0; a < 16; a += 1) {
      const ang = (a / 16) * Math.PI * 2;
      set(px, Math.round(23 + Math.cos(ang) * 20), Math.round(24 + Math.sin(ang) * 20), C.WoodH);
    }
  }
  return outlineDots(px);
}

function wearStick() {
  const px = blank();
  fill(px, 35, 8, 37, 30, C.Wood);
  fill(px, 35, 8, 37, 10, C.WoodH);
  fill(px, 35, 28, 37, 30, C.WoodD);
  return outlineDots(px);
}

function wearSword(hero = false) {
  const px = blank();
  const blade = hero ? C.Y : C.W;
  fill(px, 35, 4, 37, 28, blade);
  fill(px, 35, 4, 37, 7, C.Wh);
  fill(px, 33, 26, 39, 28, C.Br);
  if (hero) oval(px, 36, 6, 2, 2, C.Gold);
  return outlineDots(px);
}

function wearStaff(hero = false) {
  const px = blank();
  fill(px, 35, 12, 37, 32, C.Wood);
  oval(px, 36, 8, hero ? 5 : 4, hero ? 5 : 4, hero ? C.Gem2 : C.Gem);
  set(px, 36, 8, C.Wh);
  return outlineDots(px);
}

function wearHead(kind) {
  const px = blank();
  if (kind === 'cloth' || kind === 'cap') {
    oval(px, 23, 8, 8, 4, kind === 'cap' ? C.Ph : C.Sd);
    fill(px, 16, 8, 30, 10, kind === 'cap' ? C.P : C.S);
  } else if (kind === 'helm') {
    oval(px, 23, 9, 8, 6, C.Sd);
    oval(px, 23, 8, 7, 5, C.S);
    fill(px, 17, 9, 29, 10, C.K);
    fill(px, 21, 3, 25, 6, C.B);
  } else if (kind === 'hat') {
    oval(px, 23, 12, 12, 4, C.Pd);
    fill(px, 20, 2, 26, 12, C.P);
    set(px, 23, 1, C.Ph);
  } else if (kind === 'crown') {
    fill(px, 16, 6, 30, 10, C.Gold);
    set(px, 18, 4, C.Y);
    set(px, 23, 3, C.Wh);
    set(px, 28, 4, C.Y);
  } else if (kind === 'circlet') {
    fill(px, 16, 8, 30, 10, C.Ph);
    set(px, 23, 6, C.Gem);
  }
  return outlineDots(px);
}

function wearArmor(kind) {
  const px = blank();
  if (kind === 'vest' || kind === 'ragged') {
    oval(px, 23, 20, 9, 7, C.Br);
    fill(px, 15, 16, 31, 22, C.Br);
  } else if (kind === 'plate' || kind === 'blue') {
    oval(px, 23, 20, 10, 8, C.Sd);
    oval(px, 23, 19, 9, 7, C.B);
    fill(px, 18, 15, 28, 17, C.W);
  } else if (kind === 'robe' || kind === 'plain') {
    oval(px, 23, 22, 10, 9, C.Pd);
    oval(px, 23, 20, 9, 8, C.P);
  } else if (kind === 'hero_plate') {
    oval(px, 23, 20, 10, 8, C.Pink);
    fill(px, 18, 14, 28, 16, C.Gold);
  } else if (kind === 'hero_robe') {
    oval(px, 23, 22, 11, 10, C.Ph);
    fill(px, 18, 14, 28, 16, C.Gem);
  }
  return outlineDots(px);
}

function wearGloves(c1, c2 = c1) {
  const px = blank();
  fill(px, 11, 16, 15, 22, c1);
  fill(px, 31, 16, 35, 22, c2);
  return outlineDots(px);
}

function wearShoes(c1) {
  const px = blank();
  fill(px, 16, 32, 21, 36, c1);
  fill(px, 25, 32, 30, 36, c1);
  return outlineDots(px);
}

function wearNecklace(c) {
  const px = blank();
  set(px, 23, 16, c);
  set(px, 22, 17, c);
  set(px, 24, 17, c);
  return outlineDots(px);
}

function wearEarring(side, c) {
  const px = blank();
  const x = side === 'l' ? 15 : 31;
  set(px, x, 12, c);
  set(px, x, 13, C.Wh);
  return outlineDots(px);
}

function wearRing(side, c) {
  const px = blank();
  const x = side === 'l' ? 13 : 33;
  set(px, x, 20, c);
  set(px, x, 21, C.Wh);
  return outlineDots(px);
}

function skillSlash() {
  const px = blank();
  for (let i = 0; i < 18; i += 1) {
    const t = i / 17;
    set(px, 8 + Math.round(t * 28), 34 - Math.round(t * 22), C.Y);
  }
  return outlineDots(px);
}
function skillSpin() {
  const px = blank();
  for (let a = 0; a < 28; a += 1) {
    const ang = (a / 28) * Math.PI * 2;
    set(px, Math.round(23 + Math.cos(ang) * 14), Math.round(23 + Math.sin(ang) * 14), a % 2 ? C.Y : C.Or);
  }
  return outlineDots(px);
}
function skillBash() {
  const px = blank();
  fill(px, 6, 21, 28, 25, C.Or);
  fill(px, 26, 17, 38, 29, C.Y);
  return outlineDots(px);
}
function skillBolt() {
  const px = blank();
  oval(px, 23, 23, 7, 7, C.Gem);
  oval(px, 23, 23, 3, 3, C.Wh);
  return outlineDots(px);
}
function skillNova() {
  const px = blank();
  oval(px, 23, 23, 16, 16, C.P);
  oval(px, 23, 23, 8, 8, C.Ph);
  return outlineDots(px);
}
function skillShield() {
  const px = blank();
  oval(px, 23, 23, 14, 14, C.G);
  return outlineDots(px);
}

// —— body ——
saveRel('jobs/warrior/actions/idle.png', bodyBase({pant: C.PantB}));
saveRel('jobs/warrior/actions/walk.png', bodyBase({pant: C.PantB, leg: 1}));
saveRel('jobs/warrior/actions/roll.png', bodyBase({pant: C.PantB, roll: true, leg: -1}));
saveRel('jobs/warrior/skills/slash.png', skillSlash());
saveRel('jobs/warrior/skills/spin.png', skillSpin());
saveRel('jobs/warrior/skills/bash.png', skillBash());

saveRel('jobs/mage/actions/idle.png', bodyBase({pant: C.PantP}));
saveRel('jobs/mage/actions/walk.png', bodyBase({pant: C.PantP, leg: 1}));
saveRel('jobs/mage/actions/roll.png', bodyBase({pant: C.PantP, roll: true, leg: -1}));
saveRel('jobs/mage/skills/bolt.png', skillBolt());
saveRel('jobs/mage/skills/nova.png', skillNova());
saveRel('jobs/mage/skills/shield.png', skillShield());

// —— warrior gear ——
saveGear('warrior', 'basic', 'stick', wearStick());
saveGear('warrior', 'basic', 'cloth_wrap', wearHead('cloth'));
saveGear('warrior', 'basic', 'ragged_vest', wearArmor('ragged'));
saveGear('warrior', 'basic', 'wrap_gloves', wearGloves(C.Br));
saveGear('warrior', 'basic', 'straw_shoes', wearShoes(C.Br));

saveGear('warrior', 'unique', 'iron_sword', wearSword(false));
saveGear('warrior', 'unique', 'knight_helm', wearHead('helm'));
saveGear('warrior', 'unique', 'blue_plate', wearArmor('blue'));
saveGear('warrior', 'unique', 'iron_gauntlets', wearGloves(C.S, C.Sd));
saveGear('warrior', 'unique', 'march_boots', wearShoes(C.Sd));
saveGear('warrior', 'unique', 'courage_pendant', wearNecklace(C.Gold));
saveGear('warrior', 'unique', 'battle_ear_l', wearEarring('l', C.Or));
saveGear('warrior', 'unique', 'battle_ear_r', wearEarring('r', C.Y));
saveGear('warrior', 'unique', 'power_ring_l', wearRing('l', C.Or));
saveGear('warrior', 'unique', 'power_ring_r', wearRing('r', C.Pink));

saveGear('warrior', 'hero', 'wasteland_blade', wearSword(true));
saveGear('warrior', 'hero', 'war_crown', wearHead('crown'));
saveGear('warrior', 'hero', 'hero_plate', wearArmor('hero_plate'));
saveGear('warrior', 'hero', 'hero_gauntlets', wearGloves(C.Gold, C.Pink));
saveGear('warrior', 'hero', 'hero_greaves', wearShoes(C.Gold));

// —— mage gear ——
saveGear('mage', 'basic', 'stick', wearStick());
saveGear('mage', 'basic', 'apprentice_cap', wearHead('cap'));
saveGear('mage', 'basic', 'plain_robe', wearArmor('plain'));
saveGear('mage', 'basic', 'soft_gloves', wearGloves(C.Ph));
saveGear('mage', 'basic', 'cloth_shoes', wearShoes(C.Pd));

saveGear('mage', 'unique', 'crystal_staff', wearStaff(false));
saveGear('mage', 'unique', 'wizard_hat', wearHead('hat'));
saveGear('mage', 'unique', 'arcane_robe', wearArmor('robe'));
saveGear('mage', 'unique', 'silk_gloves', wearGloves(C.Ph, C.P));
saveGear('mage', 'unique', 'mana_boots', wearShoes(C.P));
saveGear('mage', 'unique', 'wisdom_pendant', wearNecklace(C.Gem));
saveGear('mage', 'unique', 'mana_ear_l', wearEarring('l', C.G));
saveGear('mage', 'unique', 'mana_ear_r', wearEarring('r', C.Gem));
saveGear('mage', 'unique', 'mind_ring_l', wearRing('l', C.Gem));
saveGear('mage', 'unique', 'mind_ring_r', wearRing('r', C.Bh));

function saveItem(id, px) {
  const out = path.join(ROOT, '..', '..', '..', 'public', 'todie', 'items', `${id}.png`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, encodePng(px));
  console.log('wrote public', `todie/items/${id}.png`);
}

/** Round potion flask — liquid color + cork */
function itemPotion(liquid, liquidHi) {
  const px = blank();
  // cork
  fill(px, 20, 8, 27, 12, C.Br);
  fill(px, 21, 7, 26, 8, C.WoodH);
  // neck
  fill(px, 21, 12, 26, 18, C.W);
  // body
  oval(px, 23, 30, 12, 14, C.W);
  oval(px, 23, 31, 10, 12, liquid);
  oval(px, 20, 26, 3, 4, liquidHi);
  // shine
  set(px, 18, 24, C.Wh);
  set(px, 19, 25, C.Wh);
  return outlineDots(px);
}

function itemScroll() {
  const px = blank();
  fill(px, 14, 12, 34, 36, C.Y);
  fill(px, 16, 14, 32, 34, C.Wh);
  fill(px, 18, 18, 30, 19, C.Or);
  fill(px, 18, 23, 28, 24, C.Or);
  fill(px, 18, 28, 26, 29, C.Or);
  return outlineDots(px);
}

saveGear('mage', 'hero', 'wasteland_staff', wearStaff(true));
saveGear('mage', 'hero', 'arcane_circlet', wearHead('circlet'));
saveGear('mage', 'hero', 'hero_robe', wearArmor('hero_robe'));
saveGear('mage', 'hero', 'hero_gloves', wearGloves(C.Gem, C.Ph));
saveGear('mage', 'hero', 'hero_slippers', wearShoes(C.Gem2));

// consumable icons
saveItem('potion', itemPotion([220, 60, 70, 255], [255, 140, 150, 255]));
saveItem('mana', itemPotion([50, 120, 230, 255], [140, 200, 255, 255]));
saveItem('scroll', itemScroll());

console.log('done — body + tiered gear overlays + items');
