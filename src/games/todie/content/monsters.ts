/** PixelLab-matched monsters under /common/monsters */

import settingsJson from '../settings/settings.json';
import monstersCatalog from '../settings/monsters.catalog.json';
import {facingToCardinal, CARDINAL_DIRS} from './jobAssets';
import type {CardinalDir} from './types';

export type MonsterTier = 'normal' | 'elite' | 'boss' | 'final';

export type MonsterDef = {
  id: string;
  title: string;
  en_title?: string;
  catalogTitle: string;
  tier: MonsterTier;
  ranged: boolean;
};

export type TierConfig = {
  label: string;
  hp: number;
  speed: number;
  touchDamage: number;
  count: number;
  dropCount: [number, number];
  respawnSec: number;
  size: number;
  potionChance: number;
  tierWeights: Partial<Record<'basic' | 'ascend' | 'unique' | 'hero' | 'mythic', number>>;
};

export const gameSettings = settingsJson;

const PIX_DIRS = [
  'south',
  'west',
  'east',
  'north',
  'south-east',
  'north-east',
  'north-west',
  'south-west',
] as const;

/** Game cardinal → PixelLab rotation filename */
export const CARDINAL_TO_PIX: Record<CardinalDir, string> = {
  down: 'south',
  downRight: 'south-east',
  right: 'east',
  upRight: 'north-east',
  up: 'north',
  upLeft: 'north-west',
  left: 'west',
  downLeft: 'south-west',
};

const catalogByTitle = new Map(
  (monstersCatalog.monsters ?? []).map((m) => [m.title as string, m]),
);

export function tierConfig(tier: MonsterTier): TierConfig {
  return settingsJson.tiers[tier] as TierConfig;
}

/** stage1=0.8, stage2=1.0, stage3=1.2 … 스테이지마다 +0.2 */
export function stageTouchDamageMult(stage: number): number {
  const cfg = (
    settingsJson as {
      combat?: {stageTouchDamage?: {base?: number; perStage?: number}};
    }
  ).combat?.stageTouchDamage;
  const base = cfg?.base ?? 0.8;
  const per = cfg?.perStage ?? 0.2;
  const n = Math.max(1, Math.floor(stage));
  return base + (n - 1) * per;
}

export function detectTier(title: string): MonsterTier {
  if (title.startsWith('몬스터: 최종')) return 'final';
  if (title.startsWith('몬스터: 보스')) return 'boss';
  if (title.startsWith('몬스터: 정예')) return 'elite';
  return 'normal';
}

export function monstersForStage(stage: number): MonsterDef[] {
  const stages = settingsJson.stages as Record<string, {monsters?: unknown[]}>;
  const n = Math.max(1, Math.floor(stage));
  const key = String(n);
  const fallbackKey = Object.keys(stages)
    .map(Number)
    .filter((k) => Number.isFinite(k) && k > 0)
    .sort((a, b) => b - a)[0];
  const list =
    (stages[key]?.monsters as {title: string; en_title?: string; ranged?: boolean}[] | undefined) ??
    (fallbackKey != null
      ? (stages[String(fallbackKey)]?.monsters as
          | {title: string; en_title?: string; ranged?: boolean}[]
          | undefined)
      : undefined) ??
    [];
  const out: MonsterDef[] = [];
  for (const row of list) {
    const cat = catalogByTitle.get(row.title);
    if (!cat) continue;
    out.push({
      id: cat.id,
      title: row.title,
      en_title: row.en_title ?? cat.en_title,
      catalogTitle: cat.catalogTitle,
      tier: (cat.tier as MonsterTier) || detectTier(row.title),
      ranged: Boolean(row.ranged),
    });
  }
  return out;
}

export function monstersByTier(stage: number): Record<MonsterTier, MonsterDef[]> {
  const groups: Record<MonsterTier, MonsterDef[]> = {
    normal: [],
    elite: [],
    boss: [],
    final: [],
  };
  for (const m of monstersForStage(stage)) groups[m.tier].push(m);
  return groups;
}

export function monsterPublicBase(): string {
  return settingsJson.paths.monstersPublic ?? '/common/monsters';
}

export function monsterSpriteUrl(
  id: string,
  action: 'walk' | 'attack' | 'idle',
  dir: CardinalDir | string,
): string {
  const pix =
    typeof dir === 'string' && PIX_DIRS.includes(dir as (typeof PIX_DIRS)[number])
      ? dir
      : CARDINAL_TO_PIX[dir as CardinalDir] ?? 'south';
  return `${monsterPublicBase()}/${id}/${action}/${pix}.png`;
}

