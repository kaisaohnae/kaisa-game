import spawnJson from '../settings/spawn.json';

export const spawnSettings = spawnJson;

export type SpawnMobKind = 'slime' | 'bat' | 'block' | 'wolf' | 'spider';

export function pickSpawnKind(): SpawnMobKind {
  const entries = Object.entries(spawnJson.kindWeights) as [SpawnMobKind, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return 'slime';
}
