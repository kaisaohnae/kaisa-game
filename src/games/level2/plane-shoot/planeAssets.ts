import type {PlaneDef} from './planes';

export type LoadedPlane = {
  id: string;
  images: HTMLImageElement[];
  naturalWidth: number;
  naturalHeight: number;
};

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

export async function loadPlane(def: PlaneDef): Promise<LoadedPlane> {
  const img = await loadImage(def.src);
  return {
    id: def.id,
    images: [img],
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
  };
}

export async function loadAllPlanes(defs: PlaneDef[]) {
  const entries = await Promise.all(
    defs.map(async (def) => {
      try {
        return [def.id, await loadPlane(def)] as const;
      } catch {
        return null;
      }
    }),
  );
  return new Map(entries.filter((e): e is readonly [string, LoadedPlane] => e != null));
}

export function planeDisplaySize(plane: LoadedPlane, displayHeight: number) {
  const ratio = plane.naturalWidth / Math.max(plane.naturalHeight, 1);
  return {
    width: displayHeight * ratio,
    height: displayHeight,
  };
}

/**
 * PNG 기본 방향 = 12시(코 위).
 * - faceDown false (플레이어): 그대로 12시
 * - faceDown true (적기): 180° → 화면 6시
 */
export function drawPlaneSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  w: number,
  h: number,
  opts?: {faceDown?: boolean; alpha?: number},
) {
  const faceDown = opts?.faceDown ?? false;
  const alpha = opts?.alpha ?? 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(cx, cy);
  if (faceDown) ctx.rotate(Math.PI);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

export async function loadHeartImage() {
  try {
    return await loadImage('/plane-shoot/fx/heart.png');
  } catch {
    return null;
  }
}

export async function loadImageMap(urls: Record<string, string>) {
  const entries = await Promise.all(
    Object.entries(urls).map(async ([id, url]) => {
      try {
        return [id, await loadImage(url)] as const;
      } catch {
        return null;
      }
    }),
  );
  return new Map(entries.filter((e): e is readonly [string, HTMLImageElement] => e != null));
}

export function drawSpriteImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  cx: number,
  cy: number,
  w: number,
  h: number,
  opts?: {rotation?: number; alpha?: number},
) {
  const alpha = opts?.alpha ?? 1;
  const rotation = opts?.rotation ?? 0;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(cx, cy);
  if (rotation) ctx.rotate(rotation);
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    ctx.fillStyle = '#ffee58';
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }
  ctx.restore();
}

