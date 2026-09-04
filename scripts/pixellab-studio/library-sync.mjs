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
/** @typedef {{ name: string, title: string, remoteId: string, frames: string[], syncedAt: string, stateName?: string, groupId?: string }} LibCharacter */
/** @typedef {{ version: 1, objects: LibObject[], tiles: LibTile[], characters: LibCharacter[] }} LibraryCatalog */

/** @returns {LibraryCatalog} */
export function emptyCatalog() {
  return {version: 1, objects: [], tiles: [], characters: []};
}

/** @param {object} raw @returns {LibCharacter} */
function normalizeCharacterEntry(raw) {
  const stateName =
    typeof raw.stateName === 'string' && raw.stateName.trim()
      ? raw.stateName.trim()
      : undefined;
  let title =
    typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : '';
  const legacyDesc = typeof raw.desc === 'string' ? raw.desc.trim() : '';
  // 구버전: title 없이 desc만 있거나 "이름 · 스테이트" 형태
  if (!title && legacyDesc) {
    if (stateName && legacyDesc.endsWith(` · ${stateName}`)) {
      title = legacyDesc.slice(0, -(stateName.length + 3)).trim();
    } else {
      const sep = legacyDesc.lastIndexOf(' · ');
      title = sep > 0 ? legacyDesc.slice(0, sep).trim() : legacyDesc;
    }
  }
  return {
    name: String(raw.name || ''),
    title: title || String(raw.name || ''),
    remoteId: String(raw.remoteId || ''),
    frames: Array.isArray(raw.frames) ? raw.frames : [],
    syncedAt: String(raw.syncedAt || ''),
    stateName,
    groupId:
      typeof raw.groupId === 'string' && raw.groupId ? raw.groupId : undefined,
  };
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
      characters = Array.isArray(raw.characters)
        ? raw.characters.map(normalizeCharacterEntry)
        : [];
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

/** Characters list — max limit 100; paginate with offset when supported */
async function fetchAllCharacters(client) {
  /** @type {object[]} */
  const all = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const path =
      offset === 0
        ? `/characters?limit=${limit}`
        : `/characters?limit=${limit}&offset=${offset}`;
    const data = await client.request(path);
    const rows = data.characters ?? [];
    all.push(...rows);
    if (rows.length < limit) break;
    offset += limit;
    if (offset > 5000) break;
  }
  return all;
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

/** PixelLab character title (`name`) */
function characterTitle(c) {
  return String(c.name || '').trim() || String(c.id);
}

/** PixelLab States 탭 명칭 */
function characterStateName(c) {
  const state = String(c.state_name || '').trim();
  return state || undefined;
}

/**
 * remoteId 키로 로컬 catalog의 title / stateName 만 갱신 (이미지 재다운로드 없음).
 * @param {{
 *   catalog?: LibraryCatalog,
 *   remoteObjects?: object[],
 *   remoteTilesets?: object[],
 *   remoteChars?: object[],
 * }} [opts]
 * @returns {{ catalog: LibraryCatalog, metaUpdated: string[] }}
 */
function applyRemoteMeta(opts = {}) {
  const catalog = opts.catalog ?? loadCatalog();
  /** @type {string[]} */
  const metaUpdated = [];

  const knownObjects = new Map(catalog.objects.map((o) => [o.remoteId, o]));
  const knownTiles = new Map(catalog.tiles.map((t) => [t.remoteId, t]));
  const knownChars = new Map(catalog.characters.map((c) => [c.remoteId, c]));

  for (const row of opts.remoteObjects ?? []) {
    const existing = row.id ? knownObjects.get(row.id) : null;
    if (!existing) continue;
    const desc = objectDesc(row);
    if (existing.desc !== desc) {
      existing.desc = desc;
      metaUpdated.push(existing.name);
    }
  }

  for (const row of opts.remoteTilesets ?? []) {
    const existing = row.id ? knownTiles.get(row.id) : null;
    if (!existing) continue;
    const desc = tilesetDesc(row);
    if (existing.desc !== desc) {
      existing.desc = desc;
      metaUpdated.push(existing.name);
    }
  }

  for (const row of opts.remoteChars ?? []) {
    const existing = row.id ? knownChars.get(row.id) : null;
    if (!existing) continue;
    const title = characterTitle(row);
    const stateName = characterStateName(row);
    const groupId = row.group_id ? String(row.group_id) : undefined;
    let changed = false;
    if (existing.title !== title) {
      existing.title = title;
      changed = true;
    }
    if ((existing.stateName || undefined) !== stateName) {
      existing.stateName = stateName;
      changed = true;
    }
    if ((existing.groupId || undefined) !== groupId) {
      existing.groupId = groupId;
      changed = true;
    }
    // 구버전 desc 필드 제거
    if ('desc' in existing) {
      delete existing.desc;
      changed = true;
    }
    if (changed) metaUpdated.push(existing.name);
  }

  return {catalog, metaUpdated};
}

/**
 * @param {import('./pixellab.mjs').PixelLabClient} client
 * @returns {Promise<{ catalog: LibraryCatalog, metaUpdated: string[] }>}
 */
export async function syncCatalogMeta(client) {
  const remoteObjects = await fetchAllPages(client, 'objects');
  const remoteTilesets = await fetchAllPages(client, 'tilesets');
  const remoteChars = await fetchAllCharacters(client);
  const result = applyRemoteMeta({remoteObjects, remoteTilesets, remoteChars});
  if (result.metaUpdated.length) saveCatalog(result.catalog);
  return result;
}

/**
 * List remote assets not yet in the local catalog (no downloads).
 * @param {import('./pixellab.mjs').PixelLabClient} client
 */
export async function listPendingLibrary(client) {
  const remoteObjects = await fetchAllPages(client, 'objects');
  const remoteTilesets = await fetchAllPages(client, 'tilesets');
  const remoteChars = await fetchAllCharacters(client);

  // 새로고침 시 remoteId 키로 title / stateName 동기화
  const {catalog} = applyRemoteMeta({remoteObjects, remoteTilesets, remoteChars});
  saveCatalog(catalog);

  const knownObjects = new Set(catalog.objects.map((o) => o.remoteId));
  const knownTiles = new Set(catalog.tiles.map((t) => t.remoteId));
  const knownChars = new Set(catalog.characters.map((c) => c.remoteId));

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
        title: characterTitle(c),
        stateName: characterStateName(c) ?? null,
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
  const now = new Date().toISOString();

  if (mode === 'resync' && (!nameFilter || nameFilter.size === 0)) {
    throw new Error('재연동할 object/tile을 선택하세요');
  }

  onProgress('Syncing names…');
  const remoteObjects = await fetchAllPages(client, 'objects');
  const remoteTilesets = await fetchAllPages(client, 'tilesets');
  const remoteChars = await fetchAllCharacters(client);
  const {catalog, metaUpdated} = applyRemoteMeta({
    remoteObjects,
    remoteTilesets,
    remoteChars,
  });

  const knownObjects = new Map(catalog.objects.map((o) => [o.remoteId, o]));
  const knownTiles = new Map(catalog.tiles.map((t) => [t.remoteId, t]));
  const knownChars = new Map(catalog.characters.map((c) => [c.remoteId, c]));

  /** @type {{ added: string[], updated: string[], metaUpdated: string[], skipped: number }} */
  const summary = {
    added: [],
    updated: [],
    metaUpdated: [...metaUpdated],
    skipped: 0,
  };

  const wantResync = (existing) =>
    mode === 'resync' && existing && nameFilter.has(existing.name);

  onProgress('Fetching objects…');
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
      title: characterTitle(detail),
      remoteId,
      stateName: characterStateName(detail),
      groupId: detail.group_id ? String(detail.group_id) : undefined,
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
