/**
 * Import assets created on pixellab.ai (create-object / tilesets) into local public/.
 */
import path from 'node:path';
import {MANIFEST} from './manifest.mjs';
import {installRawPng, fetchBuffer} from './install.mjs';
import {loadImageSource} from './pixellab.mjs';

/** Local install slots for Todie tiles + map objects */
export function listImportTargets() {
  return MANIFEST.filter(
    (m) =>
      m.game === 'todie' &&
      (m.category === 'tile' || m.category === 'object') &&
      m.fileInstall?.path,
  ).map((m) => ({
    id: m.id,
    label: m.label,
    category: m.category,
    path: m.fileInstall.path,
  }));
}

/**
 * Prefer first available frame / south rotation URL from an object detail payload.
 * @param {object} detail
 * @param {number} [frameIndex]
 */
export function pickObjectImageUrl(detail, frameIndex = 0) {
  const storage = detail?.storage_urls ?? {};
  const frameKey = `frame_${frameIndex}`;
  if (typeof storage[frameKey] === 'string' && storage[frameKey]) return storage[frameKey];
  for (const [k, v] of Object.entries(storage)) {
    if (typeof v === 'string' && v && k.startsWith('frame_')) return v;
  }
  const rotations = detail?.rotation_urls ?? {};
  for (const key of ['south', 'north', 'east', 'west']) {
    if (typeof rotations[key] === 'string' && rotations[key]) return rotations[key];
  }
  for (const v of Object.values(rotations)) {
    if (typeof v === 'string' && v) return v;
  }
  if (typeof detail?.preview_url === 'string' && detail.preview_url) return detail.preview_url;
  return null;
}

/**
 * @param {import('./pixellab.mjs').PixelLabClient} client
 * @param {{ objectId: string, frameIndex?: number, targetPath: string }} opts
 */
export async function importObjectToPath(client, opts) {
  const detail = await client.getObject(opts.objectId);
  const url = pickObjectImageUrl(detail, opts.frameIndex ?? 0);
  if (!url) throw new Error('object has no downloadable frame yet');
  const buf = await fetchBuffer(url);
  const out = installRawPng(opts.targetPath, buf);
  return {
    ok: true,
    source: 'object',
    objectId: opts.objectId,
    frameIndex: opts.frameIndex ?? 0,
    name: detail.name ?? detail.prompt ?? opts.objectId,
    outputPath: out,
    publicUrl: '/' + opts.targetPath.replace(/^public\//, '').replace(/\\/g, '/'),
  };
}

/**
 * @param {import('./pixellab.mjs').PixelLabClient} client
 * @param {{ tilesetId: string, tileKey: string, targetPath: string }} opts
 * tileKey = wang name (wang_0) or tile.id
 */
export async function importTilesetTileToPath(client, opts) {
  const res = await client.getTileset(opts.tilesetId);
  const tiles = res?.tileset?.tiles ?? [];
  const tile = tiles.find(
    (t) => t.id === opts.tileKey || t.name === opts.tileKey || String(t.id) === opts.tileKey,
  );
  if (!tile) throw new Error(`tile ${opts.tileKey} not found in tileset`);
  const src = tile.image?.base64
    ? `data:image/png;base64,${tile.image.base64}`
    : tile.image?.url ?? null;
  if (!src) throw new Error('tile has no image data');
  const buf = await loadImageSource(src);
  const out = installRawPng(opts.targetPath, buf);
  return {
    ok: true,
    source: 'tileset',
    tilesetId: opts.tilesetId,
    tileKey: opts.tileKey,
    tileName: tile.name,
    outputPath: out,
    publicUrl: '/' + opts.targetPath.replace(/^public\//, '').replace(/\\/g, '/'),
  };
}

/** Normalize object list for UI */
export function summarizeObjects(listRes) {
  const objects = listRes?.objects ?? [];
  return {
    total: listRes?.total ?? objects.length,
    objects: objects.map((o) => ({
      id: o.id,
      name: (o.name || o.prompt || o.id).trim(),
      prompt: o.prompt ?? '',
      status: o.status ?? 'unknown',
      size: o.size ?? null,
      directions: o.directions ?? 1,
      previewUrl: o.preview_url ?? null,
      createdAt: o.created_at ?? null,
    })),
  };
}

/** Normalize tileset list + optional expanded tiles for one tileset */
export function summarizeTilesets(listRes) {
  const tilesets = listRes?.tilesets ?? [];
  return {
    total: listRes?.total ?? tilesets.length,
    tilesets: tilesets.map((t) => ({
      id: t.id,
      name: t.name ?? `${t.lower_description ?? ''} → ${t.upper_description ?? ''}`.trim(),
      lower: t.lower_description ?? '',
      upper: t.upper_description ?? '',
      status: t.status ?? 'unknown',
      tileSize: t.tile_size ?? null,
      createdAt: t.created_at ?? null,
    })),
  };
}

export function summarizeTilesetDetail(detail) {
  const tiles = detail?.tileset?.tiles ?? [];
  return {
    id: detail?.metadata?.tileset_id ?? detail?.tileset?.id ?? null,
    totalTiles: detail?.tileset?.total_tiles ?? tiles.length,
    tileSize: detail?.tileset?.tile_size ?? null,
    tiles: tiles.map((t) => ({
      id: t.id,
      name: t.name,
      /** data URL for UI preview */
      previewDataUrl: t.image?.base64
        ? `data:image/png;base64,${t.image.base64}`
        : t.image?.url ?? null,
      corners: t.corners ?? null,
    })),
  };
}

export function resolveTargetPath(targetId) {
  const hit = listImportTargets().find((t) => t.id === targetId);
  if (!hit) throw new Error(`unknown install target ${targetId}`);
  return hit.path;
}
