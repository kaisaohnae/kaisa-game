import type {ActionId, JobId} from './types';

import warriorIdle from '../jobs/warrior/actions/idle.png';
import warriorWalk from '../jobs/warrior/actions/walk.png';
import warriorRoll from '../jobs/warrior/actions/roll.png';
import warriorSlash from '../jobs/warrior/skills/slash.png';
import warriorSpin from '../jobs/warrior/skills/spin.png';
import warriorBash from '../jobs/warrior/skills/bash.png';

import mageIdle from '../jobs/mage/actions/idle.png';
import mageWalk from '../jobs/mage/actions/walk.png';
import mageRoll from '../jobs/mage/actions/roll.png';
import mageBolt from '../jobs/mage/skills/bolt.png';
import mageNova from '../jobs/mage/skills/nova.png';
import mageShield from '../jobs/mage/skills/shield.png';

type AssetImport = string | {src: string};

function assetUrl(mod: AssetImport): string {
  return typeof mod === 'string' ? mod : mod.src;
}

type JobArt = {
  actions: Record<ActionId, string>;
  skills: Record<string, string>;
};

export const JOB_ART: Record<JobId, JobArt> = {
  warrior: {
    actions: {
      idle: assetUrl(warriorIdle),
      walk: assetUrl(warriorWalk),
      roll: assetUrl(warriorRoll),
    },
    skills: {
      slash: assetUrl(warriorSlash),
      spin: assetUrl(warriorSpin),
      bash: assetUrl(warriorBash),
    },
  },
  mage: {
    actions: {
      idle: assetUrl(mageIdle),
      walk: assetUrl(mageWalk),
      roll: assetUrl(mageRoll),
    },
    skills: {
      bolt: assetUrl(mageBolt),
      nova: assetUrl(mageNova),
      shield: assetUrl(mageShield),
    },
  },
};

export type LoadedImages = {
  actions: Record<ActionId, HTMLImageElement>;
  skills: Record<string, HTMLImageElement>;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export async function loadJobImages(job: JobId): Promise<LoadedImages> {
  const art = JOB_ART[job];
  const actions = {} as Record<ActionId, HTMLImageElement>;
  const skills: Record<string, HTMLImageElement> = {};

  await Promise.all([
    ...(Object.keys(art.actions) as ActionId[]).map(async (id) => {
      actions[id] = await loadImage(art.actions[id]);
    }),
    ...Object.keys(art.skills).map(async (id) => {
      skills[id] = await loadImage(art.skills[id]);
    }),
  ]);

  return {actions, skills};
}
