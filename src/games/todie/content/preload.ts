import {JOB_ART, loadJobImages, type LoadedImages} from './jobAssets';
import {loadConsumableImages, loadGearImages} from './items';
import {loadMobImages} from './mobs';
import type {JobId} from './types';

export type TodieAssetBundle = {
  jobs: Record<JobId, LoadedImages>;
  gear: Record<string, HTMLImageElement>;
  consumables: Record<string, HTMLImageElement>;
  mobs: Record<string, HTMLImageElement>;
};

/** Preload every job action/skill + gear/consumable/mob PNG before gameplay starts. */
export async function preloadAllTodieAssets(): Promise<TodieAssetBundle> {
  const [warrior, mage, gear, consumables, mobs] = await Promise.all([
    loadJobImages('warrior'),
    loadJobImages('mage'),
    loadGearImages(),
    loadConsumableImages(),
    loadMobImages(),
  ]);

  void JOB_ART;

  return {
    jobs: {warrior, mage},
    gear,
    consumables,
    mobs,
  };
}
