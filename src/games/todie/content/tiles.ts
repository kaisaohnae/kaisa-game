import {MAP_OBJECT_IDS} from './mapObjects';
import {displaySettings} from './settings';
import {
  MAP_URL,
  TILE_DEFS,
  TILE_IDS,
  generateDefaultMap,
  parseMapJson,
  type TileId,
  type TodieMapJson,
} from './mapTypes';

export {
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

/** Near-black → transparent so seamless fillColor shows through */
function punchDarkToAlpha(img: HTMLImageElement, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0, size, size);
  const data = g.getImageData(0, 0, size, size);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i]!;
    const gr = px[i + 1]!;
    const b = px[i + 2]!;
    if (r + gr + b < 48) {
      px[i + 3] = 0;
    }
  }
  g.putImageData(data, 0, 0);
  return c;
}

export type PreparedTiles = Partial<Record<TileId, HTMLCanvasElement>>;

export async function loadTileImages(): Promise<Partial<Record<TileId, HTMLImageElement>>> {
  const out: Partial<Record<TileId, HTMLImageElement>> = {};
  await Promise.all(
    TILE_IDS.map(async (id) => {
      try {
        out[id] = await loadImage(tileSpriteUrl(id));
      } catch {
        /* color fallback */
      }
    }),
  );
  return out;
}

/** Fill color + punched sprite, cached per tile size */
export function prepareTileCanvases(
  images: Partial<Record<TileId, HTMLImageElement>>,
  tileSize: number,
): PreparedTiles {
  const out: PreparedTiles = {};
  for (const def of TILE_DEFS) {
    const c = document.createElement('canvas');
    c.width = tileSize;
    c.height = tileSize;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.fillStyle = def.fill;
    g.fillRect(0, 0, tileSize, tileSize);
    const img = images[def.id];
    if (img && img.complete && img.naturalWidth > 0) {
      const punched = punchDarkToAlpha(img, tileSize);
      // Higher fill + softer overlay = neighboring tiles share base hue (fewer seams)
      g.globalAlpha =
        def.id === 'stone_path' || def.id === 'water_shallow' ? 0.78 : 0.42;
      g.drawImage(punched, 0, 0);
      g.globalAlpha = 1;
    }
    out[def.id] = c;
  }
  return out;
}

export async function loadMapObjectImages(): Promise<Partial<Record<string, HTMLImageElement>>> {
  const out: Partial<Record<string, HTMLImageElement>> = {};
  await Promise.all(
    MAP_OBJECT_IDS.map(async (id) => {
      try {
        out[id] = await loadImage(objectSpriteUrl(id));
      } catch {
        /* fallback fill */
      }
    }),
  );
  return out;
}

export async function loadTodieMap(): Promise<TodieMapJson> {
  try {
    const res = await fetch(MAP_URL, {cache: 'no-store'});
    if (!res.ok) throw new Error(`map ${res.status}`);
    return parseMapJson(await res.json());
  } catch {
    return generateDefaultMap();
  }
}

/** @deprecated use map cells */
export function pickTileId(
  tx: number,
  ty: number,
  waste: number,
  seed: number,
): TileId {
  if (waste < 0.2 && seed > 0.93) return 'water_shallow';
  if (waste > 0.28 && waste < 0.62 && seed > 0.9) return 'stone_path';
  if (waste >= 0.45) return seed > 0.5 ? 'wasteland_b' : 'wasteland_a';
  return (tx + ty) % 2 === 0 ? 'grass_a' : 'grass_b';
}
