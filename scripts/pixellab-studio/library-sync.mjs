/**
 * PixelLab → local asset libraries.
 *
 * Layout:
 *   public/common/catalog.json
 *   public/common/objects/object-N/frame_K.png
 *   public/common/tiles/tile-N/wang_K.png
 *   public/pixellab-characters/catalog.json
 *   public/pixellab-characters/character-N/{rotation}.png
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fetchBuffer} from './install.mjs';
import {loadImageSource} from './pixellab.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
export const LIBRARY_ROOT = path.join(ROOT, 'public', 'common');
export const CHARACTERS_ROOT = path.join(ROOT, 'public', 'pixellab-characters');
export const CATALOG_PATH = path.join(LIBRARY_ROOT, 'catalog.json');
export const CHARACTERS_CATALOG_PATH = path.join(CHARACTERS_ROOT, 'catalog.json');

/** @typedef {{ name: string, desc: string, remoteId: string, frames: string[], syncedAt: string }} LibObject */
/** @typedef {{ name: string, desc: string, remoteId: string, tiles: string[], syncedAt: string }} LibTile */
/** @typedef {{ name: string, desc: string, remoteId: string, frames: string[], syncedAt: string }} LibCharacter */
/** @typedef {{ version: 1, objects: LibObject[], tiles: LibTile[], characters: LibCharacter[] }} LibraryCatalog */

/** @returns {LibraryCatalog} */
export function emptyCatalog() {
  return {version: 1, objects: [], tiles: [], characters: []};
}

/** @returns {LibraryCatalog} */
export function loadCatalog() {
  /** @type {LibObject[]} */
  let objects = [];
  /** @type {LibTile[]} */
  let tiles = [];
  /** @type {LibCharacter[]} */
  let characters = [];
  try {
    if (fs.existsSync(CATALOG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
      objects = Array.isArray(raw.objects) ? raw.objects : [];
      tiles = Array.isArray(raw.tiles) ? raw.tiles : [];
    }
  } catch {
    /* ignore */
  }
  try {
    if (fs.existsSync(CHARACTERS_CATALOG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CHARACTERS_CATALOG_PATH, 'utf8'));
      characters = Array.isArray(raw.characters) ? raw.characters : [];
    }
  } catch {
    /* ignore */
  }
  return {version: 1, objects, tiles, characters};
}

