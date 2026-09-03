/**
 * Editable generation prompts — overrides stored in .pixellab-studio/prompts.json
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MANIFEST} from './manifest.mjs';
import {writeJsonAtomic} from './fs-util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.pixellab-studio');
const PROMPTS_FILE = path.join(STATE_DIR, 'prompts.json');

/** @returns {Record<string, string>} */
export function loadPromptOverrides() {
  try {
    if (!fs.existsSync(PROMPTS_FILE)) return {};
    const data = JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf8'));
    return data && typeof data === 'object' && data.prompts && typeof data.prompts === 'object'
      ? data.prompts
      : {};
  } catch {
    return {};
  }
}

/** @param {Record<string, string>} prompts */
export function savePromptOverrides(prompts) {
  fs.mkdirSync(STATE_DIR, {recursive: true});
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    prompts,
  };
  writeJsonAtomic(PROMPTS_FILE, payload);
  return payload;
}

/**
 * Seed defaults for any missing ids (keeps existing overrides).
 * @returns {Record<string, string>}
 */
export function ensurePromptDefaults() {
  const current = loadPromptOverrides();
  let changed = false;
  for (const item of MANIFEST) {
    if (!item.description) continue;
    if (current[item.id] == null) {
      current[item.id] = item.description;
      changed = true;
    }
  }
  if (changed || !fs.existsSync(PROMPTS_FILE)) {
    savePromptOverrides(current);
  }
  return current;
}

/** @param {string} id */
export function getDefaultDescription(id) {
  return MANIFEST.find((m) => m.id === id)?.description ?? '';
}

/** @param {{ id: string, description?: string }} item */
export function getEffectiveDescription(item) {
  const overrides = loadPromptOverrides();
  if (overrides[item.id] != null && overrides[item.id] !== '') {
    return overrides[item.id];
  }
  return item.description ?? '';
}

/**
 * @param {string} id
 * @param {string} description
 */
export function setPrompt(id, description) {
  if (!MANIFEST.some((m) => m.id === id)) {
    throw new Error(`unknown manifest id: ${id}`);
  }
  const prompts = ensurePromptDefaults();
  prompts[id] = String(description ?? '');
  return savePromptOverrides(prompts);
}

export function promptsForApi() {
  const overrides = ensurePromptDefaults();
  return MANIFEST.filter((m) => m.description != null).map((m) => ({
    id: m.id,
    defaultDescription: m.description,
    description: overrides[m.id] ?? m.description,
    edited: overrides[m.id] != null && overrides[m.id] !== m.description,
  }));
}
