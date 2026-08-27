/** Decorative / blocking map props placed on the Todie world grid */

export type MapObjectKind =
  | 'tree_oak'
  | 'tree_pine'
  | 'bush'
  | 'rock'
  | 'stump'
  | 'flowers'
  | 'crate'
  | 'barrel';

export type MapObjectDef = {
  id: MapObjectKind;
  label: string;
  /** Draw size in world px */
  size: number;
  /** Blocks player movement when close */
  blocking: boolean;
  /** Soft fill when sprite missing */
  fill: string;
};

export const MAP_OBJECT_DEFS: MapObjectDef[] = [
  {id: 'tree_oak', label: '참나무', size: 88, blocking: true, fill: '#3d6b2f'},
  {id: 'tree_pine', label: '소나무', size: 92, blocking: true, fill: '#2e5a28'},
  {id: 'bush', label: '덤불', size: 52, blocking: false, fill: '#4caf50'},
  {id: 'rock', label: '바위', size: 56, blocking: true, fill: '#78909c'},
  {id: 'stump', label: '그루터기', size: 44, blocking: true, fill: '#6d4c41'},
  {id: 'flowers', label: '꽃밭', size: 40, blocking: false, fill: '#ec407a'},
  {id: 'crate', label: '상자', size: 48, blocking: true, fill: '#8d6e63'},
  {id: 'barrel', label: '통', size: 46, blocking: true, fill: '#bf360c'},
];

export const MAP_OBJECT_IDS = MAP_OBJECT_DEFS.map((d) => d.id);

export type MapObjectPlacement = {
  id: number;
  kind: MapObjectKind;
  /** Tile column */
  tx: number;
  /** Tile row */
  ty: number;
};

export function mapObjectDef(kind: MapObjectKind): MapObjectDef {
  return MAP_OBJECT_DEFS.find((d) => d.id === kind) ?? MAP_OBJECT_DEFS[0]!;
}

export function mapObjectUrl(kind: MapObjectKind): string {
  return `/todie/objects/${kind}.png`;
}

export function parseMapObjects(raw: unknown): MapObjectPlacement[] {
  if (!Array.isArray(raw)) return [];
  const out: MapObjectPlacement[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Partial<MapObjectPlacement>;
    if (!MAP_OBJECT_IDS.includes(r.kind as MapObjectKind)) continue;
    const tx = Number(r.tx);
    const ty = Number(r.ty);
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) continue;
    out.push({
      id: Number(r.id) || out.length + 1,
      kind: r.kind as MapObjectKind,
      tx: Math.floor(tx),
      ty: Math.floor(ty),
    });
  }
  return out;
}
