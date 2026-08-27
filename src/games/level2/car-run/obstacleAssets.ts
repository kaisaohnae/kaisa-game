const BASE = '/car-run/obstacles';

export const OBSTACLE_SPRITE_KINDS = [
  'cone',
  'rock',
  'crate',
  'barrel',
  'tire',
  'barrier',
  'puddle',
  'sign',
] as const;

export type ObstacleSpriteKind = (typeof OBSTACLE_SPRITE_KINDS)[number];

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

export async function loadObstacleImages(): Promise<
  Partial<Record<ObstacleSpriteKind, HTMLImageElement>>
> {
  const out: Partial<Record<ObstacleSpriteKind, HTMLImageElement>> = {};
  await Promise.all(
    OBSTACLE_SPRITE_KINDS.map(async (kind) => {
      try {
        out[kind] = await loadImage(`${BASE}/${kind}.png`);
      } catch {
        /* procedural fallback */
      }
    }),
  );
  return out;
}

export function drawObstacleSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x - w / 2, y, w, h);
  ctx.restore();
}
