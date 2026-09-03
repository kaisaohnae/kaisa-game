/**
 * 자동차 달리기 — 3스테이지 난이도
 *
 * 1단계(연습): 천천히, 성긴 스폰, 거의 직진만, 하트 넉넉
 * 2단계(긴장): 속도·밀도 상승, 좌우 움직임 본격화
 * 3단계(질주): 최고속·이중스폰·지그재그 빈번, 하트 희귀
 *
 * 스테이지 경계에서 blend로 부드럽게 섞임 (급변 없음).
 */

export type CarStageId = 1 | 2 | 3;

export type CarStageParams = {
  id: CarStageId;
  label: string;
  /** 미터 기준 시작 */
  fromMeters: number;
  speedMin: number;
  speedMax: number;
  spawnGapMinMs: number;
  spawnGapMaxMs: number;
  doubleSpawnChance: number;
  movingChance: number;
  heartChance: number;
  zigVxMin: number;
  zigVxMax: number;
  /** 대형/특수 장애물 가중 (excavator·tank 등) */
  heavyBias: number;
};

export const CAR_STAGES: CarStageParams[] = [
  {
    id: 1,
    label: '연습 도로',
    fromMeters: 0,
    speedMin: 100,
    speedMax: 155,
    spawnGapMinMs: 780,
    spawnGapMaxMs: 1180,
    doubleSpawnChance: 0.12,
    movingChance: 0.06,
    heartChance: 0.12,
    zigVxMin: 40,
    zigVxMax: 70,
    heavyBias: 0.6,
  },
  {
    id: 2,
    label: '혼잡 구간',
    fromMeters: 180,
    speedMin: 155,
    speedMax: 240,
    spawnGapMinMs: 560,
    spawnGapMaxMs: 860,
    doubleSpawnChance: 0.28,
    movingChance: 0.2,
    heartChance: 0.08,
    zigVxMin: 55,
    zigVxMax: 100,
    heavyBias: 1.2,
  },
  {
    id: 3,
    label: '질주 구간',
    fromMeters: 420,
    speedMin: 240,
    speedMax: 340,
    spawnGapMinMs: 420,
    spawnGapMaxMs: 620,
    doubleSpawnChance: 0.42,
    movingChance: 0.34,
    heartChance: 0.05,
    zigVxMin: 75,
    zigVxMax: 130,
    heavyBias: 2.2,
  },
];

/** 경계 전후 이 거리(m)만큼 다음 스테이지와 보간 */
const BLEND_METERS = 55;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function stageAt(meters: number): {index: number; localT: number} {
  let index = 0;
  for (let i = CAR_STAGES.length - 1; i >= 0; i -= 1) {
    if (meters >= CAR_STAGES[i]!.fromMeters) {
      index = i;
      break;
    }
  }
  const cur = CAR_STAGES[index]!;
  const next = CAR_STAGES[index + 1];
  if (!next) {
    // 최종 스테이지: from 이후 천천히 상한으로
    const span = 280;
    return {index, localT: clamp01((meters - cur.fromMeters) / span)};
  }
  const span = Math.max(1, next.fromMeters - cur.fromMeters);
  return {index, localT: clamp01((meters - cur.fromMeters) / span)};
}

export type CarDifficulty = CarStageParams & {
  /** 현재 스테이지 내 진행 0~1 (다음 경계까지) */
  localT: number;
  /** 다음 스테이지로 섞이는 정도 0~1 */
  blend: number;
  speed: number;
  spawnGapMs: number;
};

export function resolveCarDifficulty(meters: number): CarDifficulty {
  const {index, localT} = stageAt(meters);
  const cur = CAR_STAGES[index]!;
  const next = CAR_STAGES[index + 1] ?? null;

  let blend = 0;
  if (next) {
    const distToNext = next.fromMeters - meters;
    if (distToNext < BLEND_METERS) {
      blend = clamp01(1 - distToNext / BLEND_METERS);
    }
  }

  const mix = (key: keyof Omit<CarStageParams, 'id' | 'label' | 'fromMeters'>) => {
    const a = cur[key] as number;
    const b = next ? (next[key] as number) : a;
    return lerp(a, b, blend);
  };

  const speedFloor = lerp(cur.speedMin, next?.speedMin ?? cur.speedMin, blend);
  const speedCeil = lerp(cur.speedMax, next?.speedMax ?? cur.speedMax, blend);
  // 스테이지 안에서도 서서히 올라감 + 경계 블렌드
  const speed = lerp(speedFloor, speedCeil, localT * 0.85 + blend * 0.15);

  const gapMax = mix('spawnGapMaxMs');
  const gapMin = mix('spawnGapMinMs');
  const spawnGapMs = lerp(gapMax, gapMin, localT * 0.7 + blend * 0.3);

  return {
    id: cur.id,
    label: blend > 0.55 && next ? next.label : cur.label,
    fromMeters: cur.fromMeters,
    speedMin: speedFloor,
    speedMax: speedCeil,
    spawnGapMinMs: gapMin,
    spawnGapMaxMs: gapMax,
    doubleSpawnChance: mix('doubleSpawnChance'),
    movingChance: mix('movingChance'),
    heartChance: mix('heartChance'),
    zigVxMin: mix('zigVxMin'),
    zigVxMax: mix('zigVxMax'),
    heavyBias: mix('heavyBias'),
    localT,
    blend,
    speed,
    spawnGapMs,
  };
}

export function carStageIdFromMeters(meters: number): CarStageId {
  return resolveCarDifficulty(meters).id;
}
