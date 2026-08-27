export type VehicleKind = 'static' | 'animated';

export type VehicleDef = {
  id: string;
  label: string;
  kind: VehicleKind;
  /** 포털·선택 UI에 표시하지 않음 (장애물 전용 등) */
  hidden?: boolean;
  /** 장애물로도 스폰 가능 */
  asObstacle?: boolean;
  /** static 차량 단일 이미지 */
  src?: string;
  /** animated 차량 프레임 (폴더 순서) — 현재 미사용 */
  frames?: string[];
};

const BASE = '/car-run/vehicles';

/**
 * 스프라이트 기본 방향: 6시 (코가 아래).
 * 플레이어 그리기: 180° → 12시 · 장애물: 그대로 6시.
 */
export const CAR_RUN_VEHICLES: VehicleDef[] = [
  {id: 'audi', label: '아우디', kind: 'static', hidden: true, asObstacle: true, src: `${BASE}/Audi.png`},
  {id: 'viper', label: '바이퍼', kind: 'static', asObstacle: true, src: `${BASE}/Black_viper.png`},
  {id: 'taxi', label: '택시', kind: 'static', hidden: true, asObstacle: true, src: `${BASE}/taxi.png`},
  {id: 'car', label: '심플카', kind: 'static', hidden: true, asObstacle: true, src: `${BASE}/Car.png`},
  {id: 'mini-truck', label: '미니트럭', kind: 'static', hidden: true, asObstacle: true, src: `${BASE}/Mini_truck.png`},
  {id: 'mini-van', label: '미니밴', kind: 'static', hidden: true, asObstacle: true, src: `${BASE}/Mini_van.png`},
  {id: 'truck', label: '트럭', kind: 'static', asObstacle: true, src: `${BASE}/truck.png`},
  {id: 'police', label: '경찰차', kind: 'static', asObstacle: true, src: `${BASE}/Police.png`},
  {id: 'ambulance', label: '구급차', kind: 'static', asObstacle: true, src: `${BASE}/ambulance.png`},
  {
    id: 'excavator',
    label: '포크레인',
    kind: 'static',
    hidden: true,
    asObstacle: true,
    src: `${BASE}/excavator.png`,
  },
  {
    id: 'tank',
    label: '탱크',
    kind: 'static',
    hidden: true,
    asObstacle: true,
    src: `${BASE}/tank.png`,
  },
];

export const CAR_RUN_PICKER_VEHICLES = CAR_RUN_VEHICLES.filter((v) => !v.hidden);

/** 온커밍(장애물)로 쓸 수 있는 차량 */
export const CAR_RUN_OBSTACLE_VEHICLES = CAR_RUN_VEHICLES.filter((v) => v.asObstacle);

export const DEFAULT_VEHICLE_ID = 'viper';

export function getVehicleDef(id: string) {
  const found = CAR_RUN_VEHICLES.find((v) => v.id === id);
  if (found) return found;
  return CAR_RUN_PICKER_VEHICLES[0] ?? CAR_RUN_VEHICLES[0]!;
}

export function isPickerVehicleId(id: string) {
  return CAR_RUN_PICKER_VEHICLES.some((v) => v.id === id);
}

export function vehicleImageUrls(def: VehicleDef) {
  return def.kind === 'animated' ? def.frames ?? [] : def.src ? [def.src] : [];
}

/** 로드된 차량만 풀에 넣고, 포크레인·탱크 가중치↑ */
export function pickObstacleVehicleId(
  excludeId: string,
  loadedIds?: Iterable<string>,
): string {
  const loaded = loadedIds ? new Set(loadedIds) : null;
  let pool = CAR_RUN_OBSTACLE_VEHICLES.filter((v) => v.id !== excludeId);
  if (loaded) pool = pool.filter((v) => loaded.has(v.id));
  if (!pool.length) {
    pool = CAR_RUN_OBSTACLE_VEHICLES.filter((v) => !loaded || loaded.has(v.id));
  }
  if (!pool.length) return 'truck';
  const weighted: string[] = [];
  for (const v of pool) {
    const w = v.id === 'excavator' || v.id === 'tank' ? 3 : 1;
    for (let i = 0; i < w; i += 1) weighted.push(v.id);
  }
  return weighted[Math.floor(Math.random() * weighted.length)] ?? pool[0]!.id;
}
