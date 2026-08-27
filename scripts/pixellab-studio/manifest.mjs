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
  ', top-down overhead view looking straight down, car nose pointing up, Unlucky Studio style topdown vehicle sprite, retro arcade racing game, crisp pixels, transparent background';

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

  // ── Todie: 타일 ──
  ...todieTile('grass_a', '잔디 타일 A', 'seamless top-down grass meadow tile, soft green, tiny flowers, 32x32 game tileset'),
  ...todieTile('grass_b', '잔디 타일 B', 'seamless top-down grass tile variant, slightly darker green patches, 32x32'),
  ...todieTile('wasteland_a', '황무지 타일 A', 'seamless top-down dry wasteland dirt tile, cracked brown soil, 32x32'),
  ...todieTile('wasteland_b', '황무지 타일 B', 'seamless top-down wasteland dirt variant, pebbles and dry weeds, 32x32'),
  ...todieTile('stone_path', '돌길 타일', 'seamless top-down cobblestone path tile, gray stones, 32x32'),
  ...todieTile('water_shallow', '얕은 물 타일', 'seamless top-down shallow water tile, light blue ripples, 32x32'),

  // ── Todie: 소모품 ──
  ...todieConsumable('potion', '체력포션', 'red health potion bottle icon, heart label, glass shine, 48x48 inventory icon'),
  ...todieConsumable('mana', '마나포션', 'blue mana potion bottle icon, glowing liquid, 48x48 inventory icon'),

  // ── Todie: 장비 (items.json) ──
  ...buildTodieGearManifest(),

  // ── Car Run: 차량 (top-down, 위에서 내려다본 시점) ──
  ...carStatic('viper', '바이퍼', 'sleek black sports car top-down, roof windshield headlights roof vents visible'),
  ...carStatic('truck', '트럭', 'large delivery truck top-down, cargo box roof and cab roof visible'),
  ...carStatic('audi', '아우디', 'silver luxury sedan top-down, roof and windshield visible'),
  ...carStatic('taxi', '택시', 'yellow taxi cab top-down, roof light and checkered stripe visible'),
  ...carStatic('car', '심플카', 'compact red hatchback top-down, roof and windshield visible'),
  ...carStatic('mini-truck', '미니트럭', 'small pickup truck top-down, open bed and cab roof visible'),
  ...carStatic('mini-van', '미니밴', 'white mini van top-down, long roof visible'),
  ...carAnimFrame('police', 1, 'police car top-down, roof light bar off, windshield and hood visible'),
  ...carAnimFrame('police', 2, 'police car top-down, red blue roof lights flashing frame 2'),
  ...carAnimFrame('police', 3, 'police car top-down, red blue roof lights flashing frame 3'),
  ...carAnimFrame('ambulance', 1, 'white ambulance van top-down, red cross on roof, lights off'),
  ...carAnimFrame('ambulance', 2, 'ambulance top-down, red cross roof lights flashing frame 2'),
  ...carAnimFrame('ambulance', 3, 'ambulance top-down, red cross roof lights flashing frame 3'),

  // ── Car Run: 장애물 (top-down) ──
  ...carObstacle('cone', '교통콘', 'orange traffic cone top-down on asphalt, circular base visible'),
  ...carObstacle('rock', '바위', 'gray boulder rock obstacle on road top-down'),
  ...carObstacle('crate', '상자', 'wooden shipping crate obstacle top-down, lid visible'),
  ...carObstacle('barrel', '통', 'red oil barrel obstacle top-down, circular lid visible'),
  ...carObstacle('tire', '타이어', 'black rubber tire lying flat on road top-down, donut shape'),
  ...carObstacle('barrier', '차단기', 'yellow black road barrier strip top-down across lane'),
  ...carObstacle('puddle', '웅덩이', 'road water puddle hazard top-down, irregular blue oval'),
  ...carObstacle('sign', '도로표지', 'road warning sign obstacle top-down, square sign face'),
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
      imageSize: {width: 32, height: 32},
      fileInstall: {path: `public/todie/tiles/${id}.png`},
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

/** @param {string} id @param {number} frame @param {string} desc */
function carAnimFrame(id, frame, desc) {
  const dir = id === 'police' ? 'Police_animation' : 'ambulance_animation';
  return [
    {
      id: `car-${id}-f${frame}`,
      game: 'car-run',
      category: 'vehicle',
      label: `차량: ${id === 'police' ? '경찰차' : '구급차'} ${frame}프레임`,
      type: 'pixflux',
      description: `${desc}${CAR_STYLE}`,
      imageSize: {width: 64, height: 128},
      fileInstall: {path: `public/car-run/vehicles/${dir}/${frame}.png`},
    },
  ];
}

/** @param {string} id @param {string} label @param {string} desc */
function carObstacle(id, label, desc) {
  return [
    {
      id: `car-obs-${id}`,
      game: 'car-run',
      category: 'obstacle',
      label: `장애물: ${label}`,
      type: 'pixflux',
      description: `${desc}${CAR_STYLE}`,
      imageSize: {width: 64, height: 64},
      fileInstall: {path: `public/car-run/obstacles/${id}.png`},
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
