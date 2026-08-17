import itemsJson from '../settings/items.json';
import dropsJson from '../settings/drops.json';
import displayJson from '../settings/display.json';
import type {JobId} from './types';
import type {GearSlot, Item} from './equip';

export const itemSettings = itemsJson;
export const dropSettings = dropsJson;

export type GearTier = 'basic' | 'unique' | 'hero';

export type GearDef = {
  id: string;
  name: string;
  slot: GearSlot;
  color: string;
  tier: GearTier;
  job: JobId;
  droppable: boolean;
};

const gearBase = displayJson.gearPublicBase || '/todie/gear';

export function gearImageKey(job: JobId, tier: GearTier, id: string): string {
  return `${job}:${tier}:${id}`;
}

export function gearPublicPath(job: JobId, tier: GearTier, id: string): string {
  return `${gearBase}/${job}/${tier}/${id}.png`;
}

export function tierMeta(tier: GearTier | null | undefined) {
  if (!tier) return null;
  return itemsJson.tiers[tier] ?? null;
}

export function allGearDefs(): GearDef[] {
  const out: GearDef[] = [];
  for (const job of Object.keys(itemsJson.gear) as JobId[]) {
    const byTier = itemsJson.gear[job];
    for (const tier of Object.keys(byTier) as GearTier[]) {
      for (const g of byTier[tier]) {
        out.push({
          id: g.id,
          name: g.name,
          slot: g.slot as GearSlot,
          color: g.color,
          tier,
          job,
          droppable: (g as {droppable?: boolean}).droppable !== false,
        });
      }
    }
  }
  return out;
}

export function findGearDef(job: JobId, gearId: string): GearDef | null {
  return allGearDefs().find((g) => g.job === job && g.id === gearId) ?? null;
}

function pickWeighted<T extends {weight: number}>(list: T[]): T {
  const total = list.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const x of list) {
    r -= x.weight;
    if (r <= 0) return x;
  }
  return list[list.length - 1];
}

export type LootItemDraft = {
  kind: Item['kind'];
  name: string;
  qty: number;
  color: string;
  job: JobId | null;
  gearId: string | null;
  gearSlot: GearSlot | null;
  tier: GearTier | null;
};

export function rollLootDrop(): LootItemDraft {
  const {rolls, consumableWeights, tierWeights, slotWeights} = dropsJson;
  const {consumables, gear} = itemsJson;

  if (Math.random() < rolls.gearChance) {
    const job = Math.random() < 0.5 ? ('warrior' as const) : ('mage' as const);
    const tier = pickWeighted(
      (Object.entries(tierWeights) as [GearTier, number][]).map(([k, weight]) => ({
        k,
        weight,
      })),
    ).k;
    const slot = pickWeighted(
      (Object.entries(slotWeights) as [GearSlot, number][]).map(([k, weight]) => ({
        k,
        weight,
      })),
    ).k;

    const pool = gear[job][tier].filter((g) => {
      const droppable = (g as {droppable?: boolean}).droppable !== false;
      return droppable && g.slot === slot;
    });
    const fallback = gear[job][tier].filter(
      (g) => (g as {droppable?: boolean}).droppable !== false,
    );
    const list = pool.length ? pool : fallback;
    if (!list.length) {
      return rollConsumable();
    }
    const g = list[Math.floor(Math.random() * list.length)];
    return {
      kind: 'gear',
      name: g.name,
      qty: 1,
      color: g.color,
      job,
      gearId: g.id,
      gearSlot: g.slot as GearSlot,
      tier,
    };
  }
  return rollConsumable();

  function rollConsumable(): LootItemDraft {
    const picked = pickWeighted(
      (Object.entries(consumableWeights) as [keyof typeof consumables, number][]).map(
        ([kind, weight]) => ({kind, weight}),
      ),
    );
    const c = consumables[picked.kind];
    return {
      kind: picked.kind,
      name: c.name,
      qty: 1,
      color: c.color,
      job: null,
      gearId: null,
      gearSlot: null,
      tier: null,
    };
  }
}

export function starterGearItem(job: JobId): LootItemDraft {
  const s = itemsJson.starter;
  return {
    kind: 'gear',
    name: s.name,
    qty: s.qty,
    color: s.color,
    job,
    gearId: s.gearId,
    gearSlot: s.slot as GearSlot,
    tier: (s.tier as GearTier) ?? 'basic',
  };
}

export function draftToItem(draft: LootItemDraft): Item {
  return {
    id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: draft.kind === 'empty' ? 'potion' : draft.kind,
    name: draft.name,
    qty: draft.qty,
    color: draft.color,
    job: draft.job,
    gearId: draft.gearId,
    gearSlot: draft.gearSlot,
    tier: draft.tier,
  };
}

export function gearIconUrl(job: JobId, gearId: string, tier?: GearTier | null): string | null {
  const def = findGearDef(job, gearId);
  const t = tier ?? def?.tier;
  if (!t) return null;
  return gearPublicPath(job, t, gearId);
}

const itemsBase = displayJson.consumablePublicBase || '/todie/items';

export type ConsumableKind = 'potion' | 'mana' | 'scroll';

export function consumableIconUrl(kind: string): string | null {
  if (kind === 'potion' || kind === 'mana' || kind === 'scroll') {
    return `${itemsBase}/${kind}.png`;
  }
  return null;
}

export function itemIconUrl(item: {
  kind: string;
  job?: JobId | null;
  gearId?: string | null;
  tier?: GearTier | null;
}): string | null {
  if (item.kind === 'gear' && item.job && item.gearId) {
    return gearIconUrl(item.job, item.gearId, item.tier);
  }
  return consumableIconUrl(item.kind);
}

/** key = `${job}:${tier}:${id}` */
export async function loadGearImages(): Promise<Record<string, HTMLImageElement>> {
  const map: Record<string, HTMLImageElement> = {};
  const defs = allGearDefs();
  await Promise.all(
    defs.map(
      (g) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          const key = gearImageKey(g.job, g.tier, g.id);
          img.onload = () => {
            map[key] = img;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = gearPublicPath(g.job, g.tier, g.id);
        }),
    ),
  );
  return map;
}

export async function loadConsumableImages(): Promise<Record<string, HTMLImageElement>> {
  const kinds: ConsumableKind[] = ['potion', 'mana', 'scroll'];
  const map: Record<string, HTMLImageElement> = {};
  await Promise.all(
    kinds.map(
      (k) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            map[k] = img;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = `${itemsBase}/${k}.png`;
        }),
    ),
  );
  return map;
}
