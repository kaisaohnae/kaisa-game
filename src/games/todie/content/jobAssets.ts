import type {ActionId, CardinalDir, JobId} from './types';

import warriorIdleDown from '../jobs/warrior/actions/idle_down.png';
import warriorIdleDownRight from '../jobs/warrior/actions/idle_downRight.png';
import warriorIdleRight from '../jobs/warrior/actions/idle_right.png';
import warriorIdleUpRight from '../jobs/warrior/actions/idle_upRight.png';
import warriorIdleUp from '../jobs/warrior/actions/idle_up.png';
import warriorIdleUpLeft from '../jobs/warrior/actions/idle_upLeft.png';
import warriorIdleLeft from '../jobs/warrior/actions/idle_left.png';
import warriorIdleDownLeft from '../jobs/warrior/actions/idle_downLeft.png';
import warriorWalkDown from '../jobs/warrior/actions/walk_down.png';
import warriorWalkDownRight from '../jobs/warrior/actions/walk_downRight.png';
import warriorWalkRight from '../jobs/warrior/actions/walk_right.png';
import warriorWalkUpRight from '../jobs/warrior/actions/walk_upRight.png';
import warriorWalkUp from '../jobs/warrior/actions/walk_up.png';
import warriorWalkUpLeft from '../jobs/warrior/actions/walk_upLeft.png';
import warriorWalkLeft from '../jobs/warrior/actions/walk_left.png';
import warriorWalkDownLeft from '../jobs/warrior/actions/walk_downLeft.png';
import warriorRollDown from '../jobs/warrior/actions/roll_down.png';
import warriorRollDownRight from '../jobs/warrior/actions/roll_downRight.png';
import warriorRollRight from '../jobs/warrior/actions/roll_right.png';
import warriorRollUpRight from '../jobs/warrior/actions/roll_upRight.png';
import warriorRollUp from '../jobs/warrior/actions/roll_up.png';
import warriorRollUpLeft from '../jobs/warrior/actions/roll_upLeft.png';
import warriorRollLeft from '../jobs/warrior/actions/roll_left.png';
import warriorRollDownLeft from '../jobs/warrior/actions/roll_downLeft.png';
import warriorAttackDown from '../jobs/warrior/actions/attack_down.png';
import warriorAttackDownRight from '../jobs/warrior/actions/attack_downRight.png';
import warriorAttackRight from '../jobs/warrior/actions/attack_right.png';
import warriorAttackUpRight from '../jobs/warrior/actions/attack_upRight.png';
import warriorAttackUp from '../jobs/warrior/actions/attack_up.png';
import warriorAttackUpLeft from '../jobs/warrior/actions/attack_upLeft.png';
import warriorAttackLeft from '../jobs/warrior/actions/attack_left.png';
import warriorAttackDownLeft from '../jobs/warrior/actions/attack_downLeft.png';

import mageIdleDown from '../jobs/mage/actions/idle_down.png';
import mageIdleDownRight from '../jobs/mage/actions/idle_downRight.png';
import mageIdleRight from '../jobs/mage/actions/idle_right.png';
import mageIdleUpRight from '../jobs/mage/actions/idle_upRight.png';
import mageIdleUp from '../jobs/mage/actions/idle_up.png';
import mageIdleUpLeft from '../jobs/mage/actions/idle_upLeft.png';
import mageIdleLeft from '../jobs/mage/actions/idle_left.png';
import mageIdleDownLeft from '../jobs/mage/actions/idle_downLeft.png';
import mageWalkDown from '../jobs/mage/actions/walk_down.png';
import mageWalkDownRight from '../jobs/mage/actions/walk_downRight.png';
import mageWalkRight from '../jobs/mage/actions/walk_right.png';
import mageWalkUpRight from '../jobs/mage/actions/walk_upRight.png';
import mageWalkUp from '../jobs/mage/actions/walk_up.png';
import mageWalkUpLeft from '../jobs/mage/actions/walk_upLeft.png';
import mageWalkLeft from '../jobs/mage/actions/walk_left.png';
import mageWalkDownLeft from '../jobs/mage/actions/walk_downLeft.png';
import mageRollDown from '../jobs/mage/actions/roll_down.png';
import mageRollDownRight from '../jobs/mage/actions/roll_downRight.png';
import mageRollRight from '../jobs/mage/actions/roll_right.png';
import mageRollUpRight from '../jobs/mage/actions/roll_upRight.png';
import mageRollUp from '../jobs/mage/actions/roll_up.png';
import mageRollUpLeft from '../jobs/mage/actions/roll_upLeft.png';
import mageRollLeft from '../jobs/mage/actions/roll_left.png';
import mageRollDownLeft from '../jobs/mage/actions/roll_downLeft.png';
import mageAttackDown from '../jobs/mage/actions/attack_down.png';
import mageAttackDownRight from '../jobs/mage/actions/attack_downRight.png';
import mageAttackRight from '../jobs/mage/actions/attack_right.png';
import mageAttackUpRight from '../jobs/mage/actions/attack_upRight.png';
import mageAttackUp from '../jobs/mage/actions/attack_up.png';
import mageAttackUpLeft from '../jobs/mage/actions/attack_upLeft.png';
import mageAttackLeft from '../jobs/mage/actions/attack_left.png';
import mageAttackDownLeft from '../jobs/mage/actions/attack_downLeft.png';

type AssetImport = string | {src: string};

function assetUrl(mod: AssetImport): string {
  return typeof mod === 'string' ? mod : mod.src;
}

export const CARDINAL_DIRS: CardinalDir[] = [
  'down',
  'downRight',
  'right',
  'upRight',
  'up',
  'upLeft',
  'left',
  'downLeft',
];

