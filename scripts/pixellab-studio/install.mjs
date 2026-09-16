import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DIR_MAP} from './manifest.mjs';
import {encodePng, OUT_SIZE, processPngBuffer, writeProcessedPng} from './png.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

export function projectPath(rel) {
  return path.join(ROOT, rel.replace(/\//g, path.sep));
}

export async function fetchBuffer(url, {retries = 4} = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const err = new Error(`download failed ${res.status} ${url}`);
        // CDN / gateway blips (esp. Backblaze 5xx) — retry
        if (res.status >= 500 && attempt < retries) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          lastErr = err;
          continue;
        }
        throw err;
      }
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastErr ?? new Error(`download failed ${url}`);
}

/**
 * @param {{ job: string, action: string }} target
 * @param {Record<string, string>} rotationUrls PixelLab keys: south, east, ...
 */
export async function installCharacterRotations(target, rotationUrls) {
  const outDir = projectPath(`src/games/todie/jobs/${target.job}/actions`);
  fs.mkdirSync(outDir, {recursive: true});

  for (const [dir, pixKey] of Object.entries(DIR_MAP)) {
    const url = rotationUrls[pixKey];
    if (!url) throw new Error(`missing rotation ${pixKey} for ${target.job}/${target.action}`);
    const buf = await fetchBuffer(url);
    const framePx = processPngBuffer(buf);
    const out = path.join(outDir, `${target.action}_${dir}.png`);
    fs.writeFileSync(out, encodePng(framePx, OUT_SIZE, OUT_SIZE));
  }

  fs.copyFileSync(
    path.join(outDir, `${target.action}_down.png`),
    path.join(outDir, `${target.action}.png`),
  );

  return outDir;
}

/** @param {string} relPath @param {Buffer} buf */
export function installRawPng(relPath, buf) {
  const out = projectPath(relPath);
  const norm = relPath.replace(/\\/g, '/');
  // tiles / obstacles / vehicles / planes / projectiles / items / mobs / objects / fx keep native size
  const keepRaw = /\/(tiles|obstacles|vehicles|planes|projectiles|items|mobs|objects|fx)\//.test(norm);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  if (keepRaw) {
    fs.writeFileSync(out, buf);
    return out;
  }
  writeProcessedPng(out, buf);
  return out;
}
