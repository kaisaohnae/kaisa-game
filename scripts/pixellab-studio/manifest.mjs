import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/** @typedef {'sync_character' | 'generate_character' | 'generate_character_state' | 'pixflux' | 'tileset'} ManifestType */

/** @typedef {'todie' | 'car-run' | 'plane-shoot'} GameId */

/** @typedef {{ job: string, action: string }} CharacterInstall */

/** @typedef {{ path: string }} FileInstall */

/**
 * @typedef {object} ManifestItem
 * @property {string} id
 * @property {GameId} game
 * @property {string} category
 * @property {string} label
 * @property {ManifestType} type
 * @property {string} [description]
 * @property {string} [characterId]
 * @property {string} [baseCharacterId]
 * @property {string} [stateName]
 * @property {{ width: number, height: number }} [imageSize]
 * @property {CharacterInstall} [characterInstall]
 * @property {FileInstall} [fileInstall]
 */

export const PRECOMPLETED_IDS = new Set([]);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const itemsJson = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', '..', 'src', 'games', 'todie', 'settings', 'items.json'),
    'utf8',
  ),
);

const STYLE_SUFFIX =
  ', top-down pixel art, CraftPix RPG style, 16-bit retro game asset, limited color palette, crisp pixels, transparent background';

const CAR_STYLE =
  ', top-down overhead view looking straight down, vehicle nose pointing DOWN toward bottom of image (6 o clock), headlights at BOTTOM, rear bumper at TOP, Unlucky Studio style topdown vehicle sprite, retro arcade racing game, crisp pixels, transparent background';

const PLANE_STYLE =
  ', top-down overhead view looking straight down, airplane nose pointing UP toward top of image (12 o clock), cockpit near front/top, engines and tail at BOTTOM, retro arcade shooter sprite, crisp pixels, transparent background';

const HEART_STYLE =
  ', cute pixel heart pickup icon for racing game HUD, bright red heart with soft shine, centered, transparent background, no text';

const PLANE_HEART_STYLE =
  ', cute pixel heart pickup icon for airplane shooter HUD, bright red heart with soft shine, centered, transparent background, no text';

const TIER_VISUAL = {
  basic: 'simple worn starter gear',
  ascend: 'refined mid-tier gear with clean metal or arcane trim',
  unique: 'rare golden accent accessory',
  hero: 'epic orange glowing hero tier equipment',
  mythic: 'legendary purple void mythic equipment with dark aura',
};

const JOB_LABEL = {warrior: '검사', mage: '법사'};
const TIER_LABEL = {
  basic: '기본',
  ascend: '전승',
  unique: '유일',
  hero: '영웅',
  mythic: '신화',
};

