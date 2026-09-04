import display from '../settings/display.json';
import balance from '../settings/balance.json';
import jobs from '../settings/jobs.json';
import settings from '../settings/settings.json';
import type {JobId, RuntimeSkill, SkillBalance} from './types';

export const displaySettings = display;
export const balanceSettings = balance;
export const jobsSettings = jobs;
export const gameSettings = settings;

export function jobLabel(job: JobId): string {
  return balance.player.jobs[job]?.label ?? jobs.jobs[job]?.label ?? job;
}

export function jobSpeed(job: JobId): number {
  return balance.player.jobs[job]?.speed ?? 440;
}

export function skillsFromBalance(job: JobId): RuntimeSkill[] {
  const list = jobs.jobs[job]?.skills ?? [];
  const table = balance.skills[job] as Record<string, SkillBalance>;
  return list.map((id) => {
    const s = table[id];
    return {
      id,
      name: s.name,
      desc: s.desc,
      mp: s.mp,
      cd: s.cd,
      cdLeft: 0,
      damage: s.damage,
      radius: s.radius,
      offset: s.offset,
      dashSpeed: s.dashSpeed,
      invuln: s.invuln,
      shieldHp: s.shieldHp,
      projectileSpeed: s.projectileSpeed,
      projectileLife: s.projectileLife,
      projectileCount: s.projectileCount,
      projectileSpacing: s.projectileSpacing,
      projectileHitRadius: s.projectileHitRadius,
      projectileSpread: s.projectileSpread,
      fxColor: s.fxColor,
      fxRadius: s.fxRadius,
    };
  });
}
