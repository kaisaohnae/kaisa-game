import equipJson from '../settings/equip.json';
import type {JobId} from './types';

export type GearSlot =
  | 'head'
  | 'armor'
  | 'weapon'
  | 'gloves'
  | 'shoes'
  | 'necklace'
  | 'earring'
  | 'ring';

export type GearTier = 'basic' | 'ascend' | 'unique' | 'hero' | 'mythic';

export type EquipSlotDef = {
  id: GearSlot;
  label: string;
  group: string;
};

export const EQUIP_SLOTS = equipJson.slots as EquipSlotDef[];

const UNIQUE_OWN_GROUPS = new Set(
  (equipJson.uniqueOwnGroups as string[] | undefined) ?? ['armor', 'weapon'],
);

export function alreadyOwnedToast(): string {
  return (equipJson as {alreadyOwnedToast?: string}).alreadyOwnedToast ?? '이미 가지고 있는 장비예요';
}

/** 모든 장비 슬롯 — 가방·장착 중복 불가 */
export function isUniqueOwnGearSlot(slot: GearSlot | null | undefined): boolean {
  if (!slot) return false;
  const def = EQUIP_SLOTS.find((s) => s.id === slot);
  return Boolean(def && UNIQUE_OWN_GROUPS.has(def.group));
}

export function sameGear(a: Item, b: Item): boolean {
  return (
    a.kind === 'gear' &&
    b.kind === 'gear' &&
    a.gearId != null &&
    a.gearId === b.gearId &&
    a.job === b.job &&
    a.tier === b.tier
  );
}

/** 가방 또는 장착 중 같은 장비 보유 여부 */
export function ownsSameUniqueGear(
  bag: Item[],
  equipped: Equipment,
  item: Item,
): boolean {
  if (item.kind !== 'gear' || !item.gearSlot) return false;
  if (!isUniqueOwnGearSlot(item.gearSlot)) return false;
  for (const s of EQUIP_SLOTS) {
    const wearing = equipped[s.id];
    if (wearing && sameGear(wearing, item)) return true;
  }
  return bag.some((s) => s.kind !== 'empty' && sameGear(s, item));
}

export type ItemKind = 'potion' | 'mana' | 'enhanceStone' | 'gear' | 'empty';

export type Item = {
  id: string;
  kind: ItemKind;
  name: string;
  qty: number;
  color: string;
  job: JobId | null;
  gearId: string | null;
  gearSlot: GearSlot | null;
  tier: GearTier | null;
  /** 강화 단계 (0~MAX_ENHANCE_LEVEL), gear 아이템에만 의미 있음 */
  enhance: number;
};

export type Equipment = Record<GearSlot, Item | null>;

export function emptyEquipment(): Equipment {
  return {
    head: null,
    armor: null,
    weapon: null,
    gloves: null,
    shoes: null,
    necklace: null,
    earring: null,
    ring: null,
  };
}

export function emptyItem(id: string): Item {
  return {
    id,
    kind: 'empty',
    name: '',
    qty: 0,
    color: '#555',
    job: null,
    gearId: null,
    gearSlot: null,
    tier: null,
    enhance: 0,
  };
}

export function clearItem(slot: Item) {
  slot.kind = 'empty';
  slot.name = '';
  slot.qty = 0;
  slot.color = '#555';
  slot.job = null;
  slot.gearId = null;
  slot.gearSlot = null;
  slot.tier = null;
  slot.enhance = 0;
}

export function copyItem(item: Item): Item {
  return {...item};
}

/** Hotbar keys 4·5 map to these bag indices — always potion / mana. */
export const HOTBAR_POTION_BAG = 0;
export const HOTBAR_MANA_BAG = 1;
/** Free bag slots start here (0·1 reserved). */
export const BAG_FREE_START = 2;

export function isHotbarConsumableBagIndex(index: number): boolean {
  return index === HOTBAR_POTION_BAG || index === HOTBAR_MANA_BAG;
}

const KIND_SORT: Record<ItemKind, number> = {
  enhanceStone: 0,
  potion: 1,
  mana: 2,
  gear: 3,
  empty: 9,
};