/** @type {ManifestItem[]} */
export const MANIFEST = [
  // ── Todie: 캐릭터·스킬FX·몬스터는 로컬 에셋 유지 (스튜디오 목록에서 제외) ──

  // ── Todie: 히트 임팩트 FX ──
  ...todieHitFxAll(),

  // ── Todie: 소모품 ──
  ...todieConsumable('potion', '체력포션', 'red health potion bottle icon, heart label, glass shine, 48x48 inventory icon'),
  ...todieConsumable('mana', '마나포션', 'blue mana potion bottle icon, glowing liquid, 48x48 inventory icon'),

  // ── Todie: 장비 (items.json) ──
  ...buildTodieGearManifest(),

  // ── Car Run: 차량 (에셋 6시 / 플레이어는 게임에서 12시로 회전, 장애물은 6시 유지) ──
  ...carStatic('viper', '바이퍼', 'sleek black sports car top-down, roof windshield headlights at bottom'),
  ...carStatic('truck', '트럭', 'large delivery truck top-down, cab at bottom cargo box at top'),
  ...carStatic('audi', '아우디', 'silver luxury sedan top-down, headlights at bottom'),
  ...carStatic('taxi', '택시', 'yellow taxi cab top-down, headlights at bottom, roof light'),
  ...carStatic('car', '심플카', 'compact red hatchback top-down, headlights at bottom'),
  ...carStatic('mini-truck', '미니트럭', 'small pickup truck top-down, cab at bottom open bed at top'),
  ...carStatic('mini-van', '미니밴', 'white mini van top-down, headlights at bottom'),
  ...carStatic('police', '경찰차', 'police car top-down, roof light bar, headlights at bottom'),
  ...carStatic('ambulance', '구급차', 'white ambulance van top-down, red cross on roof, headlights at bottom'),
  ...carStatic('excavator', '포크레인', 'yellow construction excavator digger top-down, cabin and boom arm, headlights at bottom'),
  ...carStatic('tank', '탱크', 'military green tank top-down, turret and tracks, cannon facing bottom (6 o clock)'),

  // ── Car Run: 하트 픽업 (소형 프롭 장애물은 게임에서 미사용) ──
  ...carHeart(),

  // ── Plane Shoot: 플레이어 기체 3 (에셋 12시 / 적기는 게임에서 6시로 회전) ──
  ...planeStatic('jet-blue', '블루제트', 'sleek blue fighter jet top-down, nose at top, twin engines at bottom', 'player'),
  ...planeStatic('jet-red', '레드에이스', 'red ace fighter jet top-down, nose at top, yellow accents', 'player'),
  ...planeStatic('jet-green', '그린윙', 'green wing fighter jet top-down, nose at top, soft cockpit glow', 'player'),

  // ── Plane Shoot: 적기 10 ──
  ...planeStatic('scout', '스카웃', 'small gray scout plane top-down, nose at top', 'enemy'),
  ...planeStatic('drone', '드론', 'wide gray combat drone top-down, nose sensors at top', 'enemy'),
  ...planeStatic('raider', '레이더', 'purple raider fighter top-down, nose at top', 'enemy'),
  ...planeStatic('bomber', '밤버', 'heavy brown bomber plane top-down, wide wings, nose at top', 'enemy'),
  ...planeStatic('stealth', '스텔스', 'dark stealth fighter top-down, angular wings, nose at top', 'enemy'),
  ...planeStatic('biplane', '복엽기', 'orange biplane top-down, double wings, nose at top', 'enemy'),
  ...planeStatic('yellow-jet', '옐로제트', 'bright yellow jet top-down, nose at top', 'enemy'),
  ...planeStatic('cargo', '카고', 'gray cargo transport plane top-down, bulky body, nose at top', 'enemy'),
  ...planeStatic('dark-ace', '다크에이스', 'black ace fighter top-down, red accents, nose at top', 'enemy'),
  ...planeStatic('titan', '타이탄', 'large blue titan warplane top-down, wide wings, nose at top', 'enemy'),

  ...planeHeart(),

  // ── Plane Shoot: 발사체 ──
  ...planeProjectile(
    'basic',
    '기본탄',
    'yellow energy bolt projectile for airplane shooter, pointed tip up, glowing trail, transparent background',
  ),
  ...planeProjectile(
    'spread',
    '스프레드탄',
    'cyan triple-arrow spread shot projectile icon for airplane shooter, three blue darts, transparent background',
  ),
  ...planeProjectile(
    'laser',
    '레이저',
    'bright green laser beam projectile vertical for airplane shooter, neon glow, transparent background',
  ),
  ...planeProjectile(
    'plasma',
    '플라즈마',
    'purple plasma orb projectile for airplane shooter, glowing violet core, transparent background',
  ),
  ...planeProjectile(
    'star',
    '스타샷',
    'golden sparkling star projectile for airplane shooter, ornate glowing star, transparent background',
  ),
  ...planeProjectile(
    'enemy-bolt',
    '적탄',
    'red enemy bolt projectile for airplane shooter, tip pointing down, hostile glow, transparent background',
  ),

  // ── Plane Shoot: 무기 변경 아이템 ──
  ...planeWeaponItem(
    'weapon-spread',
    '아이템: 스프레드',
    'cute power-up pickup icon letter S for spread weapon, cyan circular badge, arcade shooter item, transparent background',
  ),
  ...planeWeaponItem(
    'weapon-laser',
    '아이템: 레이저',
    'cute power-up pickup icon letter L for laser weapon, green circular badge, arcade shooter item, transparent background',
  ),
  ...planeWeaponItem(
    'weapon-plasma',
    '아이템: 플라즈마',
    'cute power-up pickup icon letter P for plasma weapon, purple circular badge, arcade shooter item, transparent background',
  ),
  ...planeWeaponItem(
    'weapon-star',
    '아이템: 스타샷',
    'cute power-up pickup icon golden star badge for star weapon, arcade shooter item, transparent background',
  ),
];

/**
 * Shared description builder for one biome's A~F tile family — always emphasizes
 * seamless self-tiling AND natural blending with its sibling variants, so any mix
 * of the set placed edge-to-edge reads as one continuous surface (no seams).
 * @param {string} biomeEn @param {string} hex @param {string} detail
 */
function tileFamilyDesc(biomeEn, hex, detail) {
  return (
    `seamless tileable top-down ${biomeEn} floor tile, ${hex} base tone, ${detail}, ` +
    `NO border or frame, tiles seamlessly with itself on all 4 edges, and must blend ` +
    `naturally with the other variants in the same ${biomeEn} tile family (same palette ` +
    `and lighting, only subtle texture differences) so tiles from the set placed edge-to-edge ` +
    `in any combination read as one continuous ${biomeEn} surface with no visible seams, ` +
    `flat overhead RPG tileset`
  );
}

