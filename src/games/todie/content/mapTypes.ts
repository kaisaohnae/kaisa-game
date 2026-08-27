/** Todie world map — 10000×10000, tile grid saved as JSON */

import {
  parseMapObjects,
  type MapObjectPlacement,
} from './mapObjects';

export type {MapObjectKind, MapObjectPlacement} from './mapObjects';
export {MAP_OBJECT_DEFS, MAP_OBJECT_IDS, mapObjectDef, mapObjectUrl} from './mapObjects';

export type TileId =
  | 'grass_a'
  | 'grass_b'
  | 'wasteland_a'
  | 'wasteland_b'
  | 'stone_path'
  | 'water_shallow';

export type TileDef = {
  id: TileId;
  label: string;
  /** Seamless base color (map seams) */
  fill: string;
};

export const TILE_DEFS: TileDef[] = [
  {id: 'grass_a', label: '잔디 A', fill: '#6f9458'},
  {id: 'grass_b', label: '잔디 B', fill: '#62874e'},
  {id: 'wasteland_a', label: '황무지 A', fill: '#9a7b5c'},
  {id: 'wasteland_b', label: '황무지 B', fill: '#8a6d52'},
  {id: 'stone_path', label: '돌길', fill: '#8d8f8a'},
  {id: 'water_shallow', label: '얕은 물', fill: '#4f8fb8'},
];

export const TILE_IDS = TILE_DEFS.map((t) => t.id);

export const TILE_INDEX: Record<TileId, number> = Object.fromEntries(
  TILE_DEFS.map((t, i) => [t.id, i]),
) as Record<TileId, number>;

export const MAP_WORLD_SIZE = 10_000;
export const MAP_TILE_SIZE = 100;
export const MAP_COLS = MAP_WORLD_SIZE / MAP_TILE_SIZE; // 100
export const MAP_ROWS = MAP_WORLD_SIZE / MAP_TILE_SIZE; // 100
export const MAP_URL = '/todie/map/world.json';

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
  return TILE_DEFS.find((t) => t.id === id) ?? TILE_DEFS[0]!;
}

export function emptyMap(fill: TileId = 'grass_a'): TodieMapJson {
  const idx = TILE_INDEX[fill] ?? 0;
  return {
    version: 1,
    name: 'todie-world',
    worldSize: MAP_WORLD_SIZE,
    tileSize: MAP_TILE_SIZE,
    cols: MAP_COLS,
    rows: MAP_ROWS,
    palette: [...TILE_IDS],
    cells: Array.from({length: MAP_COLS * MAP_ROWS}, () => idx),
    objects: [],
    nextObjectId: 1,
  };
}

function hash01(tx: number, ty: number, salt = 0) {
  let n = (tx * 374761393 + ty * 668265263 + salt * 982451653) >>> 0;
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return (n % 10000) / 10000;
}

function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Procedural starter map — large contiguous biomes (no checkerboard) */
export function generateDefaultMap(): TodieMapJson {
  const map = emptyMap('grass_a');
  const {cols, rows} = map;
  for (let ty = 0; ty < rows; ty += 1) {
    for (let tx = 0; tx < cols; tx += 1) {
      const nx = tx / cols - 0.5;
      const ny = ty / rows - 0.5;
      const dist = Math.hypot(nx, ny);
      const ring = smoothstep((dist - 0.16) / 0.34);
      const lobes =
        hash01(Math.floor(tx / 8), Math.floor(ty / 8), 11) * 0.5 +
        hash01(Math.floor(tx / 5), Math.floor(ty / 5), 29) * 0.5;
      const waste = Math.min(1, Math.max(0, ring * 0.75 + (lobes - 0.42) * 0.9));
      // keep spawn basin grassy
      const spawn = Math.hypot(tx - cols / 2, ty - rows / 2) < 8;
      let id: TileId = 'grass_a';
      if (spawn) {
        id = 'grass_a';
      } else if (waste < 0.18 && hash01(tx, ty, 3) > 0.94) {
        id = 'water_shallow';
      } else if (waste > 0.32 && waste < 0.58 && hash01(tx, ty, 7) > 0.91) {
        id = 'stone_path';
      } else if (waste >= 0.48) {
        // chunky wasteland regions
        const chunk = hash01(Math.floor(tx / 4), Math.floor(ty / 4), 41);
        id = chunk > 0.5 ? 'wasteland_b' : 'wasteland_a';
      } else {
        const chunk = hash01(Math.floor(tx / 6), Math.floor(ty / 6), 17);
        id = chunk > 0.55 ? 'grass_b' : 'grass_a';
      }
      map.cells[ty * cols + tx] = TILE_INDEX[id];
    }
  }
  // sparse starter props away from spawn
  const spawnTx = Math.floor(cols / 2);
  const spawnTy = Math.floor(rows / 2);
  const kinds = ['tree_oak', 'tree_pine', 'bush', 'rock', 'flowers'] as const;
  for (let i = 0; i < 180; i += 1) {
    const tx = Math.floor(hash01(i, 3, 9) * cols);
    const ty = Math.floor(hash01(i, 7, 13) * rows);
    if (Math.hypot(tx - spawnTx, ty - spawnTy) < 10) continue;
    if (hash01(tx, ty, 71) < 0.55) continue;
    const kind = kinds[Math.floor(hash01(tx, ty, 99) * kinds.length)]!;
    map.objects.push({id: map.nextObjectId++, kind, tx, ty});
  }
  return map;
}

export function placeMapObject(
  map: TodieMapJson,
  tx: number,
  ty: number,
  kind: MapObjectPlacement['kind'],
) {
  if (tx < 0 || ty < 0 || tx >= map.cols || ty >= map.rows) return;
  // one prop per cell
  map.objects = map.objects.filter((o) => !(o.tx === tx && o.ty === ty));
  map.objects.push({id: map.nextObjectId++, kind, tx, ty});
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
  if (tx < 0 || ty < 0 || tx >= map.cols || ty >= map.rows) return 'grass_a';
  const i = map.cells[cellIndex(map, tx, ty)] ?? 0;
  return map.palette[i] ?? map.palette[0] ?? 'grass_a';
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
  return {
    version: 1,
    name: typeof raw.name === 'string' ? raw.name : 'todie-world',
    worldSize: Number(raw.worldSize) || MAP_WORLD_SIZE,
    tileSize: Number(raw.tileSize) || MAP_TILE_SIZE,
    cols,
    rows,
    palette: raw.palette.filter((p): p is TileId => TILE_IDS.includes(p as TileId)),
    cells,
    objects,
    nextObjectId,
  };
}
