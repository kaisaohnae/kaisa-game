/**
 * Rough placeholder sprites for the 10 new stage2/3 monsters (5 + 5).
 * Intentionally simple procedural silhouettes — meant to be regenerated
 * properly later via /studio (PixelLab API), see scripts/pixellab-studio/manifest.mjs.
 * Run: node src/games/todie/scripts/gen-stage-mobs.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', '..', '..', '..', 'public', 'todie', 'mobs');
const SIZE = 256;
const CX = 128;
const CY = 140;

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
      const cov = d > softIn ? 1 - (d - softIn) / (soft + 1e-4) : 1;
      if (cov > 0) blend(px, x, y, r, g, b, a * cov);
    }
  }
}
function glow(px, cx, cy, r, rgba) {
  softEllipse(px, cx, cy, r, r, rgba, 0.9);
}
function outline(px, rgba = [15, 12, 10, 235], width = 2.2) {
  const out = blank();
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
function shade(px, cx, cy, rx, ry, base, dark, light) {
  softEllipse(px, cx, cy, rx, ry, base, 0.22);
  softEllipse(px, cx + rx * 0.12, cy + ry * 0.18, rx * 0.95, ry * 0.95, dark, 0.28);
  softEllipse(px, cx - rx * 0.28, cy - ry * 0.32, rx * 0.42, ry * 0.36, light, 0.35);
}

/** 눈 두 개 */
function eyes(px, cx, cy, spread, size, color) {
  softEllipse(px, cx - spread, cy, size, size * 1.15, color, 0.2);
  softEllipse(px, cx + spread, cy, size, size * 1.15, color, 0.2);
}

function humanoid(px, cfg) {
  const {bodyBase, bodyDark, bodyLight, headBase, headDark, eyeColor, hood} = cfg;
  // ground shadow
  softEllipse(px, CX, CY + 92, 66, 16, hex('#000000', 0.35), 0.5);
  // arms
  shade(px, CX - 68, CY + 6, 26, 44, bodyBase, bodyDark, bodyLight);
  shade(px, CX + 68, CY + 6, 26, 44, bodyBase, bodyDark, bodyLight);
  // body (robe/torso)
  shade(px, CX, CY + 34, 62, 62, bodyBase, bodyDark, bodyLight);
  // head / hood
  shade(px, CX, CY - 46, 46, hood ? 50 : 42, headBase, headDark, hex('#ffffff', 0.12));
  if (hood) {
    // hood shadow across upper face
    softEllipse(px, CX, CY - 58, 40, 26, hex('#000000', 0.4), 0.4);
  }
  eyes(px, CX, CY - 40, 15, 6, eyeColor);
  // legs
  shade(px, CX - 24, CY + 92, 18, 26, bodyDark, bodyDark, bodyLight);
  shade(px, CX + 24, CY + 92, 18, 26, bodyDark, bodyDark, bodyLight);
}

function ghost(px, cfg) {
  const {bodyBase, bodyDark, bodyLight, eyeColor} = cfg;
  softEllipse(px, CX, CY + 88, 60, 14, hex('#000000', 0.25), 0.6);
  // wispy tail bits
  for (const [dx, w] of [[-40, 16], [0, 22], [40, 16]]) {
    softEllipse(px, CX + dx, CY + 86, w, 26, bodyBase, 0.3);
  }
  // body teardrop
  shade(px, CX, CY - 10, 62, 78, bodyBase, bodyDark, bodyLight);
  softEllipse(px, CX, CY - 66, 50, 40, bodyBase, 0.22);
  eyes(px, CX, CY - 30, 16, 7, eyeColor);
  // outer glow (ghostly)
  glow(px, CX, CY - 10, 100, [...bodyBase.slice(0, 3), 40]);
}

function quad(px, cfg) {
  const {bodyBase, bodyDark, bodyLight, eyeColor, mane} = cfg;
  softEllipse(px, CX, CY + 78, 78, 16, hex('#000000', 0.35), 0.5);
  // legs
  for (const dx of [-56, -22, 22, 56]) {
    shade(px, CX + dx, CY + 70, 14, 34, bodyDark, bodyDark, bodyLight);
  }
  // body
  shade(px, CX, CY + 20, 78, 42, bodyBase, bodyDark, bodyLight);
  // tail
  shade(px, CX + 82, CY + 4, 16, 30, bodyBase, bodyDark, bodyLight);
  // head
  shade(px, CX - 76, CY - 4, 34, 30, bodyBase, bodyDark, bodyLight);
  // ears / mane
  if (mane) {
    for (let i = 0; i < 5; i += 1) {
      const a = -0.6 + i * 0.3;
      softEllipse(
        px,
        CX - 76 + Math.sin(a) * 18,
        CY - 30 - Math.cos(a) * 14,
        7,
        16,
        mane,
        0.3,
      );
    }
  } else {
    softEllipse(px, CX - 90, CY - 26, 8, 16, bodyDark, 0.3);
    softEllipse(px, CX - 62, CY - 26, 8, 16, bodyDark, 0.3);
  }
  eyes(px, CX - 82, CY - 6, 10, 5, eyeColor);
}