export function monsterDrawSize(tier: MonsterTier): number {
  return tierConfig(tier).size;
}

export function monsterAggro(tier: MonsterTier): {aggro: number; deaggro: number} {
  return settingsJson.aggro[tier] ?? settingsJson.aggro.normal;
}

export function combatRange(
  who: 'monster' | 'player',
  ranged: boolean,
): {forward: number; side: number} {
  const cfg = settingsJson.combat[who];
  if (ranged) return {forward: cfg.ranged.forward, side: 0};
  return {forward: cfg.melee.forward, side: cfg.melee.side};
}

/**
 * Forward-cone / box style reach check.
 * facing: atan2 radians (0 = +X right, π/2 = +Y down).
 */
export function inAttackRange(
  ax: number,
  ay: number,
  facing: number,
  bx: number,
  by: number,
  ranged: boolean,
  who: 'monster' | 'player' = 'monster',
): boolean {
  const {forward, side} = combatRange(who, ranged);
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  if (ranged) return dist <= forward;
  if (dist > forward + 4) return false;
  const fx = Math.cos(facing);
  const fy = Math.sin(facing);
  const along = dx * fx + dy * fy;
  if (along < -8 || along > forward) return false;
  const perp = Math.abs(-dy * fx + dx * fy);
  return perp <= side;
}

export function randDropCount(tier: MonsterTier): number {
  const [lo, hi] = tierConfig(tier).dropCount;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export type MonsterImages = Record<
  string,
  {
    walk: Partial<Record<CardinalDir, HTMLImageElement>>;
    attack: Partial<Record<CardinalDir, HTMLImageElement>>;
    idle: Partial<Record<CardinalDir, HTMLImageElement>>;
  }
>;

export async function loadMonsterImages(): Promise<MonsterImages> {
  const out: MonsterImages = {};
  const ids = [...new Set((monstersCatalog.monsters ?? []).map((m) => m.id as string))];
  await Promise.all(
    ids.map(async (id) => {
      const walk: Partial<Record<CardinalDir, HTMLImageElement>> = {};
      const attack: Partial<Record<CardinalDir, HTMLImageElement>> = {};
      const idle: Partial<Record<CardinalDir, HTMLImageElement>> = {};
      await Promise.all(
        CARDINAL_DIRS.map(async (dir) => {
          try {
            walk[dir] = await loadImage(monsterSpriteUrl(id, 'walk', dir));
          } catch {
            /* optional */
          }
          try {
            attack[dir] = await loadImage(monsterSpriteUrl(id, 'attack', dir));
          } catch {
            /* optional */
          }
          try {
            idle[dir] = await loadImage(monsterSpriteUrl(id, 'idle', dir));
          } catch {
            /* optional */
          }
        }),
      );
      out[id] = {walk, attack, idle};
    }),
  );
  return out;
}

export function monsterFacingDir(facing: number): CardinalDir {
  return facingToCardinal(facing);
}

export type MonsterPose = 'walk' | 'attack' | 'idle';

export function pickMonsterSprite(
  images: MonsterImages,
  id: string,
  pose: MonsterPose | boolean,
  facing: number,
): HTMLImageElement | null {
  const pack = images[id];
  if (!pack) return null;
  const dir = monsterFacingDir(facing);
  // legacy: boolean attacking
  const kind: MonsterPose =
    typeof pose === 'boolean' ? (pose ? 'attack' : 'walk') : pose;
  const set = pack[kind] ?? pack.walk;
  return (
    set[dir] ??
    pack.walk[dir] ??
    pack.idle[dir] ??
    pack.walk.down ??
    pack.idle.down ??
    pack.attack.down ??
    null
  );
}

/** Build spawn list for a stage: tier counts distributed across available defs */
export function buildStageSpawnPlan(stage: number): {def: MonsterDef; tier: MonsterTier}[] {
  const byTier = monstersByTier(stage);
  const plan: {def: MonsterDef; tier: MonsterTier}[] = [];
  for (const tier of ['normal', 'elite', 'boss', 'final'] as MonsterTier[]) {
    const defs = byTier[tier];
    if (!defs.length) continue;
    const count = tierConfig(tier).count;
    for (let i = 0; i < count; i += 1) {
      plan.push({def: defs[i % defs.length]!, tier});
    }
  }
  return plan;
}

export {facingToCardinal};
