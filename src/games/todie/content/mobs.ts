import {displaySettings} from './settings';

export type MobSpriteId =
  | 'slime'
  | 'bat'
  | 'block'
  | 'boss'
  | 'slime_elite'
  | 'bat_elite'
  | 'block_elite';

const MOB_IDS: MobSpriteId[] = [
  'slime',
  'bat',
  'block',
  'boss',
  'slime_elite',
  'bat_elite',
  'block_elite',
];

export function mobPublicBase(): string {
  return (displaySettings as {mobs?: {publicBase?: string}}).mobs?.publicBase ?? '/todie/mobs';
}

export function mobSpriteUrl(id: MobSpriteId): string {
  return `${mobPublicBase()}/${id}.png`;
}

export function mobDrawSize(kind: string, elite: boolean): number {
  const sizes = (displaySettings as {mobs?: {size?: Record<string, number>; eliteScale?: number}})
    .mobs;
  const base = sizes?.size?.[kind] ?? (kind === 'boss' ? 120 : 68);
  if (kind === 'boss') return base;
  return Math.round(base * (elite ? (sizes?.eliteScale ?? 1.18) : 1));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export async function loadMobImages(): Promise<Record<string, HTMLImageElement>> {
  const out: Record<string, HTMLImageElement> = {};
  await Promise.all(
    MOB_IDS.map(async (id) => {
      try {
        out[id] = await loadImage(mobSpriteUrl(id));
      } catch {
        // optional fallback — draw code uses procedural shapes
      }
    }),
  );
  return out;
}

export function mobSpriteKey(kind: string, elite: boolean): MobSpriteId {
  if (kind === 'boss') return 'boss';
  if (elite) return `${kind}_elite` as MobSpriteId;
  return kind as MobSpriteId;
}