type DirActions = Partial<Record<ActionId, Record<CardinalDir, string>>>;

type JobArt = {
  actions: DirActions;
};

function eight(
  down: string,
  downRight: string,
  right: string,
  upRight: string,
  up: string,
  upLeft: string,
  left: string,
  downLeft: string,
): Record<CardinalDir, string> {
  return {down, downRight, right, upRight, up, upLeft, left, downLeft};
}

export const JOB_ART: Record<JobId, JobArt> = {
  warrior: {
    actions: {
      idle: eight(
        assetUrl(warriorIdleDown),
        assetUrl(warriorIdleDownRight),
        assetUrl(warriorIdleRight),
        assetUrl(warriorIdleUpRight),
        assetUrl(warriorIdleUp),
        assetUrl(warriorIdleUpLeft),
        assetUrl(warriorIdleLeft),
        assetUrl(warriorIdleDownLeft),
      ),
      walk: eight(
        assetUrl(warriorWalkDown),
        assetUrl(warriorWalkDownRight),
        assetUrl(warriorWalkRight),
        assetUrl(warriorWalkUpRight),
        assetUrl(warriorWalkUp),
        assetUrl(warriorWalkUpLeft),
        assetUrl(warriorWalkLeft),
        assetUrl(warriorWalkDownLeft),
      ),
      roll: eight(
        assetUrl(warriorRollDown),
        assetUrl(warriorRollDownRight),
        assetUrl(warriorRollRight),
        assetUrl(warriorRollUpRight),
        assetUrl(warriorRollUp),
        assetUrl(warriorRollUpLeft),
        assetUrl(warriorRollLeft),
        assetUrl(warriorRollDownLeft),
      ),
      attack: eight(
        assetUrl(warriorAttackDown),
        assetUrl(warriorAttackDownRight),
        assetUrl(warriorAttackRight),
        assetUrl(warriorAttackUpRight),
        assetUrl(warriorAttackUp),
        assetUrl(warriorAttackUpLeft),
        assetUrl(warriorAttackLeft),
        assetUrl(warriorAttackDownLeft),
      ),
    },
  },
  mage: {
    actions: {
      idle: eight(
        assetUrl(mageIdleDown),
        assetUrl(mageIdleDownRight),
        assetUrl(mageIdleRight),
        assetUrl(mageIdleUpRight),
        assetUrl(mageIdleUp),
        assetUrl(mageIdleUpLeft),
        assetUrl(mageIdleLeft),
        assetUrl(mageIdleDownLeft),
      ),
      walk: eight(
        assetUrl(mageWalkDown),
        assetUrl(mageWalkDownRight),
        assetUrl(mageWalkRight),
        assetUrl(mageWalkUpRight),
        assetUrl(mageWalkUp),
        assetUrl(mageWalkUpLeft),
        assetUrl(mageWalkLeft),
        assetUrl(mageWalkDownLeft),
      ),
      roll: eight(
        assetUrl(mageRollDown),
        assetUrl(mageRollDownRight),
        assetUrl(mageRollRight),
        assetUrl(mageRollUpRight),
        assetUrl(mageRollUp),
        assetUrl(mageRollUpLeft),
        assetUrl(mageRollLeft),
        assetUrl(mageRollDownLeft),
      ),
      attack: eight(
        assetUrl(mageAttackDown),
        assetUrl(mageAttackDownRight),
        assetUrl(mageAttackRight),
        assetUrl(mageAttackUpRight),
        assetUrl(mageAttackUp),
        assetUrl(mageAttackUpLeft),
        assetUrl(mageAttackLeft),
        assetUrl(mageAttackDownLeft),
      ),
    },
  },
};

export type LoadedImages = {
  actions: Partial<Record<ActionId, Record<CardinalDir, HTMLImageElement>>>;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

/**
 * atan2 facing → 8 dirs.
 * 0 = +X (right), π/2 = +Y (down)
 */
export function facingToCardinal(facing: number): CardinalDir {
  const tau = Math.PI * 2;
  let a = facing % tau;
  if (a < 0) a += tau;
  const sector = Math.floor((a + Math.PI / 8) / (Math.PI / 4)) % 8;
  const map: CardinalDir[] = [
    'right',
    'downRight',
    'down',
    'downLeft',
    'left',
    'upLeft',
    'up',
    'upRight',
  ];
  return map[sector];
}

export async function loadJobImages(job: JobId): Promise<LoadedImages> {
  const art = JOB_ART[job];
  const actions: Partial<Record<ActionId, Record<CardinalDir, HTMLImageElement>>> = {};

  const pixDir: Record<CardinalDir, string> = {
    down: 'south',
    downRight: 'south-east',
    right: 'east',
    upRight: 'north-east',
    up: 'north',
    upLeft: 'north-west',
    left: 'west',
    downLeft: 'south-west',
  };

  const loads: Promise<void>[] = [];
  for (const action of Object.keys(art.actions) as ActionId[]) {
    actions[action] = {} as Record<CardinalDir, HTMLImageElement>;
    for (const dir of CARDINAL_DIRS) {
      const bundled = art.actions[action]?.[dir];
      // Prefer copied jobs assets under /common/characters
      const commonSrc = `/common/characters/${job}/${action}/${pixDir[dir]}.png`;
      const src = commonSrc;
      loads.push(
        loadImage(src)
          .catch(() => (bundled ? loadImage(bundled) : Promise.reject()))
          .then((img) => {
            actions[action]![dir] = img;
          })
          .catch(() => {
            /* missing frame */
          }),
      );
    }
  }
  await Promise.all(loads);
  return {actions};
}
