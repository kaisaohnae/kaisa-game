import spawnJson from '../settings/spawn.json';

export const spawnSettings = spawnJson;

export function pickSpawnKind(): 'slime' | 'bat' | 'block' {
  const entries = Object.entries(spawnJson.kindWeights) as [
    'slime' | 'bat' | 'block',
    number,
  ][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return 'slime';
}
