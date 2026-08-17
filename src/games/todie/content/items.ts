import itemsJson from '../settings/items.json';
import dropsJson from '../settings/drops.json';
import displayJson from '../settings/display.json';
import {jobLabel} from './settings';
import type {JobId} from './types';
import type {GearSlot, Item} from './equip';
import {EQUIP_SLOTS} from './equip';

export const itemSettings = itemsJson;
export const dropSettings = dropsJson;

export type GearTier = 'basic' | 'ascend' | 'unique' | 'hero';

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
const naming = itemsJson.naming ?? {
  gearPrefix: '{job}의 {name}',
  wrongJobColor: '#ff5252',
  showNameOnGround: true,
};

export function wrongJobColor(): string {
  return naming.wrongJobColor || '#ff5252';
}

export function showNameOnGround(): boolean {
  return naming.showNameOnGround !== false;
}

/** Apply settings naming.gearPrefix — e.g. "검사의 전승 강철검" */
export function formatGearName(job: JobId, baseName: string): string {
  const pattern = naming.gearPrefix || '{job}의 {name}';
  return pattern.replaceAll('{job}', jobLabel(job)).replaceAll('{name}', baseName);
}

export function gearImageKey(
  job: JobId,
  tier: GearTier,
  id: string,
  dir?: string,
): string {
  return dir ? `${job}:${tier}:${id}:${dir}` : `${job}:${tier}:${id}`;
}

export function gearPublicPath(
  job: JobId,
  tier: GearTier,
  id: string,
  dir?: string,
): string {
  if (dir) return `${gearBase}/${job}/${tier}/${id}_${dir}.png`;
  return `${gearBase}/${job}/${tier}/${id}.png`;
}

export function tierMeta(tier: GearTier | null | undefined) {
  if (!tier) return null;
  return itemsJson.tiers[tier] ?? null;
}

export type GearStats = {atk: number; def: number; hp: number};

const DEFAULT_FOCUS = {atk: 1, def: 1, hp: 1};

