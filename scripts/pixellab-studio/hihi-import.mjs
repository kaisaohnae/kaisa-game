/**
 * Copy selected PixelLab character idle/walk frames into public/hihi/characters/.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CHARACTERS_CATALOG_PATH, CHARACTERS_ROOT} from './library-sync.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
export const HIHI_ROOT = path.join(ROOT, 'public', 'hihi');
export const HIHI_CHARS_ROOT = path.join(HIHI_ROOT, 'characters');
export const HIHI_CATALOG_PATH = path.join(HIHI_ROOT, 'characters.catalog.json');

const FRAME_ORDER = [
  'south',
  'south-east',
  'east',
  'north-east',
  'north',
  'north-west',
  'west',
  'south-west',
];

/** Korean title body → English folder slug */
const TITLE_SLUG_EN = {
  초록교복: 'green-uniform',
  교복: 'school-uniform',
  까칠: 'delinquent',
  일진: 'delinquent',
  통통: 'chubby',
  중년: 'middle-aged',
  낚시꾼: 'angler',
  신데렐라: 'cinderella',
  사냥꾼: 'hunter',
  개발자: 'developer',
  수영복: 'swimsuit',
  회사원: 'office-worker',
  요리사: 'chef',
  생머리: 'straight-hair',
};

/**
 * Folder-safe English slug from PixelLab title (`남자: 개발자` → `m-developer`).
 * @param {string} title
 */
export function hihiSlugFromTitle(title) {
  const t = String(title || '').trim();
  const gender = t.startsWith('남자:') ? 'm' : t.startsWith('여자:') ? 'f' : 'x';
  const rest = t.replace(/^(남자|여자):\s*/, '').trim();
  const mapped = TITLE_SLUG_EN[rest];
  let body = mapped || rest;
  body = String(body)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 48);
  if (!body || /[^a-z0-9-]/.test(body)) {
    // Non-Latin leftover → stable hash from title
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    body = `char-${h.toString(36)}`;
  }
  return `${gender}-${body}`;
}

/** @param {string | undefined} stateName */
function isIdleState(stateName) {
  const s = String(stateName || '')
    .trim()
    .toLowerCase();
  if (!s) return false;
  return s === 'idle' || s.includes('idle') || s.includes('대기');
}

/** @param {string | undefined} stateName */
function isWalkState(stateName) {
  const s = String(stateName || '')
    .trim()
    .toLowerCase();
  if (!s) return false;
  return s.includes('walk') || s.includes('걷');
}

/** @returns {import('./library-sync.mjs').LibCharacter[]} */
function loadPixellabCharacters() {
  try {
    if (!fs.existsSync(CHARACTERS_CATALOG_PATH)) return [];
    const raw = JSON.parse(fs.readFileSync(CHARACTERS_CATALOG_PATH, 'utf8'));
    return Array.isArray(raw.characters) ? raw.characters : [];
  } catch {
    return [];
  }
}

/**
 * @param {import('./library-sync.mjs').LibCharacter[]} all
 * @param {{ name?: string, remoteId?: string, groupId?: string, title?: string }} selected
 */
function resolveGroup(all, selected) {
  const byRemote = selected.remoteId
    ? all.find((c) => c.remoteId === selected.remoteId)
    : null;
  const byName = selected.name ? all.find((c) => c.name === selected.name) : null;
  const seed = byRemote || byName;
  const groupId = selected.groupId || seed?.groupId;
  const title = selected.title || seed?.title || '';
  let group = [];
  if (groupId) {
    group = all.filter((c) => c.groupId === groupId);
  }
  if (!group.length && title) {
    group = all.filter((c) => c.title === title);
  }
  if (!group.length && seed) group = [seed];
  return {group, title: title || seed?.title || selected.title || selected.name || 'character', seed};
}

/**
 * @param {import('./library-sync.mjs').LibCharacter[]} group
 * @param {(s?: string) => boolean} pred
 */
function pickState(group, pred) {
  const hits = group.filter((c) => pred(c.stateName));
  if (!hits.length) return null;
  // Prefer exact Idle over fuzzy
  const exact = hits.find((c) => String(c.stateName || '').trim().toLowerCase() === 'idle');
  return exact || hits[0];
}

/**
 * @param {string} srcName character-N
 * @param {string} destDir absolute
 * @param {string[]} [frames]
 */
