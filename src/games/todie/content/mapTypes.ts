/** Todie world map — 10000×10000, tile grid saved as JSON */

import {
  parseMapObjects,
  type MapObjectPlacement,
} from './mapObjects';
import {isLibraryTileId, parseLibraryTileId} from './pixellabLibrary';

export type {MapObjectKind, MapObjectPlacement} from './mapObjects';
export {
  MAP_OBJECT_DEFS,
  MAP_OBJECT_IDS,
  mapObjectDef,
  mapObjectUrl,
  mapObjectImageKey,
  isBuiltinMapObject,
  isPlaceableMapObjectKind,
} from './mapObjects';

/** Library tile ref `tile-N/wang_K` (or legacy leftover strings) */
export type TileId = string;

export type TileDef = {
  id: TileId;
  label: string;
  /** Seamless base color (map seams) */
  fill: string;
};

/** Default fill after removing builtin biome tiles */
export const DEFAULT_MAP_TILE: TileId = 'tile-1/wang_0';

/** @deprecated empty — use PixelLab library tiles */
export const TILE_DEFS: TileDef[] = [];

export const TILE_IDS: string[] = [];

export const TILE_INDEX: Record<string, number> = {};

export function isBuiltinTileId(_id: string): boolean {
  return false;
}

export function isValidMapTileId(id: string): boolean {
  return isLibraryTileId(id);
}

export const MAP_WORLD_SIZE = 10_000;
export const MAP_TILE_SIZE = 100;
export const MAP_COLS = MAP_WORLD_SIZE / MAP_TILE_SIZE; // 100
export const MAP_ROWS = MAP_WORLD_SIZE / MAP_TILE_SIZE; // 100
export const MAP_URL = '/todie/map/stage1.json';

/**
 * 스테이지별 맵 파일 경로. `/studio/map/`에서 'stage2'·'stage3' 이름으로 맵을
 * 만들어 저장하면 자동으로 사용된다 — 없으면 기본 맵(stage1.json)으로 폴백.
 */
export function mapUrlForStage(stage: number): string {
  const n = Math.max(1, Math.floor(stage));
  return `/todie/map/stage${n}.json`;
}

export type TodieMapJson = {
  version: 1;
  name: string;
  worldSize: number;
  tileSize: number;
  cols: number;
  rows: number;
  palette: TileId[];
  /** Row-major palette indices, length = cols * rows */
  cells: number[];
  /** Optional props (trees, rocks, …) */
  objects: MapObjectPlacement[];
  /** Next object id */
  nextObjectId: number;
};

export function tileDef(id: TileId): TileDef {
  const lib = parseLibraryTileId(id);
  if (lib) {
    return {id, label: `${lib.name} ${lib.wang}`, fill: '#5a6a5a'};
  }
  return {id, label: String(id), fill: '#5a6a5a'};
}

export function emptyMap(fill: TileId = DEFAULT_MAP_TILE): TodieMapJson {
  return {
    version: 1,
    name: 'stage1',
    worldSize: MAP_WORLD_SIZE,
    tileSize: MAP_TILE_SIZE,
    cols: MAP_COLS,
    rows: MAP_ROWS,
    palette: [fill],
    cells: Array.from({length: MAP_COLS * MAP_ROWS}, () => 0),
    objects: [],
    nextObjectId: 1,
  };
}

/** Flat library-tile map (no procedural biomes / builtin props) */
export function generateDefaultMap(): TodieMapJson {
  return emptyMap(DEFAULT_MAP_TILE);
}

export function placeMapObject(
  map: TodieMapJson,
  tx: number,
  ty: number,
  kind: MapObjectPlacement['kind'],
  frame?: string,
) {
  if (tx < 0 || ty < 0 || tx >= map.cols || ty >= map.rows) return;
  map.objects = map.objects.filter((o) => !(o.tx === tx && o.ty === ty));
  map.objects.push({
    id: map.nextObjectId++,
    kind,
    ...(frame ? {frame} : {}),
    tx,
    ty,
  });
}