/** 등급 기본 성능 × 슬롯 가중치 (settings로 조절) */
export function gearStatsFor(tier: GearTier | null, slot: GearSlot | null): GearStats {
  if (!tier) return {atk: 0, def: 0, hp: 0};
  const t = itemsJson.tiers[tier] as {
    stats?: GearStats;
  };
  const base = t.stats ?? {atk: 0, def: 0, hp: 0};
  const focusMap = (itemsJson as {slotStatFocus?: Record<string, GearStats>}).slotStatFocus;
  const focus = (slot && focusMap?.[slot]) || DEFAULT_FOCUS;
  return {
    atk: Math.round(base.atk * focus.atk),
    def: Math.round(base.def * focus.def),
    hp: Math.round(base.hp * focus.hp),
  };
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

function tierWeightsFromSettings(): {k: GearTier; weight: number}[] {
  return (Object.entries(itemsJson.tiers) as [GearTier, {dropWeight: number}][]).map(
    ([k, t]) => ({k, weight: t.dropWeight}),
  );
}

export function tierDropSharePct(tier: GearTier | null): number {
  if (!tier) return 0;
  const weights = tierWeightsFromSettings();
  const total = weights.reduce((s, x) => s + x.weight, 0) || 1;
  const w = weights.find((x) => x.k === tier)?.weight ?? 0;
  return Math.round((w / total) * 1000) / 10;
}

export function gearDropChancePct(tier: GearTier | null): number {
  const gearChance = dropsJson.rolls.gearChance ?? 0.34;
  return Math.round(gearChance * tierDropSharePct(tier) * 10) / 10;
}

export type ItemHelpInfo = {
  title: string;
  tierLabel: string | null;
  tierColor: string | null;
  jobLine: string | null;
  usable: boolean;
  dropLine: string | null;
  statsLine: string | null;
  help: string;
  lines: string[];
};

export function buildItemHelp(item: Item, playerJob: JobId): ItemHelpInfo | null {
  if (item.kind === 'empty') return null;

  if (item.kind === 'gear') {
    const tier = item.tier;
    const meta = tierMeta(tier);
    const stats = gearStatsFor(tier, item.gearSlot);
    const usable = !item.job || item.job === playerJob;
    const share = tierDropSharePct(tier);
    const overall = gearDropChancePct(tier);
    const slotLabel =
      EQUIP_SLOTS.find((s) => s.id === item.gearSlot)?.label ?? item.gearSlot ?? '장비';
    const help =
      (meta as {help?: string} | null)?.help ??
      '장비 아이템입니다. 우클릭으로 장착할 수 있어요.';
    const lines = [
      `슬롯 · ${slotLabel}`,
      item.job ? `직업 · ${jobLabel(item.job)}${usable ? ' (착용 가능)' : ' (착용 불가)'}` : '직업 · 공용',
      meta ? `등급 · ${meta.label}` : null,
      `드랍 · 장비 중 ${share}% · 전체 약 ${overall}%`,
      `성능 · 공격 +${stats.atk} / 방어 +${stats.def} / 체력 +${stats.hp}`,
      help,
    ].filter(Boolean) as string[];

    return {
      title: item.name,
      tierLabel: meta?.label ?? null,
      tierColor: meta?.color ?? null,
      jobLine: item.job ? `${jobLabel(item.job)} 전용` : null,
      usable,
      dropLine: `장비 중 ${share}% (전체 ≈ ${overall}%)`,
      statsLine: `공격 +${stats.atk} · 방어 +${stats.def} · 체력 +${stats.hp}`,
      help,
      lines,
    };
  }

  const cons = itemsJson.consumables[item.kind as 'potion' | 'mana'] as
    | {name: string; help?: string; effect?: string}
    | undefined;
  const cw = dropsJson.consumableWeights as Record<string, number>;
  const cTotal = Object.values(cw).reduce((s, w) => s + w, 0) || 1;
  const cShare = Math.round(((cw[item.kind] ?? 0) / cTotal) * 1000) / 10;
  const overall = Math.round((1 - (dropsJson.rolls.gearChance ?? 0.34)) * cShare * 10) / 10;
  const help = cons?.help ?? '소비 아이템입니다.';
  const lines = [
    `종류 · 소비아이템`,
    cons?.effect ? `효과 · ${cons.effect}` : null,
    `드랍 · 소비 중 ${cShare}% · 전체 약 ${overall}%`,
    help,
  ].filter(Boolean) as string[];

  return {
    title: item.name,
    tierLabel: null,
    tierColor: null,
    jobLine: null,
    usable: true,
    dropLine: `소비 중 ${cShare}% (전체 ≈ ${overall}%)`,
    statsLine: cons?.effect ?? null,
    help,
    lines,
  };
}

/** 장착 장비 합산 성능 */
export function sumEquippedStats(equipped: import('./equip').Equipment): GearStats {
  let atk = 0;
  let def = 0;
  let hp = 0;
  for (const s of EQUIP_SLOTS) {
    const it = equipped[s.id];
    if (!it || it.kind !== 'gear') continue;
    const st = gearStatsFor(it.tier, it.gearSlot);
    atk += st.atk;
    def += st.def;
    hp += st.hp;
  }
  return {atk, def, hp};
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
  const {rolls, consumableWeights, slotWeights, jobWeights} = dropsJson;
  const {consumables, gear} = itemsJson;

  if (Math.random() < rolls.gearChance) {
    const job = pickWeighted(
      (Object.entries(jobWeights ?? {warrior: 50, mage: 50}) as [JobId, number][]).map(
        ([k, weight]) => ({k, weight}),
      ),
    ).k;
    const tier = pickWeighted(tierWeightsFromSettings()).k;
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
      name: formatGearName(job, g.name),
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
    name: formatGearName(job, s.name),
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

export type ConsumableKind = 'potion' | 'mana';

export function consumableIconUrl(kind: string): string | null {
  if (kind === 'potion' || kind === 'mana') {
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

/** key = `${job}:${tier}:${id}` or with `:dir` for 4-dir weapon overlays */
export async function loadGearImages(): Promise<Record<string, HTMLImageElement>> {
  const map: Record<string, HTMLImageElement> = {};
  const defs = allGearDefs();
  const dirs = ['down', 'left', 'right', 'up'] as const;

  const loadOne = (src: string, key: string) =>
    new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        map[key] = img;
        resolve();
      };
      img.onerror = () => resolve();
      img.src = src;
    });

  const tasks: Promise<void>[] = [];
  for (const g of defs) {
    tasks.push(loadOne(gearPublicPath(g.job, g.tier, g.id), gearImageKey(g.job, g.tier, g.id)));
    if (g.slot === 'weapon') {
      for (const dir of dirs) {
        tasks.push(
          loadOne(
            gearPublicPath(g.job, g.tier, g.id, dir),
            gearImageKey(g.job, g.tier, g.id, dir),
          ),
        );
      }
    }
  }
  await Promise.all(tasks);
  return map;
}

export async function loadConsumableImages(): Promise<Record<string, HTMLImageElement>> {
  const kinds: ConsumableKind[] = ['potion', 'mana'];
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
