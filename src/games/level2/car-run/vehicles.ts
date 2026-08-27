export type VehicleKind = 'static' | 'animated';

export type VehicleDef = {
  id: string;
  label: string;
  kind: VehicleKind;
  /** 포털·선택 UI에 표시하지 않음 */
  hidden?: boolean;
  /** static 차량 단일 이미지 */
  src?: string;
  /** animated 차량 프레임 (폴더 순서) — 현재 미사용 */
  frames?: string[];
};

const BASE = '/car-run/vehicles';

/** Unlucky Studio Topdown Vehicle Sprites Pack (스프라이트 기본 방향: 6시) */
export const CAR_RUN_VEHICLES: VehicleDef[] = [
  {id: 'audi', label: '아우디', kind: 'static', hidden: true, src: `${BASE}/Audi.png`},
  {id: 'viper', label: '바이퍼', kind: 'static', src: `${BASE}/Black_viper.png`},
  {id: 'taxi', label: '택시', kind: 'static', hidden: true, src: `${BASE}/taxi.png`},
  {id: 'car', label: '심플카', kind: 'static', hidden: true, src: `${BASE}/Car.png`},
  {id: 'mini-truck', label: '미니트럭', kind: 'static', hidden: true, src: `${BASE}/Mini_truck.png`},
  {id: 'mini-van', label: '미니밴', kind: 'static', hidden: true, src: `${BASE}/Mini_van.png`},
  {id: 'truck', label: '트럭', kind: 'static', src: `${BASE}/truck.png`},
  {id: 'police', label: '경찰차', kind: 'static', src: `${BASE}/Police.png`},
  {id: 'ambulance', label: '구급차', kind: 'static', src: `${BASE}/ambulance.png`},
];

export const CAR_RUN_PICKER_VEHICLES = CAR_RUN_VEHICLES.filter((v) => !v.hidden);

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
