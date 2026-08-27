import type {VehicleDef} from './vehicles';
import {vehicleImageUrls} from './vehicles';

export type LoadedVehicle = {
  id: string;
  kind: VehicleDef['kind'];
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

export async function loadVehicle(def: VehicleDef): Promise<LoadedVehicle> {
  const urls = vehicleImageUrls(def);
  const images = await Promise.all(urls.map(loadImage));
  const first = images[0]!;
  return {
    id: def.id,
    kind: def.kind,
    images,
    naturalWidth: first.naturalWidth,
    naturalHeight: first.naturalHeight,
  };
}

export async function loadAllVehicles(defs: VehicleDef[]) {
  const entries = await Promise.all(defs.map(async (def) => [def.id, await loadVehicle(def)] as const));
  return new Map(entries);
}

export function vehicleDisplaySize(vehicle: LoadedVehicle, displayHeight: number) {
  const ratio = vehicle.naturalWidth / Math.max(vehicle.naturalHeight, 1);
  return {
    width: displayHeight * ratio,
    height: displayHeight,
  };
}

/** 플레이어 차량: 스프라이트(6시) → 화면 12시. 장애물 차량: rotate=false 로 6시 유지 */
export function drawVehicleSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  w: number,
  h: number,
  opts?: {faceUp?: boolean; alpha?: number},
) {
  const faceUp = opts?.faceUp ?? true;
  const alpha = opts?.alpha ?? 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  if (faceUp) ctx.rotate(Math.PI);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}
