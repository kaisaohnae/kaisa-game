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

export async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
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
  // tiles / obstacles / vehicles / mobs / objects keep native PixelLab size (no 256 square pad)
  const keepRaw = /\/(tiles|obstacles|vehicles|mobs|objects)\//.test(norm);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  if (keepRaw) {
    fs.writeFileSync(out, buf);
    return out;
  }
  writeProcessedPng(out, buf);
  return out;
}
