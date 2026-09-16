import {
  generateDefaultMap,
  getTileId,
  parseMapJson,
  tileDef,
  type PreparedTiles,
  type TodieMapJson,
} from '@/games/todie/content/tiles';
import {loadMapLayerAssets} from '@/games/todie/content/preload';

export type HihiMapConfig = {
  version: 1;
  name: string;
  mapId: string;
  worldSize: number;
  tileSize: number;
  cols: number;
  rows: number;
  spawnX: number;
  spawnY: number;
  maxPlayers: number;
  colors: {
    bg: string;
    border: string;
  };
  minimap: {
    size: number;
    selfColor: string;
    otherColor: string;
    viewColor: string;
    label: string;
  };
  tileMap: TodieMapJson;
  tiles: PreparedTiles;
  objects: Partial<Record<string, HTMLImageElement>>;
};

export const DEFAULT_HIHI_MAP: HihiMapConfig = (() => {
  const tileMap = generateDefaultMap();
  tileMap.name = 'chat1';
  return {
    version: 1,
    name: 'chat1',
    mapId: 'chat1',
    worldSize: tileMap.worldSize,
    tileSize: tileMap.tileSize,
    cols: tileMap.cols,
    rows: tileMap.rows,
    spawnX: tileMap.worldSize / 2,
    spawnY: tileMap.worldSize / 2,
    maxPlayers: 80,
    colors: {
      bg: '#0d2a33',
      border: 'rgba(255, 214, 170, 0.12)',
    },
    minimap: {
      size: 168,
      selfColor: '#ff8fab',
      otherColor: '#7dd3c7',
      viewColor: '#ffe082',
      label: 'hihi',
    },
    tileMap,
    tiles: {},
    objects: {},
  };
})();

export async function fetchHihiActiveMapId(): Promise<string> {
  try {
    const res = await fetch('/hihi/map/active.json', {cache: 'no-store'});
    if (res.ok) {
      const data = (await res.json()) as {activeMapId?: string};
      if (typeof data.activeMapId === 'string' && data.activeMapId.trim()) {
        return data.activeMapId.trim();
      }
    }
  } catch {
    /* fall through */
  }
  return 'chat1';
}

export async function loadHihiTileMap(mapId = 'chat1'): Promise<TodieMapJson> {
  const urls = [`/hihi/map/${mapId}.json`, '/hihi/map/chat1.json'];
  for (const url of [...new Set(urls)]) {
    try {
      const res = await fetch(url, {cache: 'no-store'});
      if (!res.ok) continue;
      return parseMapJson(await res.json());
    } catch {
      /* try next */
    }
  }
  const fallback = generateDefaultMap();
  fallback.name = mapId;
  return fallback;
}

export async function fetchHihiMapConfig(): Promise<HihiMapConfig> {
  const mapId = await fetchHihiActiveMapId();
  const tileMap = await loadHihiTileMap(mapId);
  const layers = await loadMapLayerAssets(tileMap);
  const worldSize = tileMap.worldSize;
  return {
    version: 1,
    name: tileMap.name || mapId,
    mapId,
    worldSize,
    tileSize: tileMap.tileSize,
    cols: tileMap.cols,
    rows: tileMap.rows,
    spawnX: worldSize / 2,
    spawnY: worldSize / 2,
    maxPlayers: 80,
    colors: {
      bg: '#0d2a33',
      border: 'rgba(255, 214, 170, 0.12)',
    },
    minimap: {
      size: 168,
      selfColor: '#ff8fab',
      otherColor: '#7dd3c7',
      viewColor: '#ffe082',
      label: tileMap.name || 'hihi',
    },
    tileMap,
    tiles: layers.tiles,
    objects: layers.objects,
  };
}

export {getTileId, tileDef};
export type {TodieMapJson, PreparedTiles};
