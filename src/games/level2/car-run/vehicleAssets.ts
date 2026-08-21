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

export function vehicleFrameIndex(vehicle: LoadedVehicle, now: number, frameMs = 140) {
  if (vehicle.kind !== 'animated' || vehicle.images.length <= 1) return 0;
  return Math.floor(now / frameMs) % vehicle.images.length;
}
