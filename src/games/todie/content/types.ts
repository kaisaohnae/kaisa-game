export type JobId = 'warrior' | 'mage';
export type ActionId = 'idle' | 'walk' | 'roll';

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
  projectileSpeed?: number;
  projectileLife?: number;
  fxColor: string;
  fxRadius: number;
};

export type RuntimeSkill = SkillBalance & {
  id: string;
  cdLeft: number;
};
