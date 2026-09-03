/**
 * 비행기 슈팅 — 3스테이지 난이도
 *
 * 1단계(초보 비행): 느리게, 적 적음, 거의 안 쏨, 약한 기체 위주
 * 2단계(교전): 밀도·사격 증가, 아이템 드롭 의미 있음
 * 3단계(공중전): 이중스폰·공격적 사격·엘리트 비중↑
 *
 * 점수 경계에서 blend로 부드럽게 전환.
 */

export type PlaneStageId = 1 | 2 | 3;

export type PlaneStageParams = {
  id: PlaneStageId;
  label: string;
  /** 점수 기준 시작 */
  fromScore: number;
  speedMin: number;
  speedMax: number;
  spawnGapMinMs: number;
  spawnGapMaxMs: number;
  doubleSpawnChance: number;
  /** 드물게 3연속 스폰 (스테이지가 오를수록 확률↑) */
  tripleSpawnChance: number;
  /** 사격 간격 배율 (낮을수록 자주) */
  shootIntervalMul: number;
  /** 사격 시작 최소 Y 비율 (낮을수록 빨리 쏨) */
  shootYMaxRatio: number;
  itemDropChance: number;
  zigVxMin: number;
  zigVxMax: number;
  enemySpeedMulMin: number;
  enemySpeedMulMax: number;
  /** scout/drone 등 약한 적 가중 */
  lightBias: number;
  /** dark-ace/titan/stealth 가중 */
  eliteBias: number;
};

export const PLANE_STAGES: PlaneStageParams[] = [
  {
    id: 1,
    label: '초보 비행',
    fromScore: 0,
    speedMin: 85,
    speedMax: 130,
    spawnGapMinMs: 700,
    spawnGapMaxMs: 1050,
    doubleSpawnChance: 0.16,
    tripleSpawnChance: 0,
    shootIntervalMul: 1.55,
    shootYMaxRatio: 0.55,
    itemDropChance: 0.28,
    zigVxMin: 50,
    zigVxMax: 85,
    enemySpeedMulMin: 0.75,
    enemySpeedMulMax: 1.0,
    lightBias: 2.4,
    eliteBias: 0.35,
  },
  {
    id: 2,
    label: '교전 공역',
    fromScore: 12,
    speedMin: 130,
    speedMax: 195,
    spawnGapMinMs: 480,
    spawnGapMaxMs: 760,
    doubleSpawnChance: 0.34,
    tripleSpawnChance: 0.06,
    shootIntervalMul: 1.0,
    shootYMaxRatio: 0.68,
    itemDropChance: 0.22,
    zigVxMin: 70,
    zigVxMax: 120,
    enemySpeedMulMin: 0.85,
    enemySpeedMulMax: 1.2,
    lightBias: 1.2,
    eliteBias: 1.1,
  },
  {
    id: 3,
    label: '공중전',
    fromScore: 35,
    speedMin: 195,
    speedMax: 275,
    spawnGapMinMs: 350,
    spawnGapMaxMs: 540,
    doubleSpawnChance: 0.5,
    tripleSpawnChance: 0.16,
    shootIntervalMul: 0.72,
    shootYMaxRatio: 0.78,
    itemDropChance: 0.18,
    zigVxMin: 90,
    zigVxMax: 150,
    enemySpeedMulMin: 0.95,
    enemySpeedMulMax: 1.35,
    lightBias: 0.7,
    eliteBias: 2.4,
  },
];

const BLEND_SCORE = 5;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function stageAt(score: number): {index: number; localT: number} {
  let index = 0;
  for (let i = PLANE_STAGES.length - 1; i >= 0; i -= 1) {
    if (score >= PLANE_STAGES[i]!.fromScore) {
      index = i;
      break;
    }
  }
  const cur = PLANE_STAGES[index]!;
  const next = PLANE_STAGES[index + 1];
  if (!next) {
    return {index, localT: clamp01((score - cur.fromScore) / 40)};
  }
  const span = Math.max(1, next.fromScore - cur.fromScore);
  return {index, localT: clamp01((score - cur.fromScore) / span)};
}

export type PlaneDifficulty = PlaneStageParams & {
  localT: number;
  blend: number;
  speed: number;
  spawnGapMs: number;
};

export function resolvePlaneDifficulty(score: number): PlaneDifficulty {
  const {index, localT} = stageAt(score);
  const cur = PLANE_STAGES[index]!;
  const next = PLANE_STAGES[index + 1] ?? null;

  let blend = 0;
  if (next) {
    const distToNext = next.fromScore - score;
    if (distToNext < BLEND_SCORE) {
      blend = clamp01(1 - distToNext / BLEND_SCORE);
    }
  }

  const mix = (key: keyof Omit<PlaneStageParams, 'id' | 'label' | 'fromScore'>) => {
    const a = cur[key] as number;
    const b = next ? (next[key] as number) : a;
    return lerp(a, b, blend);
  };

  const speedFloor = lerp(cur.speedMin, next?.speedMin ?? cur.speedMin, blend);
  const speedCeil = lerp(cur.speedMax, next?.speedMax ?? cur.speedMax, blend);
  const speed = lerp(speedFloor, speedCeil, localT * 0.85 + blend * 0.15);

  const gapMax = mix('spawnGapMaxMs');
  const gapMin = mix('spawnGapMinMs');
  const spawnGapMs = lerp(gapMax, gapMin, localT * 0.7 + blend * 0.3);

  return {
    id: cur.id,
    label: blend > 0.55 && next ? next.label : cur.label,
    fromScore: cur.fromScore,
    speedMin: speedFloor,
    speedMax: speedCeil,
    spawnGapMinMs: gapMin,
    spawnGapMaxMs: gapMax,
    doubleSpawnChance: mix('doubleSpawnChance'),
    tripleSpawnChance: mix('tripleSpawnChance'),
    shootIntervalMul: mix('shootIntervalMul'),
    shootYMaxRatio: mix('shootYMaxRatio'),
    itemDropChance: mix('itemDropChance'),
    zigVxMin: mix('zigVxMin'),
    zigVxMax: mix('zigVxMax'),
    enemySpeedMulMin: mix('enemySpeedMulMin'),
    enemySpeedMulMax: mix('enemySpeedMulMax'),
    lightBias: mix('lightBias'),
    eliteBias: mix('eliteBias'),
    localT,
    blend,
    speed,
    spawnGapMs,
  };
}

export function planeStageIdFromScore(score: number): PlaneStageId {
  return resolvePlaneDifficulty(score).id;
}

const LIGHT_IDS = new Set(['scout', 'drone', 'biplane', 'yellow-jet']);
const ELITE_IDS = new Set(['dark-ace', 'titan', 'stealth', 'raider']);

/** 스테이지 가중으로 적기 id 선택 */
export function pickEnemyForStage(
  pool: string[],
  lightBias: number,
  eliteBias: number,
): string {
  if (!pool.length) return 'scout';
  const weighted: string[] = [];
  for (const id of pool) {
    let w = 1;
    if (LIGHT_IDS.has(id)) w *= lightBias;
    if (ELITE_IDS.has(id)) w *= eliteBias;
    if (id === 'titan') w *= 1.15;
    const n = Math.max(1, Math.round(w * 10));
    for (let i = 0; i < n; i += 1) weighted.push(id);
  }
  return weighted[Math.floor(Math.random() * weighted.length)] ?? pool[0]!;
}
