import {loadConsumableImages, loadGearImages} from './items';
import {loadMonsterImages} from './monsters';
import {JOB_ART, loadJobImages, type LoadedImages} from './jobAssets';
import {loadSkillFxImages, type SkillFxImages} from './skillFx';
import {loadHitFxImages, type HitFxImages} from './hitFx';
import {isLibraryTileId} from './pixellabLibrary';
import {isBuiltinMapObject} from './mapObjects';
import {
  loadMapObjectImages,
  loadTileImages,
  loadTodieMap,
  prepareTileCanvases,
  type PreparedTiles,
  type TodieMapJson,
} from './tiles';
import type {JobId} from './types';
import type {MonsterImages} from './monsters';

export type TodieAssetBundle = {
  jobs: Record<JobId, LoadedImages>;
  gear: Record<string, HTMLImageElement>;
  consumables: Record<string, HTMLImageElement>;
  mobs: MonsterImages;
  skillFx: SkillFxImages;
  hitFx: HitFxImages;
  tiles: PreparedTiles;
  objects: Partial<Record<string, HTMLImageElement>>;
  map: TodieMapJson;
};

/** Load tile canvases + object sprites referenced by a stage map. */
export async function loadMapLayerAssets(map: TodieMapJson): Promise<{
  tiles: PreparedTiles;
  objects: Partial<Record<string, HTMLImageElement>>;
}> {
  const libTiles = map.palette.filter((id) => isLibraryTileId(id));
  const libProps = map.objects
    .filter((o) => !isBuiltinMapObject(o.kind))
    .map((o) => ({kind: o.kind, frame: o.frame}));
  const [tileImgs, objects] = await Promise.all([
    loadTileImages(libTiles),
    loadMapObjectImages(libProps),
  ]);
  return {
    tiles: prepareTileCanvases(tileImgs, map.tileSize, libTiles),
    objects,
  };
}

/** Preload every job action/skill + gear/consumable/mob/tile/map before gameplay starts. */
export async function preloadAllTodieAssets(stage = 1): Promise<TodieAssetBundle> {
  const map = await loadTodieMap(stage);

  const [warrior, mage, gear, consumables, mobs, skillFx, hitFx, mapLayers] = await Promise.all([
    loadJobImages('warrior'),
    loadJobImages('mage'),
    loadGearImages(),
    loadConsumableImages(),
    loadMonsterImages(),
    loadSkillFxImages(),
    loadHitFxImages(),
    loadMapLayerAssets(map),
  ]);

  void JOB_ART;

  return {
    jobs: {warrior, mage},
    gear,
    consumables,
    mobs,
    skillFx,
    hitFx,
    tiles: mapLayers.tiles,
    objects: mapLayers.objects,
    map,
  };
}
