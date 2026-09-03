/** Shared PixelLab library — game-wide objects / tiles / characters */

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

export const PIXELLAB_LIBRARY_CATALOG_URL = '/pixellab-library/catalog.json';

export function emptyPixellabCatalog(): PixellabLibraryCatalog {
  return {version: 1, objects: [], tiles: [], characters: []};
}

export async function fetchPixellabCatalog(): Promise<PixellabLibraryCatalog> {
  try {
    const res = await fetch(`${PIXELLAB_LIBRARY_CATALOG_URL}?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return emptyPixellabCatalog();
    const raw = await res.json();
    return {
      version: 1,
      objects: Array.isArray(raw.objects) ? raw.objects : [],
      tiles: Array.isArray(raw.tiles) ? raw.tiles : [],
      characters: Array.isArray(raw.characters) ? raw.characters : [],
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
  return `/pixellab-library/objects/${name}/${frame}.png`;
}

export function libraryTileUrl(name: string, wang: string): string {
  return `/pixellab-library/tiles/${name}/${wang}.png`;
}

export function libraryCharacterUrl(name: string, frame: string): string {
  return `/pixellab-library/characters/${name}/${frame}.png`;
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