export function eraseMapObject(map: TodieMapJson, tx: number, ty: number) {
  map.objects = map.objects.filter((o) => !(o.tx === tx && o.ty === ty));
}

export function objectAt(map: TodieMapJson, tx: number, ty: number) {
  return map.objects.find((o) => o.tx === tx && o.ty === ty) ?? null;
}

export function cellIndex(map: TodieMapJson, tx: number, ty: number) {
  return ty * map.cols + tx;
}

export function getTileId(map: TodieMapJson, tx: number, ty: number): TileId {
  if (tx < 0 || ty < 0 || tx >= map.cols || ty >= map.rows) return DEFAULT_MAP_TILE;
  const i = map.cells[cellIndex(map, tx, ty)] ?? 0;
  return map.palette[i] ?? map.palette[0] ?? DEFAULT_MAP_TILE;
}

export function setTileId(map: TodieMapJson, tx: number, ty: number, id: TileId) {
  if (tx < 0 || ty < 0 || tx >= map.cols || ty >= map.rows) return;
  let pi = map.palette.indexOf(id);
  if (pi < 0) {
    map.palette.push(id);
    pi = map.palette.length - 1;
  }
  map.cells[cellIndex(map, tx, ty)] = pi;
}

export function paintBrush(
  map: TodieMapJson,
  cx: number,
  cy: number,
  id: TileId,
  radius: number,
) {
  const r = Math.max(0, Math.floor(radius));
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      if (dx * dx + dy * dy > r * r + 0.1) continue;
      setTileId(map, cx + dx, cy + dy, id);
    }
  }
}

/** Flood fill same-tile region */
export function floodFill(map: TodieMapJson, sx: number, sy: number, id: TileId) {
  const target = getTileId(map, sx, sy);
  if (target === id) return;
  const stack: Array<[number, number]> = [[sx, sy]];
  const seen = new Set<number>();
  while (stack.length) {
    const [x, y] = stack.pop()!;
    const key = y * map.cols + x;
    if (seen.has(key)) continue;
    seen.add(key);
    if (getTileId(map, x, y) !== target) continue;
    setTileId(map, x, y, id);
    if (x > 0) stack.push([x - 1, y]);
    if (x + 1 < map.cols) stack.push([x + 1, y]);
    if (y > 0) stack.push([x, y - 1]);
    if (y + 1 < map.rows) stack.push([x, y + 1]);
  }
}

export function parseMapJson(data: unknown): TodieMapJson {
  const raw = data as Partial<TodieMapJson>;
  if (!raw || raw.version !== 1 || !Array.isArray(raw.cells) || !Array.isArray(raw.palette)) {
    throw new Error('invalid map json');
  }
  const cols = Number(raw.cols) || MAP_COLS;
  const rows = Number(raw.rows) || MAP_ROWS;
  const need = cols * rows;
  const cells = raw.cells.slice(0, need);
  while (cells.length < need) cells.push(0);
  const objects = parseMapObjects((raw as {objects?: unknown}).objects);
  const nextObjectId = Math.max(
    Number((raw as {nextObjectId?: number}).nextObjectId) || 1,
    ...objects.map((o) => o.id + 1),
    1,
  );
  let palette = raw.palette.filter((p): p is TileId => typeof p === 'string' && isValidMapTileId(p));
  if (!palette.length) palette = [DEFAULT_MAP_TILE];
  // Remap cells if old palette entries were stripped
  const remapped = cells.map((ci) => {
    const id = raw.palette[ci];
    if (typeof id === 'string' && isValidMapTileId(id)) {
      const pi = palette.indexOf(id);
      return pi >= 0 ? pi : 0;
    }
    return 0;
  });
  return {
    version: 1,
    name: typeof raw.name === 'string' ? raw.name : 'stage1',
    worldSize: Number(raw.worldSize) || MAP_WORLD_SIZE,
    tileSize: Number(raw.tileSize) || MAP_TILE_SIZE,
    cols,
    rows,
    palette,
    cells: remapped,
    objects,
    nextObjectId,
  };
}
