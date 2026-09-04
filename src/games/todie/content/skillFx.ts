/** Single-sprite skill FX per job skill; size scales with weapon enhance. */

import skillFxJson from '../settings/skillFx.json';
import {facingToCardinal} from './jobAssets';
import type {CardinalDir, JobId} from './types';

export const skillFxSettings = skillFxJson;

const BASE_SIZE = Number(skillFxJson.baseSize) || 100;
const SIZE_STEP = Number(skillFxJson.sizeStep) || 0.1;
const ENHANCE_STEP = Math.max(1, Number(skillFxJson.enhanceStep) || 5);

/** 무기 +5마다 베이스 대비 +0.1 → size = 100 * (1 + 0.1 * floor(enh/5)) */
export function skillFxSizeForEnhance(weaponEnhance: number): number {
  const steps = Math.max(0, Math.floor(Math.max(0, weaponEnhance) / ENHANCE_STEP));
  return BASE_SIZE * (1 + SIZE_STEP * steps);
}

/** 크기 배율 (히트박스·사거리 등에 선택 적용) */
export function skillFxSizeMult(weaponEnhance: number): number {
  return skillFxSizeForEnhance(weaponEnhance) / BASE_SIZE;
}

export type SkillFxBehavior = {
  face?: boolean;
  scatterCount?: number;
  scatterRadius?: number;
  randomAlpha?: boolean;
  randomSize?: boolean;
  alphaMin?: number;
  alphaMax?: number;
  sizeMin?: number;
  sizeMax?: number;
  sizeMult?: number;
  flyDistance?: number;
  flyLife?: number;
  alpha?: number;
  /** 비행 중 커졌다 작아짐 */
  sizePulse?: boolean;
  /** 중심에서 점점 커지며 퍼짐 */
  sizeExpand?: boolean;
  /** 스캐터 폭발 사이 간격(초) */
  staggerDelay?: number;
  /** 스캐터 각 폭발 지속시간 */
  fxLife?: number;
};

export function skillFxBehavior(skillId: string): SkillFxBehavior {
  const map = (skillFxJson as {behaviors?: Record<string, SkillFxBehavior>}).behaviors;
  return map?.[skillId] ?? {face: true};
}

/** 8방향 스프라이트와 같은 스냅 각도 (atan2, 0=+X, π/2=+Y) */
const CARDINAL_ANGLE: Record<CardinalDir, number> = {
  right: 0,
  downRight: Math.PI / 4,
  down: Math.PI / 2,
  downLeft: (3 * Math.PI) / 4,
  left: Math.PI,
  upLeft: (-3 * Math.PI) / 4,
  up: -Math.PI / 2,
  upRight: -Math.PI / 4,
};

export function facingSnapAngle(facing: number): number {
  return CARDINAL_ANGLE[facingToCardinal(facing)];
}

/** 에셋 전방 각도. null = 방사형(회전 없음) */
export function skillFxArtForward(skillId: string): number | null {
  const map = skillFxJson.artForwardRad as Record<string, unknown> | undefined;
  if (!map) return -Math.PI / 2;
  if (Object.prototype.hasOwnProperty.call(map, skillId)) {
    const v = map[skillId];
    if (typeof v === 'number') return v;
    if (v === null) return null;
  }
  const fallback = map.default;
  return typeof fallback === 'number' ? fallback : -Math.PI / 2;
}

/**
 * 캔버스 rotate 값: 스냅된 전방 − 에셋 전방.
 * null이면 회전하지 않음.
 */
export function skillFxSpriteRotation(facing: number, skillId: string): number | null {
  const behavior = skillFxBehavior(skillId);
  if (behavior.face === false) return null;
  const art = skillFxArtForward(skillId);
  if (art == null) return null;
  return facingSnapAngle(facing) - art;
}

export function skillFxPublicBase(): string {
  return skillFxJson.publicBase ?? '/common/skills';
}

export function skillFxAssetUrl(job: JobId, skillId: string): string {
  return `${skillFxPublicBase()}/${job}/${skillId}.png`;
}

export type SkillFxImages = Record<string, HTMLImageElement>;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`fail ${src}`));
    img.src = src;
  });
}

/** key = `${job}:${skill}` */
export async function loadSkillFxImages(): Promise<SkillFxImages> {
  const out: SkillFxImages = {};
  const jobs = skillFxJson.jobs as Record<string, {skills: string[]}>;
  const tasks: Promise<void>[] = [];
  for (const job of Object.keys(jobs) as JobId[]) {
    for (const skill of jobs[job]?.skills ?? []) {
      const key = `${job}:${skill}`;
      const url = skillFxAssetUrl(job, skill);
      tasks.push(
        loadImage(url)
          .then((img) => {
            out[key] = img;
          })
          .catch(() => {
            /* optional */
          }),
      );
    }
  }
  await Promise.all(tasks);
  return out;
}

export function pickSkillFxImage(
  images: SkillFxImages | null | undefined,
  job: JobId,
  skillId: string,
): HTMLImageElement | null {
  if (!images) return null;
  const img = images[`${job}:${skillId}`];
  if (img?.complete && img.naturalWidth > 0) return img;
  return null;
}
