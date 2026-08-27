const BASE = '/car-run/obstacles';

/** 게임에서 쓰는 정적 픽업만 (소형 프롭 장애물 제거) */
export const OBSTACLE_SPRITE_KINDS = ['heart'] as const;

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
