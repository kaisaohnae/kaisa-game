import equipJson from '../settings/equip.json';
import type {JobId} from './types';

export type GearSlot =
  | 'head'
  | 'armor'
  | 'weapon'
  | 'gloves'
  | 'shoes'
  | 'necklace'
  | 'earring_l'
  | 'earring_r'
  | 'ring_l'
  | 'ring_r';

export type GearTier = 'basic' | 'unique' | 'hero';

export type EquipSlotDef = {
  id: GearSlot;
  label: string;
  group: string;
};

export const EQUIP_SLOTS = equipJson.slots as EquipSlotDef[];

export type ItemKind = 'potion' | 'mana' | 'scroll' | 'gear' | 'empty';

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
    earring_l: null,
    earring_r: null,
    ring_l: null,
    ring_r: null,
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
}

export function copyItem(item: Item): Item {
  return {...item};
}

/** Find first empty bag index */
export function findEmptyBagIndex(bag: Item[]): number {
  return bag.findIndex((s) => s.kind === 'empty');
}

export function putItemInBag(bag: Item[], item: Item): boolean {
  if (item.kind !== 'gear' && item.kind !== 'empty') {
    const stack = bag.find((s) => s.kind === item.kind && s.kind !== 'empty' && !s.job);
    if (stack) {
      stack.qty += item.qty;
      return true;
    }
  } else if (item.kind === 'gear') {
    const stack = bag.find(
      (s) =>
        s.kind === 'gear' &&
        s.gearId === item.gearId &&
        s.job === item.job &&
        s.tier === item.tier &&
        s.name === item.name,
    );
    if (stack) {
      stack.qty += item.qty;
      return true;
    }
  }
  const idx = findEmptyBagIndex(bag);
  if (idx < 0) return false;
  const empty = bag[idx];
  empty.kind = item.kind;
  empty.name = item.name;
  empty.qty = item.qty;
  empty.color = item.color;
  empty.id = item.id;
  empty.job = item.job;
  empty.gearId = item.gearId;
  empty.gearSlot = item.gearSlot;
  empty.tier = item.tier;
  return true;
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