/** @param {string} id @param {string} label @param {string} desc */
function todieTile(id, label, desc) {
  return [
    {
      id: `tile-${id}`,
      game: 'todie',
      category: 'tile',
      label,
      type: 'pixflux',
      description: `${desc}${STYLE_SUFFIX}`,
      imageSize: {width: 64, height: 64},
      fileInstall: {path: `public/todie/tiles/${id}.png`},
    },
  ];
}

/** @param {string} id @param {string} label @param {string} desc */
function todieObject(id, label, desc) {
  return [
    {
      id: `obj-${id}`,
      game: 'todie',
      category: 'object',
      label: `맵오브젝트: ${label}`,
      type: 'pixflux',
      description: `${desc}${STYLE_SUFFIX}`,
      imageSize: {width: 64, height: 64},
      fileInstall: {path: `public/todie/objects/${id}.png`},
    },
  ];
}

/** Larger map object (buildings/shops) — bigger canvas for more structural detail. @param {string} id @param {string} label @param {string} desc */
function todieBuilding(id, label, desc) {
  return [
    {
      id: `obj-${id}`,
      game: 'todie',
      category: 'object',
      label: `맵오브젝트: ${label}`,
      type: 'pixflux',
      description: `${desc}${STYLE_SUFFIX}`,
      imageSize: {width: 128, height: 128},
      fileInstall: {path: `public/todie/objects/${id}.png`},
    },
  ];
}

/** @param {string} id @param {string} label @param {string} desc */
function todieConsumable(id, label, desc) {
  return [
    {
      id: `item-${id}`,
      game: 'todie',
      category: 'item',
      label,
      type: 'pixflux',
      description: `${desc}${STYLE_SUFFIX}`,
      imageSize: {width: 48, height: 48},
      fileInstall: {path: `public/todie/items/${id}.png`},
    },
  ];
}

function todieHitFxAll() {
  const style =
    ', top-down RPG impact VFX only, no character no UI, centered, crisp pixels, transparent background, CraftPix style';
  return [
    {
      id: 'fx-hit',
      game: 'todie',
      category: 'hit-fx',
      label: '히트FX · 적중',
      type: 'pixflux',
      description: `top-down RPG hit impact spark burst, yellow-white star flash, short slash sparks${style}`,
      imageSize: {width: 64, height: 64},
      fileInstall: {path: 'public/common/fx/hit.png'},
    },
    {
      id: 'fx-hit-splash',
      game: 'todie',
      category: 'hit-fx',
      label: '히트FX · 스플래시',
      type: 'pixflux',
      description: `top-down RPG splash damage impact, soft orange ring burst with sparks${style}`,
      imageSize: {width: 64, height: 64},
      fileInstall: {path: 'public/common/fx/hit-splash.png'},
    },
  ];
}

/** @param {string} job @param {string} tier @param {{ id: string, name: string, slot: string, droppable?: boolean }} gear */
function gearDescription(job, tier, gear) {
  const tierVisual = TIER_VISUAL[tier] ?? tier;
  const slot = gear.slot;
  const name = gear.name;
  const base =
    slot === 'weapon'
      ? job === 'warrior'
        ? `RPG inventory gear icon, ${name}, sword or blade weapon`
        : `RPG inventory gear icon, ${name}, magic staff or wand`
      : slot === 'head'
        ? `RPG inventory gear icon, ${name}, helmet hat or circlet headgear`
        : slot === 'armor'
          ? job === 'warrior'
            ? `RPG inventory gear icon, ${name}, chest plate body armor`
            : `RPG inventory gear icon, ${name}, magical robe body armor`
          : slot === 'gloves'
            ? `RPG inventory gear icon, ${name}, gauntlets gloves`
            : slot === 'shoes'
              ? `RPG inventory gear icon, ${name}, boots or shoes footwear`
              : slot === 'necklace'
                ? `RPG inventory gear icon, ${name}, pendant necklace jewelry`
                : slot === 'earring'
                  ? `RPG inventory gear icon, ${name}, earring jewelry`
                  : `RPG inventory gear icon, ${name}, magic ring jewelry`;
  return `${base}, ${tierVisual}, centered icon, 64x64 inventory slot${STYLE_SUFFIX}`;
}

