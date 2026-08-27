/** @typedef {'sync_character' | 'generate_character' | 'generate_character_state' | 'pixflux' | 'tileset'} ManifestType */

/** @typedef {{ job: string, action: string }} CharacterInstall */

/** @typedef {{ path: string }} FileInstall */

/**
 * @typedef {object} ManifestItem
 * @property {string} id
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
 * @property {boolean} [selectedByDefault]
 */

const STYLE_SUFFIX =
  ', top-down pixel art, CraftPix RPG style, 16-bit retro game asset, limited color palette, crisp pixels, transparent background';

/** @type {ManifestItem[]} */
export const MANIFEST = [
  // ── 기존 PixelLab 캐릭터 동기화 (크레딧 0) ──
  {
    id: 'mage-walk-sync',
    category: 'character',
    label: '법사 걷기 8방향',
    type: 'sync_character',
    characterId: '0ad17b16-ffef-4435-a785-3ae6d9235ef6',
    characterInstall: {job: 'mage', action: 'walk'},
    selectedByDefault: true,
  },
  {
    id: 'warrior-walk-sync',
    category: 'character',
    label: '검사 걷기 8방향',
    type: 'sync_character',
    characterId: '16c3fd35-4d06-4fa3-881b-a0ec311917ee',
    characterInstall: {job: 'warrior', action: 'walk'},
    selectedByDefault: true,
  },
  {
    id: 'mage-attack-sync',
    category: 'character',
    label: '법사 공격 8방향',
    type: 'sync_character',
    characterId: 'bf21e19b-7d24-4ba3-870c-92b4f3cb8398',
    characterInstall: {job: 'mage', action: 'attack'},
    selectedByDefault: true,
  },
  {
    id: 'warrior-attack-sync',
    category: 'character',
    label: '검사 공격 8방향',
    type: 'sync_character',
    characterId: 'fbe9029c-7ec3-4558-8def-84162cdb5528',
    characterInstall: {job: 'warrior', action: 'attack'},
    selectedByDefault: true,
  },

  // ── todie 몬스터 (Pixflux 64) ──
  ...mob('slime', 'cute green slime monster, top-down RPG field mob'),
  ...mob('slime_elite', 'elite purple slime with golden crown, glowing aura'),
  ...mob('bat', 'small pixel bat enemy, wings spread, top-down'),
  ...mob('bat_elite', 'elite red bat with fangs and purple glow'),
  ...mob('block', 'hostile living stone cube monster, cracked gray rock face'),
  ...mob('block_elite', 'elite crystal rock golem cube, glowing blue cracks'),
  ...mob('wolf', 'gray wolf enemy top-down, mid-run pose'),
  ...mob('wolf_elite', 'elite black wolf with red eyes and scar'),
  ...mob('spider', 'small brown spider enemy top-down, eight legs'),
  ...mob('spider_elite', 'elite giant spider, green toxic markings'),
  ...mob('boss', 'mid boss orc warlord top-down, orange armor, big axe'),
  ...mob('bigBoss', 'large demon knight boss top-down, red black armor, horns'),
  ...mob('finalBoss', 'final boss void lich king top-down, pale violet robes, dark aura'),

  // ── 타일 ──
  {
    id: 'tile-grass-a',
    category: 'tile',
    label: '잔디 타일 A',
    type: 'pixflux',
    description: `seamless top-down grass meadow tile, soft green, tiny flowers, 32x32 game tileset${STYLE_SUFFIX}`,
    imageSize: {width: 32, height: 32},
    fileInstall: {path: 'public/todie/tiles/grass_a.png'},
  },
  {
    id: 'tile-grass-b',
    category: 'tile',
    label: '잔디 타일 B',
    type: 'pixflux',
    description: `seamless top-down grass tile variant, slightly darker green patches, 32x32${STYLE_SUFFIX}`,
    imageSize: {width: 32, height: 32},
    fileInstall: {path: 'public/todie/tiles/grass_b.png'},
  },
  {
    id: 'tile-wasteland-a',
    category: 'tile',
    label: '황무지 타일 A',
    type: 'pixflux',
    description: `seamless top-down dry wasteland dirt tile, cracked brown soil, 32x32${STYLE_SUFFIX}`,
    imageSize: {width: 32, height: 32},
    fileInstall: {path: 'public/todie/tiles/wasteland_a.png'},
  },
  {
    id: 'item-potion',
    category: 'item',
    label: '체력포션 아이콘',
    type: 'pixflux',
    description: `red health potion bottle icon, heart label, glass shine, 48x48 inventory icon${STYLE_SUFFIX}`,
    imageSize: {width: 48, height: 48},
    fileInstall: {path: 'public/todie/items/potion.png'},
  },
  {
    id: 'item-mana',
    category: 'item',
    label: '마나포션 아이콘',
    type: 'pixflux',
    description: `blue mana potion bottle icon, glowing liquid, 48x48 inventory icon${STYLE_SUFFIX}`,
    imageSize: {width: 48, height: 48},
    fileInstall: {path: 'public/todie/items/mana.png'},
  },
];

/** @param {string} id @param {string} desc */
function mob(id, desc) {
  return [
    {
      id: `mob-${id}`,
      category: 'mob',
      label: `몬스터: ${id}`,
      type: 'pixflux',
      description: `${desc}${STYLE_SUFFIX}`,
      imageSize: {width: 64, height: 64},
      fileInstall: {path: `public/todie/mobs/${id}.png`},
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
    category: item.category,
    label: item.label,
    type: item.type,
    selectedByDefault: Boolean(item.selectedByDefault),
    costsGenerations: item.type !== 'sync_character',
  }));
}
