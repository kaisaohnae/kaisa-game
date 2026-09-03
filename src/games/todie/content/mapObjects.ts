/** Decorative / blocking map props — library objects/characters only */

import {
  isLibraryCharacterName,
  isLibraryObjectName,
  libraryPropUrl,
} from './pixellabLibrary';

/** Builtin kinds removed; library `object-N` / `character-N` only */
export type MapObjectKind = string;

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

/** @deprecated empty — use PixelLab library */
export const MAP_OBJECT_DEFS: MapObjectDef[] = [];

export const MAP_OBJECT_IDS: string[] = [];

export type MapObjectPlacement = {
  id: number;
  kind: MapObjectKind;
  /** Library object/character frame (e.g. frame_0, south) */
  frame?: string;
  /** Tile column */
  tx: number;
  /** Tile row */
  ty: number;
};

export function isBuiltinMapObject(_kind: string): boolean {
  return false;
}

export function isPlaceableMapObjectKind(kind: string): boolean {
  return isLibraryObjectName(kind) || isLibraryCharacterName(kind);
}

export function mapObjectDef(kind: MapObjectKind): MapObjectDef {
  if (isLibraryCharacterName(kind)) {
    return {id: kind, label: kind, size: 96, blocking: true, fill: '#6a5acd'};
  }
  if (isLibraryObjectName(kind)) {
    return {id: kind, label: kind, size: 72, blocking: true, fill: '#78909c'};
  }
  return {id: kind, label: kind, size: 64, blocking: false, fill: '#666666'};
}

export function mapObjectUrl(kind: MapObjectKind, frame?: string): string {
  const lib = libraryPropUrl(kind, frame);
  if (lib) return lib;
  return `/todie/objects/${kind}.png`;
}

/** Cache key for loaded images (kind + optional frame) */
export function mapObjectImageKey(kind: string, frame?: string): string {
  if (frame) return `${kind}:${frame}`;
  return kind;
}

export function parseMapObjects(raw: unknown): MapObjectPlacement[] {
  if (!Array.isArray(raw)) return [];
  const out: MapObjectPlacement[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Partial<MapObjectPlacement>;
    if (typeof r.kind !== 'string' || !isPlaceableMapObjectKind(r.kind)) continue;
    const tx = Number(r.tx);
    const ty = Number(r.ty);
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) continue;
    const frame = typeof r.frame === 'string' && r.frame ? r.frame : undefined;
    out.push({
      id: Number(r.id) || out.length + 1,
      kind: r.kind,
      ...(frame ? {frame} : {}),
      tx: Math.floor(tx),
      ty: Math.floor(ty),
    });
  }
  return out;
}