/** 가방 자동정렬 — 핫바 물약/마나(0·1)는 유지, 나머지 칸만 압축·정렬 */
export function sortBag(bag: Item[]) {
  if (bag.length <= BAG_FREE_START) return;
  const free = bag.slice(BAG_FREE_START).map(copyItem);
  free.sort((a, b) => {
    if (a.kind === 'empty' && b.kind !== 'empty') return 1;
    if (b.kind === 'empty' && a.kind !== 'empty') return -1;
    if (a.kind === 'empty' && b.kind === 'empty') return 0;
    const ko = (KIND_SORT[a.kind] ?? 5) - (KIND_SORT[b.kind] ?? 5);
    if (ko !== 0) return ko;
    if (a.kind === 'gear' && b.kind === 'gear') {
      const tr = tierRank(b.tier) - tierRank(a.tier);
      if (tr !== 0) return tr;
      const en = (b.enhance ?? 0) - (a.enhance ?? 0);
      if (en !== 0) return en;
      const slotCmp = String(a.gearSlot ?? '').localeCompare(String(b.gearSlot ?? ''));
      if (slotCmp !== 0) return slotCmp;
      const nameCmp = a.name.localeCompare(b.name, 'ko');
      if (nameCmp !== 0) return nameCmp;
      return String(a.job ?? '').localeCompare(String(b.job ?? ''));
    }
    const nameCmp = a.name.localeCompare(b.name, 'ko');
    if (nameCmp !== 0) return nameCmp;
    return b.qty - a.qty;
  });
  for (let i = 0; i < free.length; i += 1) {
    writeItemInto(bag[BAG_FREE_START + i]!, free[i]!);
  }
}

function writeItemInto(slot: Item, item: Item) {
  slot.kind = item.kind;
  slot.name = item.name;
  slot.qty = item.qty;
  slot.color = item.color;
  slot.id = item.id;
  slot.job = item.job;
  slot.gearId = item.gearId;
  slot.gearSlot = item.gearSlot;
  slot.tier = item.tier;
  slot.enhance = item.enhance ?? 0;
}

/** Find first empty bag index (skips hotbar potion/mana slots). */
export function findEmptyBagIndex(bag: Item[]): number {
  for (let i = BAG_FREE_START; i < bag.length; i += 1) {
    if (bag[i].kind === 'empty') return i;
  }
  return -1;
}

/** Move whatever is in `index` into a free bag slot. Returns false if bag full. */
function migrateBagSlotOut(bag: Item[], index: number): boolean {
  const it = bag[index];
  if (!it || it.kind === 'empty') return true;
  const moving = copyItem(it);
  clearItem(it);
  const dest = findEmptyBagIndex(bag);
  if (dest < 0) {
    writeItemInto(it, moving);
    return false;
  }
  writeItemInto(bag[dest], moving);
  return true;
}

/**
 * Keep bag[0]=potion-only and bag[1]=mana-only.
 * Migrates wrong items out and merges stray potions/mana into those slots.
 */
export function ensureHotbarConsumableSlots(bag: Item[]) {
  if (bag.length < 2) return;
  if (bag[HOTBAR_POTION_BAG].kind !== 'empty' && bag[HOTBAR_POTION_BAG].kind !== 'potion') {
    migrateBagSlotOut(bag, HOTBAR_POTION_BAG);
  }
  if (bag[HOTBAR_MANA_BAG].kind !== 'empty' && bag[HOTBAR_MANA_BAG].kind !== 'mana') {
    migrateBagSlotOut(bag, HOTBAR_MANA_BAG);
  }
  for (let i = BAG_FREE_START; i < bag.length; i += 1) {
    const it = bag[i];
    if (it.kind === 'potion' || it.kind === 'mana') {
      const moving = copyItem(it);
      clearItem(it);
      putItemInBag(bag, moving);
    }
  }
}

