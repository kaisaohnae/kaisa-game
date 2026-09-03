/** Shared PixelLab libraries — common objects/tiles + characters */

export type LibObjectEntry = {
  name: string;
  desc: string;
  remoteId: string;
  frames: string[];
  syncedAt: string;
};

export type LibTileEntry = {
  name: string;
  desc: string;
  remoteId: string;
  tiles: string[];
  syncedAt: string;
};

export type LibCharacterEntry = {
  name: string;
  desc: string;
  remoteId: string;
  frames: string[];
  syncedAt: string;
};

export type PixellabLibraryCatalog = {
  version: 1;
  objects: LibObjectEntry[];
  tiles: LibTileEntry[];
  characters: LibCharacterEntry[];
};

export const PIXELLAB_COMMON_CATALOG_URL = '/common/catalog.json';
export const PIXELLAB_CHARACTERS_CATALOG_URL = '/pixellab-characters/catalog.json';

export function emptyPixellabCatalog(): PixellabLibraryCatalog {
  return {version: 1, objects: [], tiles: [], characters: []};
}

export async function fetchPixellabCatalog(): Promise<PixellabLibraryCatalog> {
  try {
    const [commonRes, charsRes] = await Promise.all([
      fetch(`${PIXELLAB_COMMON_CATALOG_URL}?t=${Date.now()}`, {cache: 'no-store'}),
      fetch(`${PIXELLAB_CHARACTERS_CATALOG_URL}?t=${Date.now()}`, {cache: 'no-store'}),
    ]);
    const common = commonRes.ok ? await commonRes.json() : {};
    const chars = charsRes.ok ? await charsRes.json() : {};
    return {
      version: 1,
      objects: Array.isArray(common.objects) ? common.objects : [],
      tiles: Array.isArray(common.tiles) ? common.tiles : [],
      characters: Array.isArray(chars.characters)
        ? chars.characters
        : Array.isArray(common.characters)
          ? common.characters
          : [],
    };
  } catch {
    return emptyPixellabCatalog();
  }
}

/** Library tile cell id: `tile-1/wang_15` */
export function libraryTileId(tileName: string, wang: string): string {
  return `${tileName}/${wang}`;
}

export function parseLibraryTileId(id: string): {name: string; wang: string} | null {
  const m = id.match(/^(tile-\d+)\/([^/]+)$/);
  if (!m) return null;
  return {name: m[1]!, wang: m[2]!};
}

export function isLibraryTileId(id: string): boolean {
  return Boolean(parseLibraryTileId(id));
}

export function isLibraryObjectName(kind: string): boolean {
  return /^object-\d+$/.test(kind);
}

export function isLibraryCharacterName(kind: string): boolean {
  return /^character-\d+$/.test(kind);
}

export function libraryObjectUrl(name: string, frame: string): string {
  return `/common/objects/${name}/${frame}.png`;
}

export function libraryTileUrl(name: string, wang: string): string {
  return `/common/tiles/${name}/${wang}.png`;
}

export function libraryCharacterUrl(name: string, frame: string): string {
  return `/pixellab-characters/${name}/${frame}.png`;
}

export function libraryPropUrl(kind: string, frame?: string): string | null {
  if (isLibraryObjectName(kind)) {
    return libraryObjectUrl(kind, frame ?? 'frame_0');
  }
  if (isLibraryCharacterName(kind)) {
    return libraryCharacterUrl(kind, frame ?? 'south');
  }
  return null;
}
