export type PlaneKind = 'static';

export type PlaneDef = {
  id: string;
  label: string;
  kind: PlaneKind;
  /** 포털·선택 UI에 표시하지 않음 (적기 전용) */
  hidden?: boolean;
  /** 적으로 스폰 가능 */
  asEnemy?: boolean;
  src: string;
};

const BASE = '/plane-shoot/planes';

/**
 * 스프라이트 기본 방향: 12시 (코가 위).
 * 플레이어: 그대로 12시 · 적기: 180° → 6시.
 */
export const PLANE_SHOOT_PLANES: PlaneDef[] = [
  {id: 'jet-blue', label: '블루제트', kind: 'static', src: `${BASE}/jet-blue.png`},
  {id: 'jet-red', label: '레드에이스', kind: 'static', src: `${BASE}/jet-red.png`},
  {id: 'jet-green', label: '그린윙', kind: 'static', src: `${BASE}/jet-green.png`},
  {id: 'scout', label: '스카웃', kind: 'static', hidden: true, asEnemy: true, src: `${BASE}/scout.png`},
  {id: 'drone', label: '드론', kind: 'static', hidden: true, asEnemy: true, src: `${BASE}/drone.png`},
  {id: 'raider', label: '레이더', kind: 'static', hidden: true, asEnemy: true, src: `${BASE}/raider.png`},
  {id: 'bomber', label: '밤버', kind: 'static', hidden: true, asEnemy: true, src: `${BASE}/bomber.png`},
  {id: 'stealth', label: '스텔스', kind: 'static', hidden: true, asEnemy: true, src: `${BASE}/stealth.png`},
  {id: 'biplane', label: '복엽기', kind: 'static', hidden: true, asEnemy: true, src: `${BASE}/biplane.png`},
  {id: 'yellow-jet', label: '옐로제트', kind: 'static', hidden: true, asEnemy: true, src: `${BASE}/yellow-jet.png`},
  {id: 'cargo', label: '카고', kind: 'static', hidden: true, asEnemy: true, src: `${BASE}/cargo.png`},
  {id: 'dark-ace', label: '다크에이스', kind: 'static', hidden: true, asEnemy: true, src: `${BASE}/dark-ace.png`},
  {id: 'titan', label: '타이탄', kind: 'static', hidden: true, asEnemy: true, src: `${BASE}/titan.png`},
];

export const PLANE_SHOOT_PICKER = PLANE_SHOOT_PLANES.filter((p) => !p.hidden);

export const PLANE_SHOOT_ENEMIES = PLANE_SHOOT_PLANES.filter((p) => p.asEnemy);

export const DEFAULT_PLANE_ID = 'jet-blue';

export function getPlaneDef(id: string) {
  return PLANE_SHOOT_PLANES.find((p) => p.id === id) ?? PLANE_SHOOT_PICKER[0]!;
}

export function isPickerPlaneId(id: string) {
  return PLANE_SHOOT_PICKER.some((p) => p.id === id);
}

export function pickEnemyPlaneId(loadedIds?: Iterable<string>): string {
  const loaded = loadedIds ? new Set(loadedIds) : null;
  let pool = PLANE_SHOOT_ENEMIES;
  if (loaded) pool = pool.filter((p) => loaded.has(p.id));
  if (!pool.length) pool = PLANE_SHOOT_ENEMIES;
  const weighted: string[] = [];
  for (const p of pool) {
    const w = p.id === 'titan' || p.id === 'dark-ace' ? 2 : 1;
    for (let i = 0; i < w; i += 1) weighted.push(p.id);
  }
  return weighted[Math.floor(Math.random() * weighted.length)] ?? pool[0]!.id;
}
