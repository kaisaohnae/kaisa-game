import {
  buildStageSpawnPlan,
  gameSettings,
  monstersForStage,
  type MonsterDef,
  type MonsterTier,
} from './monsters';

export const spawnSettings = {
  worldSize: gameSettings.world.size,
  worldMargin: gameSettings.world.margin,
};

export type SpawnMobKind = string;

export function pickSpawnKind(stage = 1): SpawnMobKind {
  const list = monstersForStage(stage);
  if (!list.length) return 'skeleton-warrior';
  return list[Math.floor(Math.random() * list.length)]!.id;
}

export function spawnPlanForStage(stage: number): {def: MonsterDef; tier: MonsterTier}[] {
  return buildStageSpawnPlan(stage);
}
