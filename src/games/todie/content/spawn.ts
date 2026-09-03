import spawnJson from '../settings/spawn.json';

export const spawnSettings = spawnJson;

export type SpawnMobKind =
  | 'slime'
  | 'bat'
  | 'block'
  | 'wolf'
  | 'spider'
  | 'ghoul'
  | 'wraith'
  | 'skeleton'
  | 'banshee'
  | 'direwolf'
  | 'reaper'
  | 'lich'
  | 'deathknight'
  | 'nightmare'
  | 'wight';

function weightsForStage(stage: number): Record<string, number> {
  if (stage >= 3 && spawnJson.kindWeightsStage3) return spawnJson.kindWeightsStage3;
  if (stage >= 2 && spawnJson.kindWeightsStage2) return spawnJson.kindWeightsStage2;
  return spawnJson.kindWeights;
}

/** 스테이지(1~3)에 따라 다른 몹 구성비로 뽑음 — 스테이지2/3엔 더 강한 몹이 섞여 나온다. */
export function pickSpawnKind(stage = 1): SpawnMobKind {
  const table = weightsForStage(stage);
  const entries = Object.entries(table) as [SpawnMobKind, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return 'slime';
}