function eliteOverlay(px, accent) {
  // crown-ish spikes + brighter rim glow to signal "elite"
  glow(px, CX, CY - 20, 130, [...accent.slice(0, 3), 55]);
  for (let i = 0; i < 5; i += 1) {
    const a = -1.3 + i * 0.55;
    const bx = CX + Math.sin(a) * 34;
    const by = CY - 96 - Math.cos(a) * 10;
    softEllipse(px, bx, by, 6, 16, accent, 0.35);
  }
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    softEllipse(px, CX + Math.cos(a) * 108, CY + Math.sin(a) * 108, 3, 3, hex('#ffffff', 0.8), 0.4);
  }
}

const MONSTERS = [
  {
    id: 'ghoul',
    kind: 'humanoid',
    cfg: {
      bodyBase: hex('#4c6b2f'),
      bodyDark: hex('#2f4a1c'),
      bodyLight: hex('#8bab5c'),
      headBase: hex('#5c7a3a'),
      headDark: hex('#33501e'),
      eyeColor: hex('#ffee58'),
      hood: false,
    },
    accent: hex('#c6ff00'),
  },
  {
    id: 'wraith',
    kind: 'ghost',
    cfg: {
      bodyBase: hex('#8ea6b8', 0.85),
      bodyDark: hex('#5c7385', 0.85),
      bodyLight: hex('#e3f2fd', 0.6),
      eyeColor: hex('#80d8ff'),
    },
    accent: hex('#80d8ff'),
  },
  {
    id: 'skeleton',
    kind: 'humanoid',
    cfg: {
      bodyBase: hex('#d7ccc8'),
      bodyDark: hex('#8d6e63'),
      bodyLight: hex('#fff8e1'),
      headBase: hex('#efebe4'),
      headDark: hex('#a1887f'),
      eyeColor: hex('#ff5252'),
      hood: false,
    },
    accent: hex('#ffd54f'),
  },
  {
    id: 'banshee',
    kind: 'ghost',
    cfg: {
      bodyBase: hex('#b39ddb', 0.85),
      bodyDark: hex('#6a4c93', 0.85),
      bodyLight: hex('#f3e5f5', 0.6),
      eyeColor: hex('#e040fb'),
    },
    accent: hex('#e040fb'),
  },
  {
    id: 'direwolf',
    kind: 'quad',
    cfg: {
      bodyBase: hex('#37474f'),
      bodyDark: hex('#1c262b'),
      bodyLight: hex('#78909c'),
      eyeColor: hex('#ff1744'),
      mane: null,
    },
    accent: hex('#ff1744'),
  },
  {
    id: 'reaper',
    kind: 'humanoid',
    cfg: {
      bodyBase: hex('#212121'),
      bodyDark: hex('#000000'),
      bodyLight: hex('#4a4a4a'),
      headBase: hex('#1a1a1a'),
      headDark: hex('#000000'),
      eyeColor: hex('#ff6d00'),
      hood: true,
    },
    accent: hex('#ff6d00'),
  },
  {
    id: 'lich',
    kind: 'humanoid',
    cfg: {
      bodyBase: hex('#6a1b9a'),
      bodyDark: hex('#38105a'),
      bodyLight: hex('#ce93d8'),
      headBase: hex('#e0d6c3'),
      headDark: hex('#a1887f'),
      eyeColor: hex('#69f0ae'),
      hood: true,
    },
    accent: hex('#69f0ae'),
  },
  {
    id: 'deathknight',
    kind: 'humanoid',
    cfg: {
      bodyBase: hex('#4a0e0e'),
      bodyDark: hex('#210404'),
      bodyLight: hex('#8d3b3b'),
      headBase: hex('#2c2c2c'),
      headDark: hex('#000000'),
      eyeColor: hex('#ff1744'),
      hood: false,
    },
    accent: hex('#ff1744'),
  },
  {
    id: 'nightmare',
    kind: 'quad',
    cfg: {
      bodyBase: hex('#1a0033'),
      bodyDark: hex('#000000'),
      bodyLight: hex('#6a1b9a'),
      eyeColor: hex('#ff3d00'),
      mane: hex('#ff3d00', 0.75),
    },
    accent: hex('#ff3d00'),
  },
  {
    id: 'wight',
    kind: 'humanoid',
    cfg: {
      bodyBase: hex('#5c6bc0'),
      bodyDark: hex('#283593'),
      bodyLight: hex('#c5cae9'),
      headBase: hex('#c5cae9'),
      headDark: hex('#7986cb'),
      eyeColor: hex('#e1f5fe'),
      hood: false,
    },
    accent: hex('#e1f5fe'),
  },
];

function drawOne(mon, elite) {
  const px = blank();
  glow(px, CX, CY - 10, 118, [...mon.accent.slice(0, 3), elite ? 45 : 24]);
  if (mon.kind === 'humanoid') humanoid(px, mon.cfg);
  else if (mon.kind === 'ghost') ghost(px, mon.cfg);
  else quad(px, mon.cfg);
  if (elite) eliteOverlay(px, mon.accent);
  return outline(px);
}

fs.mkdirSync(PUBLIC, {recursive: true});
for (const mon of MONSTERS) {
  const normal = drawOne(mon, false);
  fs.writeFileSync(path.join(PUBLIC, `${mon.id}.png`), encodePng(normal));
  const elite = drawOne(mon, true);
  fs.writeFileSync(path.join(PUBLIC, `${mon.id}_elite.png`), encodePng(elite));
  console.log('wrote', mon.id, '+ elite');
}
console.log('done —', MONSTERS.length * 2, 'sprites written to', PUBLIC);
