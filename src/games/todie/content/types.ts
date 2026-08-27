export type JobId = 'warrior' | 'mage';
export type ActionId = 'idle' | 'walk' | 'roll' | 'attack';
/** 8-direction facing (desktop rotation packs) */
export type CardinalDir =
  | 'down'
  | 'downRight'
  | 'right'
  | 'upRight'
  | 'up'
  | 'upLeft'
  | 'left'
  | 'downLeft';

export type SkillBalance = {
  name: string;
  desc: string;
  mp: number;
  cd: number;
  damage: number;
  radius?: number;
  offset?: number;
  dashSpeed?: number;
  invuln?: number;
  /** Shield skill: absorb this much damage before breaking */
  shieldHp?: number;
  projectileSpeed?: number;
  projectileLife?: number;
  /** Bolt: number of projectiles fired forward */
  projectileCount?: number;
  /** Bolt: lateral spacing between parallel shots (world px) */
  projectileSpacing?: number;
  /** Bolt: collision radius vs mobs */
  projectileHitRadius?: number;
  /** @deprecated use projectileSpacing — kept for compat */
  projectileSpread?: number;
  fxColor: string;
  fxRadius: number;
};

export type RuntimeSkill = SkillBalance & {
  id: string;
  cdLeft: number;
};