function buildTodieGearManifest() {
  /** @type {ManifestItem[]} */
  const items = [];
  for (const [job, tiers] of Object.entries(itemsJson.gear)) {
    for (const [tier, gearList] of Object.entries(tiers)) {
      for (const gear of gearList) {
        if (gear.droppable === false) continue;
        const jobLabel = JOB_LABEL[job] ?? job;
        const tierLabel = TIER_LABEL[tier] ?? tier;
        items.push({
          id: `gear-${job}-${tier}-${gear.id}`,
          game: 'todie',
          category: 'gear',
          label: `${jobLabel} · ${tierLabel} · ${gear.name}`,
          type: 'pixflux',
          description: gearDescription(job, tier, gear),
          imageSize: {width: 64, height: 64},
          fileInstall: {path: `public/todie/gear/${job}/${tier}/${gear.id}.png`},
        });
      }
    }
  }
  return items;
}

/** @param {string} id @param {string} label @param {string} desc */
function carStatic(id, label, desc) {
  const fileName =
    id === 'viper'
      ? 'Black_viper.png'
      : id === 'mini-truck'
        ? 'Mini_truck.png'
        : id === 'mini-van'
          ? 'Mini_van.png'
          : id === 'car'
            ? 'Car.png'
            : id === 'audi'
              ? 'Audi.png'
              : id === 'police'
                ? 'Police.png'
                : id === 'ambulance'
                  ? 'ambulance.png'
                  : `${id}.png`;
  return [
    {
      id: `car-${id}`,
      game: 'car-run',
      category: 'vehicle',
      label: `차량: ${label}`,
      type: 'pixflux',
      description: `${desc}${CAR_STYLE}`,
      imageSize: {width: 64, height: 128},
      fileInstall: {path: `public/car-run/vehicles/${fileName}`},
    },
  ];
}

function carHeart() {
  return [
    {
      id: 'car-obs-heart',
      game: 'car-run',
      category: 'obstacle',
      label: '픽업: 하트',
      type: 'pixflux',
      description: `racing game life pickup heart${HEART_STYLE}`,
      imageSize: {width: 48, height: 48},
      fileInstall: {path: 'public/car-run/obstacles/heart.png'},
    },
  ];
}

/**
 * @param {string} id
 * @param {string} label
 * @param {string} desc
 * @param {'player' | 'enemy'} role
 */
function planeStatic(id, label, desc, role) {
  return [
    {
      id: `plane-${id}`,
      game: 'plane-shoot',
      category: role === 'player' ? 'player-plane' : 'enemy-plane',
      label: role === 'player' ? `플레이어: ${label}` : `적기: ${label}`,
      type: 'pixflux',
      description: `${desc}${PLANE_STYLE}`,
      imageSize: {width: 64, height: 96},
      fileInstall: {path: `public/plane-shoot/planes/${id}.png`},
    },
  ];
}

function planeHeart() {
  return [
    {
      id: 'plane-fx-heart',
      game: 'plane-shoot',
      category: 'fx',
      label: '픽업: 하트',
      type: 'pixflux',
      description: `airplane shooter life pickup heart${PLANE_HEART_STYLE}`,
      imageSize: {width: 48, height: 48},
      fileInstall: {path: 'public/plane-shoot/fx/heart.png'},
    },
  ];
}

/** @param {string} id @param {string} label @param {string} desc */
function planeProjectile(id, label, desc) {
  return [
    {
      id: `plane-proj-${id}`,
      game: 'plane-shoot',
      category: 'projectile',
      label: `발사체: ${label}`,
      type: 'pixflux',
      description: `${desc}, crisp pixels, transparent background`,
      imageSize: {width: 32, height: 48},
      fileInstall: {path: `public/plane-shoot/projectiles/${id}.png`},
    },
  ];
}

/** @param {string} id @param {string} label @param {string} desc */
function planeWeaponItem(id, label, desc) {
  return [
    {
      id: `plane-item-${id}`,
      game: 'plane-shoot',
      category: 'weapon-item',
      label,
      type: 'pixflux',
      description: `${desc}, crisp pixels, transparent background`,
      imageSize: {width: 48, height: 48},
      fileInstall: {path: `public/plane-shoot/items/${id}.png`},
    },
  ];
}

export const DIR_MAP = {
  down: 'south',
  downRight: 'south-east',
  right: 'east',
  upRight: 'north-east',
  up: 'north',
  upLeft: 'north-west',
  left: 'west',
  downLeft: 'south-west',
};

function previewUrlFromInstall(filePath) {
  if (!filePath) return undefined;
  const norm = filePath.replace(/\\/g, '/');
  if (norm.startsWith('public/')) return `/${norm.slice('public/'.length)}`;
  return undefined;
}

export function manifestForApi() {
  return MANIFEST.map((item) => ({
    id: item.id,
    game: item.game,
    category: item.category,
    label: item.label,
    type: item.type,
    costsGenerations: item.type !== 'sync_character',
    previewUrl: previewUrlFromInstall(item.fileInstall?.path),
    defaultDescription: item.description ?? '',
  }));
}
