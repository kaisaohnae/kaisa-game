import {displaySettings} from './settings';
import {libraryPropUrl, libraryTileUrl, parseLibraryTileId} from './pixellabLibrary';
import {
  DEFAULT_MAP_TILE,
  MAP_URL,
  TILE_DEFS,
  TILE_IDS,
  generateDefaultMap,
  mapUrlForStage,
  parseMapJson,
  type TileId,
  type TodieMapJson,
} from './mapTypes';

export {
  DEFAULT_MAP_TILE,
  TILE_DEFS,
  TILE_IDS,
  MAP_WORLD_SIZE,
  MAP_TILE_SIZE,
  MAP_COLS,
  MAP_ROWS,
  MAP_URL,
  MAP_OBJECT_DEFS,
  MAP_OBJECT_IDS,
  generateDefaultMap,
  mapUrlForStage,
  getTileId,
  setTileId,
  paintBrush,
  floodFill,
  parseMapJson,
  emptyMap,
  tileDef,
  mapObjectDef,
  mapObjectUrl,
  placeMapObject,
  eraseMapObject,
  objectAt,
} from './mapTypes';

export type {TileId, TodieMapJson, MapObjectKind, MapObjectPlacement} from './mapTypes';

export function tilePublicBase(): string {
  return (
    (displaySettings as {tiles?: {publicBase?: string}}).tiles?.publicBase ?? '/todie/tiles'
  );
}

export function tileSpriteUrl(id: TileId): string {
  const lib = parseLibraryTileId(id);
  if (lib) return libraryTileUrl(lib.name, lib.wang);
  return `${tilePublicBase()}/${id}.png`;
}

export function objectPublicBase(): string {
  return '/todie/objects';
}

export function objectSpriteUrl(id: string): string {
  return `${objectPublicBase()}/${id}.png`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export type PreparedTiles = Partial<Record<string, HTMLCanvasElement>>;

export async function loadTileImages(
  extraIds: string[] = [],
): Promise<Partial<Record<string, HTMLImageElement>>> {
  const out: Partial<Record<string, HTMLImageElement>> = {};
  const ids = [...new Set([DEFAULT_MAP_TILE, ...extraIds])];
  await Promise.all(
    ids.map(async (id) => {
      try {
        out[id] = await loadImage(tileSpriteUrl(id));
      } catch {
        /* color fallback */
      }
    }),
  );
  return out;
}

/** Draw library tiles full-bleed (no punch); fill under if needed */
export function prepareTileCanvases(
  images: Partial<Record<string, HTMLImageElement>>,
  tileSize: number,
  extraIds: string[] = [],
): PreparedTiles {
  const out: PreparedTiles = {};
  const ids = [...new Set([DEFAULT_MAP_TILE, ...extraIds, ...Object.keys(images)])];
  for (const id of ids) {
    const c = document.createElement('canvas');
    c.width = tileSize;
    c.height = tileSize;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#5a6a5a';
    g.fillRect(0, 0, tileSize, tileSize);
    const img = images[id];
    if (img && img.complete && img.naturalWidth > 0) {
      g.drawImage(img, 0, 0, tileSize, tileSize);
    }
    out[id] = c;
  }
  return out;
}

export async function loadMapObjectImages(
  extras: {kind: string; frame?: string}[] = [],
): Promise<Partial<Record<string, HTMLImageElement>>> {
  const out: Partial<Record<string, HTMLImageElement>> = {};
  const jobs: Promise<void>[] = [];
  for (const ex of extras) {
    const key = ex.frame ? `${ex.kind}:${ex.frame}` : ex.kind;
    const url = libraryPropUrl(ex.kind, ex.frame) ?? objectSpriteUrl(ex.kind);
    jobs.push(
      (async () => {
        try {
          out[key] = await loadImage(url);
        } catch {
          /* ignore */
        }
      })(),
    );
  }
  await Promise.all(jobs);
  return out;
}

export async function loadTodieMap(stage = 1): Promise<TodieMapJson> {
  const urls = [mapUrlForStage(stage), MAP_URL];
  for (const url of [...new Set(urls)]) {
    try {
      const res = await fetch(url, {cache: 'no-store'});
      if (!res.ok) continue;
      return parseMapJson(await res.json());
    } catch {
      /* try next */
    }
  }
  return generateDefaultMap();
}

/** @deprecated */
export function pickTileId(
  _tx: number,
  _ty: number,
  _waste: number,
  _seed: number,
): TileId {
  return DEFAULT_MAP_TILE;
}

void TILE_DEFS;
void TILE_IDS;