export function putItemInBag(bag: Item[], item: Item): boolean {
  if (item.kind === 'potion') {
    const slot = bag[HOTBAR_POTION_BAG];
    if (!slot) return false;
    if (slot.kind !== 'empty' && slot.kind !== 'potion') {
      if (!migrateBagSlotOut(bag, HOTBAR_POTION_BAG)) return false;
    }
    if (slot.kind === 'empty') {
      writeItemInto(slot, item);
      return true;
    }
    slot.qty += item.qty;
    return true;
  }
  if (item.kind === 'mana') {
    const slot = bag[HOTBAR_MANA_BAG];
    if (!slot) return false;
    if (slot.kind !== 'empty' && slot.kind !== 'mana') {
      if (!migrateBagSlotOut(bag, HOTBAR_MANA_BAG)) return false;
    }
    if (slot.kind === 'empty') {
      writeItemInto(slot, item);
      return true;
    }
    slot.qty += item.qty;
    return true;
  }
  if (item.kind === 'gear') {
    // 장비는 스택하지 않음 (중복 보유는 ownsSameUniqueGear로 차단)
  } else if (item.kind !== 'empty') {
    const stack = bag.find(
      (s, i) =>
        i >= BAG_FREE_START && s.kind === item.kind && s.kind !== 'empty' && !s.job,
    );
    if (stack) {
      stack.qty += item.qty;
      return true;
    }
  }
  const idx = findEmptyBagIndex(bag);
  if (idx < 0) return false;
  writeItemInto(bag[idx], item);
  return true;
}

const TIER_RANK: Record<GearTier, number> = {
  basic: 1,
  ascend: 2,
  unique: 3,
  hero: 4,
  mythic: 5,
};

export function tierRank(tier: GearTier | null | undefined): number {
  if (!tier) return 0;
  return TIER_RANK[tier] ?? 0;
}

/** 새 장비가 장착 중보다 높은 등급인지 (빈 슬롯도 더 좋음) */
export function isBetterGear(incoming: Item, current: Item | null): boolean {
  if (!current) return true;
  return tierRank(incoming.tier) > tierRank(current.tier);
}

/**
 * Pickup: empty slot or better-tier gear → auto-equip (old piece goes to bag); else bag.
 */
export function pickupOrAutoEquip(
  bag: Item[],
  equipped: Equipment,
  item: Item,
  job: JobId,
): {ok: boolean; autoEquipped: boolean} {
  if (item.kind === 'gear' && item.gearSlot && (!item.job || item.job === job)) {
    const slot = item.gearSlot;
    const current = equipped[slot];
    if (isBetterGear(item, current)) {
      if (current) {
        const old = copyItem(current);
        old.qty = 1;
        if (!putItemInBag(bag, old)) {
          // 가방 가득 → 교체 불가, 새 템만 가방에
          return {ok: putItemInBag(bag, item), autoEquipped: false};
        }
      }
      const wearing = copyItem(item);
      wearing.qty = 1;
      equipped[slot] = wearing;
      if (item.qty > 1) {
        const rest = copyItem(item);
        rest.qty = item.qty - 1;
        putItemInBag(bag, rest);
      }
      return {ok: true, autoEquipped: true};
    }
  }
  return {ok: putItemInBag(bag, item), autoEquipped: false};
}

/**
 * Equip gear from bag index into its slot (swap previous back to bag).
 */
export function equipFromBag(
  bag: Item[],
  equipped: Equipment,
  bagIndex: number,
  job: JobId,
): string | null {
  const item = bag[bagIndex];
  if (!item || item.kind !== 'gear' || !item.gearSlot) return '장착할 수 없는 아이템';
  if (item.job && item.job !== job) return '다른 직업 전용 아이템';

  const slot = item.gearSlot;
  const wearing = equipped[slot];
  const moving = copyItem(item);
  moving.qty = 1;

  if (item.qty > 1) item.qty -= 1;
  else clearItem(item);

  if (wearing) {
    if (!putItemInBag(bag, wearing)) {
      putItemInBag(bag, moving);
      return '가방이 가득 차 장착 불가';
    }
  }
  equipped[slot] = moving;
  return `${moving.name} 장착`;
}

