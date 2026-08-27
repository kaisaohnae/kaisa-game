import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/** @typedef {'sync_character' | 'generate_character' | 'generate_character_state' | 'pixflux' | 'tileset'} ManifestType */

/** @typedef {'todie' | 'car-run'} GameId */

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

export const PRECOMPLETED_IDS = new Set([
  'mage-walk-sync',
  'warrior-walk-sync',
  'mage-attack-sync',
  'warrior-attack-sync',
]);

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

const HEART_STYLE =
  ', cute pixel heart pickup icon for racing game HUD, bright red heart with soft shine, centered, transparent background, no text';

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
  // ── Todie: 캐릭터 동기화 (완료) ──
  ...todieCharacterSync(),

  // ── Todie: 몬스터 ──
  ...todieMob('slime', 'cute green slime monster, top-down RPG field mob'),
  ...todieMob('slime_elite', 'elite purple slime with golden crown, glowing aura'),
  ...todieMob('bat', 'small pixel bat enemy, wings spread, top-down'),
  ...todieMob('bat_elite', 'elite red bat with fangs and purple glow'),
  ...todieMob('block', 'hostile living stone cube monster, cracked gray rock face'),
  ...todieMob('block_elite', 'elite crystal rock golem cube, glowing blue cracks'),
  ...todieMob('wolf', 'gray wolf enemy top-down, mid-run pose'),
  ...todieMob('wolf_elite', 'elite black wolf with red eyes and scar'),
  ...todieMob('spider', 'small brown spider enemy top-down, eight legs'),
  ...todieMob('spider_elite', 'elite giant spider, green toxic markings'),
  ...todieMob('boss', 'mid boss orc warlord top-down, orange armor, big axe'),
  ...todieMob('bigBoss', 'large demon knight boss top-down, red black armor, horns'),
  ...todieMob('finalBoss', 'final boss void lich king top-down, pale violet robes, dark aura'),

  // ── Todie: 타일 (seamless set · 64px) ──
  ...todieTile(
    'grass_a',
    '잔디 타일 A',
    'seamless tileable top-down grass meadow floor tile, soft green #6f9458 base, tiny soft flowers, NO border, edges must match when repeated, flat RPG tileset',
  ),
  ...todieTile(
    'grass_b',
    '잔디 타일 B',
    'seamless tileable top-down grass floor tile variant matching grass_a palette, slightly darker green #62874e patches, NO border, edges match neighbors, flat RPG tileset',
  ),
  ...todieTile(
    'wasteland_a',
    '황무지 타일 A',
    'seamless tileable top-down dry dirt wasteland floor tile, brown #9a7b5c cracked soil, NO border, edges match when tiled, flat RPG tileset',
  ),
  ...todieTile(
    'wasteland_b',
    '황무지 타일 B',
    'seamless tileable top-down wasteland dirt floor tile variant matching wasteland_a, pebbles dry weeds #8a6d52, NO border, edges match, flat RPG tileset',
  ),
  ...todieTile(
    'stone_path',
    '돌길 타일',
    'seamless tileable top-down cobblestone path floor tile, gray stones #8d8f8a, NO border, edges match when repeated, flat RPG tileset',
  ),
  ...todieTile(
    'water_shallow',
    '얕은 물 타일',
    'seamless tileable top-down shallow water floor tile, light blue #4f8fb8 soft ripples, NO border, edges match when tiled, flat RPG tileset',
  ),

  // ── Todie: 맵 오브젝트 ──
  ...todieObject('tree_oak', '참나무', 'top-down oak tree canopy circle with brown trunk center, soft green leaves, RPG map prop, centered, transparent background'),
  ...todieObject('tree_pine', '소나무', 'top-down pine tree canopy, dark green pointed foliage circle, brown trunk center, RPG map prop, centered, transparent background'),
  ...todieObject('bush', '덤불', 'top-down small round green bush shrub, RPG map decoration, centered, transparent background'),
  ...todieObject('rock', '바위', 'top-down gray rock boulder stone, RPG map prop, centered, transparent background'),
  ...todieObject('stump', '그루터기', 'top-down cut tree stump rings wood, RPG map prop, centered, transparent background'),
  ...todieObject('flowers', '꽃밭', 'top-down small wildflower patch pink yellow white blooms on grass, RPG decoration, centered, transparent background'),
  ...todieObject('crate', '상자', 'top-down wooden crate box, RPG map prop, centered, transparent background'),
  ...todieObject('barrel', '통', 'top-down wooden barrel top view, RPG map prop, centered, transparent background'),

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
];

function todieCharacterSync() {
  return [
    {
      id: 'mage-walk-sync',
      game: 'todie',
      category: 'character',
      label: '법사 걷기 8방향',
      type: 'sync_character',
      characterId: '0ad17b16-ffef-4435-a785-3ae6d9235ef6',
      characterInstall: {job: 'mage', action: 'walk'},
    },
    {
      id: 'warrior-walk-sync',
      game: 'todie',
      category: 'character',
      label: '검사 걷기 8방향',
      type: 'sync_character',
      characterId: '16c3fd35-4d06-4fa3-881b-a0ec311917ee',
      characterInstall: {job: 'warrior', action: 'walk'},
    },
    {
      id: 'mage-attack-sync',
      game: 'todie',
      category: 'character',
      label: '법사 공격 8방향',
      type: 'sync_character',
      characterId: 'bf21e19b-7d24-4ba3-870c-92b4f3cb8398',
      characterInstall: {job: 'mage', action: 'attack'},
    },
    {
      id: 'warrior-attack-sync',
      game: 'todie',
      category: 'character',
      label: '검사 공격 8방향',
      type: 'sync_character',
      characterId: 'fbe9029c-7ec3-4558-8def-84162cdb5528',
      characterInstall: {job: 'warrior', action: 'attack'},
    },
  ];
}

/** @param {string} id @param {string} desc */
function todieMob(id, desc) {
  return [
    {
      id: `mob-${id}`,
      game: 'todie',
      category: 'mob',
      label: `몬스터: ${id}`,
      type: 'pixflux',
      description: `${desc}${STYLE_SUFFIX}`,
      imageSize: {width: 64, height: 64},
      fileInstall: {path: `public/todie/mobs/${id}.png`},
    },
  ];
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

export function manifestForApi() {
  return MANIFEST.map((item) => ({
    id: item.id,
    game: item.game,
    category: item.category,
    label: item.label,
    type: item.type,
    costsGenerations: item.type !== 'sync_character',
  }));
}
