import {JOB_ART, loadJobImages, type LoadedImages} from './jobAssets';
import {loadConsumableImages, loadGearImages} from './items';
import type {JobId} from './types';

export type TodieAssetBundle = {
  jobs: Record<JobId, LoadedImages>;
  gear: Record<string, HTMLImageElement>;
  consumables: Record<string, HTMLImageElement>;
};

/** Preload every job action/skill + gear/consumable PNG before gameplay starts. */
export async function preloadAllTodieAssets(): Promise<TodieAssetBundle> {
  const [warrior, mage, gear, consumables] = await Promise.all([
    loadJobImages('warrior'),
    loadJobImages('mage'),
    loadGearImages(),
    loadConsumableImages(),
  ]);

  void JOB_ART;

  return {
    jobs: {warrior, mage},
    gear,
    consumables,
  };
}