/**
 * Right-click toggle: if this bag gear matches what's equipped in its slot, unequip;
 * otherwise equip (swap).
 */
export function toggleEquipFromBag(
  bag: Item[],
  equipped: Equipment,
  bagIndex: number,
  job: JobId,
): string | null {
  const item = bag[bagIndex];
  if (!item || item.kind !== 'gear' || !item.gearSlot) return '장착할 수 없는 아이템';
  if (item.job && item.job !== job) return '다른 직업 전용 아이템';
  const wearing = equipped[item.gearSlot];
  if (wearing && wearing.gearId === item.gearId && wearing.job === item.job) {
    return unequipSlot(bag, equipped, item.gearSlot);
  }
  return equipFromBag(bag, equipped, bagIndex, job);
}

export function unequipSlot(
  bag: Item[],
  equipped: Equipment,
  slot: GearSlot,
): string | null {
  const wearing = equipped[slot];
  if (!wearing) return null;
  if (!putItemInBag(bag, wearing)) return '가방이 가득 차 해제 불가';
  equipped[slot] = null;
  return `${wearing.name} 해제`;
}

// ── 강화(Enhance) ───────────────────────────────────────────────────────

type EnhanceConfig = {
  maxLevel: number;
  baseMaxLevel: number;
  stage4MaxLevel: number;
  stage5MaxLevel: number;
  highTierUpTo: number;
  highChance: number;
  lowChance: number;
  ultraChance: number;
  mythicChance: number;
  weaponAtkPerLevel: number;
  otherDefPerLevel: number;
};

const ENHANCE_CFG: EnhanceConfig = (equipJson as {enhance?: EnhanceConfig}).enhance ?? {
  maxLevel: 20,
  baseMaxLevel: 10,
  stage4MaxLevel: 15,
  stage5MaxLevel: 20,
  highTierUpTo: 5,
  highChance: 0.5,
  lowChance: 0.2,
  ultraChance: 0.05,
  mythicChance: 0.01,
  weaponAtkPerLevel: 1,
  otherDefPerLevel: 1,
};

/** 절대 최대 강화 (+20, 스테이지 5) */
export const MAX_ENHANCE_LEVEL = ENHANCE_CFG.maxLevel;
/** 스테이지 1~3 최대 / 스테이지 4 진입 기준 (+10) */
export const BASE_ENHANCE_MAX = ENHANCE_CFG.baseMaxLevel;
/** 스테이지 4 최대 / 스테이지 5 진입 기준 (+15) */
export const STAGE4_ENHANCE_MAX = ENHANCE_CFG.stage4MaxLevel;

/** 현재 스테이지에서 허용되는 최대 강화 */
export function maxEnhanceForStage(stage: number): number {
  if (stage >= 5) return ENHANCE_CFG.stage5MaxLevel;
  if (stage >= 4) return ENHANCE_CFG.stage4MaxLevel;
  return ENHANCE_CFG.baseMaxLevel;
}

/**
 * 다음 강화 단계 성공 확률
 * 1~5: 50% / 6~10: 20% / 11~15: 5% / 16~20: 1%
 */
export function enhanceSuccessChance(nextLevel: number): number {
  if (nextLevel > ENHANCE_CFG.stage4MaxLevel) return ENHANCE_CFG.mythicChance;
  if (nextLevel > ENHANCE_CFG.baseMaxLevel) return ENHANCE_CFG.ultraChance;
  return nextLevel <= ENHANCE_CFG.highTierUpTo ? ENHANCE_CFG.highChance : ENHANCE_CFG.lowChance;
}

/** 강화 단계 보너스 — 무기: 공격력, 그 외: 방어력 */
export function enhanceStatBonus(
  level: number,
  slot: GearSlot | null | undefined,
): {atk: number; def: number; hp: number} {
  const lv = Math.max(0, level);
  if (slot === 'weapon') {
    return {atk: lv * ENHANCE_CFG.weaponAtkPerLevel, def: 0, hp: 0};
  }
  return {atk: 0, def: lv * ENHANCE_CFG.otherDefPerLevel, hp: 0};
}

