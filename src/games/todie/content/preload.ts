import {loadConsumableImages, loadGearImages} from './items';
import {loadMobImages} from './mobs';
import {JOB_ART, loadJobImages, type LoadedImages} from './jobAssets';
import {
  loadMapObjectImages,
  loadTileImages,
  loadTodieMap,
  prepareTileCanvases,
  type PreparedTiles,
  type TodieMapJson,
} from './tiles';
import type {JobId} from './types';

export type TodieAssetBundle = {
  jobs: Record<JobId, LoadedImages>;
  gear: Record<string, HTMLImageElement>;
  consumables: Record<string, HTMLImageElement>;
  mobs: Record<string, HTMLImageElement>;
  tiles: PreparedTiles;
  objects: Partial<Record<string, HTMLImageElement>>;
  map: TodieMapJson;
};

/** Preload every job action/skill + gear/consumable/mob/tile/map before gameplay starts. */
export async function preloadAllTodieAssets(): Promise<TodieAssetBundle> {
  const [warrior, mage, gear, consumables, mobs, tileImgs, objects, map] = await Promise.all([
    loadJobImages('warrior'),
    loadJobImages('mage'),
    loadGearImages(),
    loadConsumableImages(),
    loadMobImages(),
    loadTileImages(),
    loadMapObjectImages(),
    loadTodieMap(),
  ]);

  void JOB_ART;

  const tiles = prepareTileCanvases(tileImgs, map.tileSize);

  return {
    jobs: {warrior, mage},
    gear,
    consumables,
    mobs,
    tiles,
    objects,
    map,
  };
}