function copyFrames(srcName, destDir, frames) {
  const srcDir = path.join(CHARACTERS_ROOT, srcName);
  if (!fs.existsSync(srcDir)) {
    throw new Error(`missing source ${srcName}`);
  }
  fs.mkdirSync(destDir, {recursive: true});
  const available = fs
    .readdirSync(srcDir)
    .filter((f) => f.endsWith('.png'))
    .map((f) => f.replace(/\.png$/i, ''));
  const wanted = Array.isArray(frames) && frames.length ? frames : FRAME_ORDER;
  /** @type {string[]} */
  const copied = [];
  for (const frame of wanted) {
    const src = path.join(srcDir, `${frame}.png`);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(destDir, `${frame}.png`));
    copied.push(frame);
  }
  // copy any extra frames not in list
  for (const frame of available) {
    if (copied.includes(frame)) continue;
    fs.copyFileSync(path.join(srcDir, `${frame}.png`), path.join(destDir, `${frame}.png`));
    copied.push(frame);
  }
  if (!copied.length) throw new Error(`no frames in ${srcName}`);
  return FRAME_ORDER.filter((f) => copied.includes(f)).concat(
    copied.filter((f) => !FRAME_ORDER.includes(f)),
  );
}

/**
 * Import selected hihi characters (idle + walk) into public/hihi/characters.
 * @param {Array<Record<string, unknown>>} selected
 */
export function importHihiCharacters(selected) {
  const all = loadPixellabCharacters();
  fs.mkdirSync(HIHI_CHARS_ROOT, {recursive: true});

  /** @type {object[]} */
  const characters = [];
  /** @type {string[]} */
  const imported = [];
  /** @type {string[]} */
  const warnings = [];

  for (const raw of selected) {
    if (!raw || typeof raw !== 'object') continue;
    const sel = {
      name: typeof raw.name === 'string' ? raw.name : undefined,
      title: typeof raw.title === 'string' ? raw.title : undefined,
      remoteId: typeof raw.remoteId === 'string' ? raw.remoteId : undefined,
      groupId: typeof raw.groupId === 'string' ? raw.groupId : undefined,
      gender: raw.gender === 'M' || raw.gender === 'F' ? raw.gender : undefined,
      enabled: raw.enabled !== false,
    };
    if (!sel.name && !sel.remoteId && !sel.groupId && !sel.title) continue;

    const {group, title} = resolveGroup(all, sel);
    if (!group.length) {
      warnings.push(`${sel.title || sel.name}: PixelLab 로컬에 없음`);
      continue;
    }

    const idle = pickState(group, isIdleState) || group[0];
    const walk = pickState(group, isWalkState);
    if (!walk) {
      warnings.push(`${title}: 걷기모션 없음 — idle만 복사`);
    }

    const gender =
      sel.gender ||
      (title.startsWith('남자:') ? 'M' : title.startsWith('여자:') ? 'F' : undefined);
    const slug = hihiSlugFromTitle(title);
    const charRoot = path.join(HIHI_CHARS_ROOT, slug);

    // Replace previous import for this slug
    if (fs.existsSync(charRoot)) {
      fs.rmSync(charRoot, {recursive: true, force: true});
    }

    const idleFrames = copyFrames(idle.name, path.join(charRoot, 'idle'), idle.frames);
    let walkFrames = idleFrames;
    if (walk) {
      walkFrames = copyFrames(walk.name, path.join(charRoot, 'walk'), walk.frames);
    } else {
      // fallback: duplicate idle as walk so game always has both actions
      walkFrames = copyFrames(idle.name, path.join(charRoot, 'walk'), idle.frames);
    }

    characters.push({
      name: slug,
      title,
      gender,
      groupId: idle.groupId || sel.groupId,
      remoteId: idle.remoteId,
      enabled: true,
      actions: {
        idle: idleFrames,
        walk: walkFrames,
      },
      sources: {
        idle: idle.name,
        walk: walk ? walk.name : idle.name,
      },
      previewFrame: idleFrames.includes('south') ? 'south' : idleFrames[0],
    });
    imported.push(slug);
  }

  // Remove orphan character dirs not in new catalog
  const keep = new Set(characters.map((c) => c.name));
  if (fs.existsSync(HIHI_CHARS_ROOT)) {
    for (const ent of fs.readdirSync(HIHI_CHARS_ROOT, {withFileTypes: true})) {
      if (!ent.isDirectory()) continue;
      if (!keep.has(ent.name)) {
        fs.rmSync(path.join(HIHI_CHARS_ROOT, ent.name), {recursive: true, force: true});
      }
    }
  }

  const payload = {version: 1, characters};
  fs.mkdirSync(HIHI_ROOT, {recursive: true});
  fs.writeFileSync(HIHI_CATALOG_PATH, `${JSON.stringify(payload, null, 2)}\n`);

  return {
    ok: true,
    localOnly: true,
    path: 'public/hihi/characters.catalog.json',
    count: characters.length,
    imported,
    warnings,
    characters,
  };
}