/** @deprecated 평탄 보너스로 전환됨 — 호환용 (항상 1) */
export function enhanceStatMultiplier(_level: number): number {
  return 1;
}

export type EnhanceOutcome = {
  applied: boolean;
  success: boolean;
  newLevel: number;
  message: string;
};

/**
 * 가방의 강화석 1개를 소모해 target 장비를 강화 시도.
 * target은 bag/equipped 어디에 있든 참조로 전달 — 성공 시 그 자리에서 enhance += 1.
 * @param maxLevel 현재 허용 최대 강화 (스테이지별 +10 / +15 / +20)
 */
export function applyEnhanceStone(
  bag: Item[],
  stoneIndex: number,
  target: Item,
  maxLevel: number = MAX_ENHANCE_LEVEL,
): EnhanceOutcome | null {
  const stone = bag[stoneIndex];
  if (!stone || stone.kind !== 'enhanceStone' || stone.qty < 1) return null;
  if (target.kind !== 'gear') return null;
  const level = target.enhance ?? 0;
  const cap = Math.min(MAX_ENHANCE_LEVEL, Math.max(0, Math.floor(maxLevel)));
  if (level >= cap) {
    let message = `이미 최대 강화(+${cap})예요`;
    if (cap <= BASE_ENHANCE_MAX && level >= BASE_ENHANCE_MAX) {
      message = `스테이지 4에서 +${STAGE4_ENHANCE_MAX}까지 강화할 수 있어요`;
    } else if (cap <= STAGE4_ENHANCE_MAX && level >= STAGE4_ENHANCE_MAX) {
      message = `스테이지 5에서 +${MAX_ENHANCE_LEVEL}까지 강화할 수 있어요`;
    }
    return {
      applied: false,
      success: false,
      newLevel: level,
      message,
    };
  }
  stone.qty -= 1;
  if (stone.qty <= 0) clearItem(stone);

  const nextLevel = level + 1;
  const chance = enhanceSuccessChance(nextLevel);
  const success = Math.random() < chance;
  if (success) {
    target.enhance = nextLevel;
    return {
      applied: true,
      success: true,
      newLevel: nextLevel,
      message: `${target.name} +${nextLevel} 강화 성공! (${Math.round(chance * 100)}%)`,
    };
  }
  return {
    applied: true,
    success: false,
    newLevel: level,
    message: `${target.name} 강화 실패... (+${level} 유지, 확률 ${Math.round(chance * 100)}%)`,
  };
}

// ── 스테이지(Stage) ─────────────────────────────────────────────────────

/**
 * 장착 8슬롯 전부가 채워져 있고 전부 해당 등급 이상일 때만 통과.
 * 스테이지 판정 기준: 장착 중인 8슬롯 전부.
 */
function allEquippedAtLeast(equipped: Equipment, minTier: GearTier): boolean {
  return EQUIP_SLOTS.every((s) => {
    const it = equipped[s.id];
    return Boolean(it) && tierRank(it!.tier) >= tierRank(minTier);
  });
}

/** 전 슬롯 신화 +minEnhance 이상인지 */
function allEquippedMythicAtEnhance(equipped: Equipment, minEnhance: number): boolean {
  return EQUIP_SLOTS.every((s) => {
    const it = equipped[s.id];
    return (
      Boolean(it) &&
      it!.kind === 'gear' &&
      tierRank(it!.tier) >= tierRank('mythic') &&
      (it!.enhance ?? 0) >= minEnhance
    );
  });
}

/** 장착 장비 등급·강화로 현재 도달 가능한 스테이지(1~5)를 판정 */
export function stageForEquipped(equipped: Equipment): number {
  if (allEquippedMythicAtEnhance(equipped, STAGE4_ENHANCE_MAX)) return 5;
  if (allEquippedMythicAtEnhance(equipped, BASE_ENHANCE_MAX)) return 4;
  if (allEquippedAtLeast(equipped, 'mythic')) return 3;
  if (allEquippedAtLeast(equipped, 'hero')) return 2;
  return 1;
}