/** @param {LibraryCatalog} catalog */
export function saveCatalog(catalog) {
  fs.mkdirSync(LIBRARY_ROOT, {recursive: true});
  fs.mkdirSync(CHARACTERS_ROOT, {recursive: true});
  fs.writeFileSync(
    CATALOG_PATH,
    `${JSON.stringify(
      {
        version: 1,
        objects: catalog.objects,
        tiles: catalog.tiles,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  fs.writeFileSync(
    CHARACTERS_CATALOG_PATH,
    `${JSON.stringify(
      {
        version: 1,
        characters: catalog.characters,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

/**
 * @param {'object'|'tile'|'character'} prefix
 * @param {{name: string}[]} entries
 */
function nextName(prefix, entries) {
  let max = 0;
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  for (const e of entries) {
    const m = String(e.name).match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${max + 1}`;
}

/** @param {string} absRoot @param {string} rel */
function absUnder(absRoot, rel) {
  return path.join(absRoot, rel.replace(/\//g, path.sep));
}

/** @param {string} absRoot @param {string} rel @param {Buffer} buf */
function writePngUnder(absRoot, rel, buf) {
  const abs = absUnder(absRoot, rel);
  fs.mkdirSync(path.dirname(abs), {recursive: true});
  fs.writeFileSync(abs, buf);
  return abs;
}

/**
 * @param {import('./pixellab.mjs').PixelLabClient} client
 * @param {{ limit?: number }} [opts]
 */
async function fetchAllPages(client, kind, opts = {}) {
  const limit = opts.limit ?? 50;
  let offset = 0;
  /** @type {object[]} */
  const all = [];
  for (;;) {
    const data =
      kind === 'objects'
        ? await client.listObjects({limit, offset})
        : kind === 'tilesets'
          ? await client.listTilesets({limit, offset})
          : await client.listCharacters(limit);
    const rows =
      kind === 'objects'
        ? (data.objects ?? [])
        : kind === 'tilesets'
          ? (data.tilesets ?? [])
          : (data.characters ?? []);
    all.push(...rows);
    if (kind === 'characters') break; // characters API is limit-only in our client
    if (rows.length < limit) break;
    offset += limit;
    if (offset > 5000) break;
  }
  return all;
}

/** Characters list with higher limit via direct request */
async function fetchAllCharacters(client) {
  const data = await client.listCharacters(100);
  return data.characters ?? [];
}

/**
 * @param {import('./pixellab.mjs').PixelLabClient} client
 * @param {object} detail
 * @param {string} objectName
 */
async function downloadObjectFrames(client, detail, objectName) {
  const storage = detail.storage_urls ?? {};
  /** @type {string[]} */
  const frames = [];
  const keys = Object.keys(storage)
    .filter((k) => k.startsWith('frame_') && typeof storage[k] === 'string' && storage[k])
    .sort((a, b) => {
      const na = Number(a.slice(6));
      const nb = Number(b.slice(6));
      return (Number.isFinite(na) ? na : 0) - (Number.isFinite(nb) ? nb : 0);
    });
  for (const key of keys) {
    const buf = await fetchBuffer(storage[key]);
    writePngUnder(LIBRARY_ROOT, `objects/${objectName}/${key}.png`, buf);
    frames.push(key);
  }
  if (!frames.length) {
    const rotations = detail.rotation_urls ?? {};
    for (const [key, url] of Object.entries(rotations)) {
      if (typeof url !== 'string' || !url) continue;
      const buf = await fetchBuffer(url);
      writePngUnder(LIBRARY_ROOT, `objects/${objectName}/${key}.png`, buf);
      frames.push(key);
    }
  }
  return frames;
}

/**
 * @param {import('./pixellab.mjs').PixelLabClient} client
 * @param {string} tilesetId
 * @param {string} tileName
 */
async function downloadTilesetTiles(client, tilesetId, tileName) {
  const res = await client.getTileset(tilesetId);
  const tiles = res?.tileset?.tiles ?? [];
  /** @type {string[]} */
  const names = [];
  for (const tile of tiles) {
    const key = String(tile.name || `wang_${tile.id}`);
    const src = tile.image?.base64
      ? `data:image/png;base64,${tile.image.base64}`
      : tile.image?.url ?? null;
    if (!src) continue;
    const buf = await loadImageSource(src);
    writePngUnder(LIBRARY_ROOT, `tiles/${tileName}/${key}.png`, buf);
    names.push(key);
  }
  names.sort((a, b) => {
    const na = Number(String(a).replace(/\D/g, ''));
    const nb = Number(String(b).replace(/\D/g, ''));
    return na - nb;
  });
  return names;
}

/**
 * @param {object} detail
 * @param {string} characterName
 */
async function downloadCharacterFrames(detail, characterName) {
  const rotations = detail.rotation_urls ?? {};
  /** @type {string[]} */
  const frames = [];
  for (const [key, url] of Object.entries(rotations)) {
    if (typeof url !== 'string' || !url) continue;
    const buf = await fetchBuffer(url);
    writePngUnder(CHARACTERS_ROOT, `${characterName}/${key}.png`, buf);
    frames.push(key);
  }
  return frames;
}

function objectDesc(o) {
  return String(o.name || o.prompt || o.id || '').trim();
}

function tilesetDesc(t) {
  const lower = t.lower_description ?? '';
  const upper = t.upper_description ?? '';
  const joined = [lower, upper].filter(Boolean).join(' → ');
  return String(t.name || joined || t.id || '').trim();
}

function characterDesc(c) {
  const parts = [c.name || c.prompt, c.style_name].filter(Boolean);
  return parts.join(' · ').trim() || String(c.id);
}

/**
 * List remote assets not yet in the local catalog (no downloads).
 * @param {import('./pixellab.mjs').PixelLabClient} client
 */
export async function listPendingLibrary(client) {
  const catalog = loadCatalog();
  const knownObjects = new Set(catalog.objects.map((o) => o.remoteId));
  const knownTiles = new Set(catalog.tiles.map((t) => t.remoteId));
  const knownChars = new Set(catalog.characters.map((c) => c.remoteId));

  const remoteObjects = await fetchAllPages(client, 'objects');
  const remoteTilesets = await fetchAllPages(client, 'tilesets');
  const remoteChars = await fetchAllCharacters(client);

  return {
    objects: remoteObjects
      .filter((o) => o.id && !knownObjects.has(o.id))
      .map((o) => ({
        remoteId: o.id,
        kind: 'object',
        desc: objectDesc(o),
        status: o.status ?? null,
      })),
    tiles: remoteTilesets
      .filter((t) => t.id && !knownTiles.has(t.id))
      .map((t) => ({
        remoteId: t.id,
        kind: 'tile',
        desc: tilesetDesc(t),
        status: t.status ?? null,
      })),
    characters: remoteChars
      .filter((c) => c.id && !knownChars.has(c.id) && (!c.status || c.status === 'completed'))
      .map((c) => ({
        remoteId: c.id,
        kind: 'character',
        desc: characterDesc(c),
        status: c.status ?? null,
      })),
  };
}

/**
 * Sync PixelLab assets into the shared library.
 * @param {import('./pixellab.mjs').PixelLabClient} client
 * @param {{
 *   mode?: 'new' | 'resync',
 *   names?: string[],
 *   onProgress?: (msg: string) => void
 * }} [opts]
 */
export async function syncLibrary(client, opts = {}) {
  const mode = opts.mode === 'resync' ? 'resync' : 'new';
  const nameFilter = Array.isArray(opts.names)
    ? new Set(opts.names.filter((n) => typeof n === 'string' && n))
    : null;
  const onProgress = opts.onProgress ?? (() => {});
  const catalog = loadCatalog();
  const now = new Date().toISOString();

  if (mode === 'resync' && (!nameFilter || nameFilter.size === 0)) {
    throw new Error('재연동할 object/tile을 선택하세요');
  }

  const knownObjects = new Map(catalog.objects.map((o) => [o.remoteId, o]));
  const knownTiles = new Map(catalog.tiles.map((t) => [t.remoteId, t]));
  const knownChars = new Map(catalog.characters.map((c) => [c.remoteId, c]));

  /** @type {{ added: string[], updated: string[], skipped: number }} */
  const summary = {added: [], updated: [], skipped: 0};

  const wantResync = (existing) =>
    mode === 'resync' && existing && nameFilter.has(existing.name);

  onProgress('Fetching objects…');
  const remoteObjects = await fetchAllPages(client, 'objects');
  for (const row of remoteObjects) {
    const remoteId = row.id;
    if (!remoteId) continue;
    const existing = knownObjects.get(remoteId);
    if (mode === 'new') {
      if (existing) {
        summary.skipped += 1;
        continue;
      }
    } else if (!wantResync(existing)) {
      continue;
    }
    onProgress(`Object ${remoteId.slice(0, 8)}…`);
    const detail = await client.getObject(remoteId);
    const name = existing?.name ?? nextName('object', catalog.objects);
    const frames = await downloadObjectFrames(client, detail, name);
    if (!frames.length) {
      onProgress(`skip object ${remoteId}: no frames`);
      continue;
    }
    const entry = {
      name,
      desc: objectDesc(detail),
      remoteId,
      frames,
      syncedAt: now,
    };
    if (existing) {
      const i = catalog.objects.findIndex((o) => o.remoteId === remoteId);
      catalog.objects[i] = entry;
      summary.updated.push(name);
    } else {
      catalog.objects.push(entry);
      knownObjects.set(remoteId, entry);
      summary.added.push(name);
    }
  }

  onProgress('Fetching tilesets…');
  const remoteTilesets = await fetchAllPages(client, 'tilesets');
  for (const row of remoteTilesets) {
    const remoteId = row.id;
    if (!remoteId) continue;
    const existing = knownTiles.get(remoteId);
    if (mode === 'new') {
      if (existing) {
        summary.skipped += 1;
        continue;
      }
    } else if (!wantResync(existing)) {
      continue;
    }
    if (row.status && row.status !== 'completed' && !existing) {
      onProgress(`skip tileset ${remoteId}: status ${row.status}`);
      continue;
    }
    onProgress(`Tileset ${remoteId.slice(0, 8)}…`);
    const name = existing?.name ?? nextName('tile', catalog.tiles);
    const tiles = await downloadTilesetTiles(client, remoteId, name);
    if (!tiles.length) {
      onProgress(`skip tileset ${remoteId}: no tiles`);
      continue;
    }
    const entry = {
      name,
      desc: tilesetDesc(row),
      remoteId,
      tiles,
      syncedAt: now,
    };
    if (existing) {
      const i = catalog.tiles.findIndex((t) => t.remoteId === remoteId);
      catalog.tiles[i] = entry;
      summary.updated.push(name);
    } else {
      catalog.tiles.push(entry);
      knownTiles.set(remoteId, entry);
      summary.added.push(name);
    }
  }

  onProgress('Fetching characters…');
  const remoteChars = await fetchAllCharacters(client);
  for (const row of remoteChars) {
    const remoteId = row.id;
    if (!remoteId) continue;
    const existing = knownChars.get(remoteId);
    if (mode === 'new') {
      if (existing) {
        summary.skipped += 1;
        continue;
      }
    } else if (!wantResync(existing)) {
      continue;
    }
    if (row.status && row.status !== 'completed' && !existing) {
      summary.skipped += 1;
      continue;
    }
    onProgress(`Character ${remoteId.slice(0, 8)}…`);
    const detail = await client.getCharacter(remoteId);
    const name = existing?.name ?? nextName('character', catalog.characters);
    const frames = await downloadCharacterFrames(detail, name);
    if (!frames.length) {
      onProgress(`skip character ${remoteId}: no rotations`);
      continue;
    }
    const entry = {
      name,
      desc: characterDesc(detail),
      remoteId,
      frames,
      syncedAt: now,
    };
    if (existing) {
      const i = catalog.characters.findIndex((c) => c.remoteId === remoteId);
      catalog.characters[i] = entry;
      summary.updated.push(name);
    } else {
      catalog.characters.push(entry);
      knownChars.set(remoteId, entry);
      summary.added.push(name);
    }
  }

  saveCatalog(catalog);
  onProgress('Done');
  return {ok: true, mode, summary, catalog};
}

/** Public URL helpers for catalog entries */
export function objectFrameUrl(name, frame) {
  return `/common/objects/${name}/${frame}.png`;
}
export function tilePartUrl(name, tile) {
  return `/common/tiles/${name}/${tile}.png`;
}
export function characterFrameUrl(name, frame) {
  return `/pixellab-characters/${name}/${frame}.png`;
}
