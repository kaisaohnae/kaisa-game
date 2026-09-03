export type WeaponId = 'basic' | 'spread' | 'laser' | 'plasma' | 'star';

export type WeaponDef = {
  id: WeaponId;
  label: string;
  /** 발사 간격 ms */
  fireGapMs: number;
  /** 한 발 데미지 */
  damage: number;
  /** 탄속 (px/s) — 플레이어는 위로 */
  speed: number;
  displayW: number;
  displayH: number;
  src: string;
  /** 스프레드 각도(라디안) 목록. [0]만이면 단발 */
  angles: number[];
};

export type WeaponItemDef = {
  id: string;
  weaponId: WeaponId;
  label: string;
  src: string;
};

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  basic: {
    id: 'basic',
    label: '기본',
    fireGapMs: 220,
    damage: 1,
    speed: 440,
    displayW: 14,
    displayH: 24,
    src: '/plane-shoot/projectiles/basic.png',
    angles: [0],
  },
  spread: {
    id: 'spread',
    label: '스프레드',
    fireGapMs: 260,
    damage: 1,
    speed: 400,
    displayW: 16,
    displayH: 20,
    src: '/plane-shoot/projectiles/spread.png',
    angles: [-0.28, 0, 0.28],
  },
  laser: {
    id: 'laser',
    label: '레이저',
    fireGapMs: 90,
    damage: 1,
    speed: 620,
    displayW: 10,
    displayH: 36,
    src: '/plane-shoot/projectiles/laser.png',
    angles: [-0.22, 0, 0.22],
  },
  plasma: {
    id: 'plasma',
    label: '플라즈마',
    fireGapMs: 380,
    damage: 2,
    speed: 320,
    displayW: 26,
    displayH: 26,
    src: '/plane-shoot/projectiles/plasma.png',
    angles: [-0.22, 0, 0.22],
  },
  star: {
    id: 'star',
    label: '스타샷',
    fireGapMs: 300,
    damage: 2,
    speed: 360,
    displayW: 28,
    displayH: 28,
    src: '/plane-shoot/projectiles/star.png',
    angles: [-0.22, 0, 0.22],
  },
};

export const WEAPON_ITEMS: WeaponItemDef[] = [
  {id: 'weapon-spread', weaponId: 'spread', label: '스프레드', src: '/plane-shoot/items/weapon-spread.png'},
  {id: 'weapon-laser', weaponId: 'laser', label: '레이저', src: '/plane-shoot/items/weapon-laser.png'},
  {id: 'weapon-plasma', weaponId: 'plasma', label: '플라즈마', src: '/plane-shoot/items/weapon-plasma.png'},
  {id: 'weapon-star', weaponId: 'star', label: '스타샷', src: '/plane-shoot/items/weapon-star.png'},
];

export const ENEMY_BOLT = {
  id: 'enemy-bolt',
  src: '/plane-shoot/projectiles/enemy-bolt.png',
  displayW: 12,
  displayH: 20,
  speed: 220,
  damage: 1,
};

/** Rare life-refill pickup — only worth dropping while lives are below max */
export const HEART_ITEM = {
  id: 'heart',
  src: '/plane-shoot/fx/heart.png',
  displayW: 30,
  displayH: 30,
};

export const HEART_DROP_CHANCE = 0.05;

export const DEFAULT_WEAPON: WeaponId = 'basic';

export function pickWeaponItem(): WeaponItemDef {
  return WEAPON_ITEMS[Math.floor(Math.random() * WEAPON_ITEMS.length)]!;
}

export function getWeapon(id: WeaponId) {
  return WEAPONS[id] ?? WEAPONS.basic;
}
