/**
 * Next build wrapper — studio UI is local-only by default.
 *
 *   npm run build              → excludes /studio from the static export
 *   npm run build:with-studio  → includes /studio (local inspection only)
 *   INCLUDE_STUDIO=true npm run build  → same as with-studio
 *
 * `npm run dev` always serves studio from the source tree (no gate).
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const STUDIO_SRC = path.join(ROOT, 'src', 'app', 'studio');
const STUDIO_HIDDEN = path.join(ROOT, '.studio-build-exclude', 'studio');
const HIDDEN_ROOT = path.join(ROOT, '.studio-build-exclude');
const STUDIO_OUT = path.join(ROOT, 'out', 'studio');

const withStudio =
  process.argv.includes('--with-studio') ||
  process.env.INCLUDE_STUDIO === 'true' ||
  process.env.INCLUDE_STUDIO === '1';

function ensureRestored() {
  if (fs.existsSync(STUDIO_HIDDEN) && !fs.existsSync(STUDIO_SRC)) {
    fs.mkdirSync(path.dirname(STUDIO_SRC), {recursive: true});
    fs.cpSync(STUDIO_HIDDEN, STUDIO_SRC, {recursive: true});
    fs.rmSync(STUDIO_HIDDEN, {recursive: true, force: true});
  }
  cleanupHiddenRoot();
}

function cleanupHiddenRoot() {
  if (!fs.existsSync(HIDDEN_ROOT)) return;
  try {
    const left = fs.readdirSync(HIDDEN_ROOT);
    if (left.length === 0) fs.rmdirSync(HIDDEN_ROOT);
  } catch {
    // ignore
  }
}

/** @returns {boolean} true if studio was moved aside */
function hideStudio() {
  ensureRestored();
  if (!fs.existsSync(STUDIO_SRC)) {
    console.warn('[studio-gate] src/app/studio missing — build continues without studio');
    return false;
  }
  fs.mkdirSync(HIDDEN_ROOT, {recursive: true});
  if (fs.existsSync(STUDIO_HIDDEN)) {
    fs.rmSync(STUDIO_HIDDEN, {recursive: true, force: true});
  }
  fs.cpSync(STUDIO_SRC, STUDIO_HIDDEN, {recursive: true});
  fs.rmSync(STUDIO_SRC, {recursive: true, force: true});
  console.log('[studio-gate] excluded src/app/studio from this build');
  return true;
}

function restoreStudio(wasHidden) {
  if (!wasHidden) {
    ensureRestored();
    return;
  }
  if (!fs.existsSync(STUDIO_HIDDEN)) {
    console.warn('[studio-gate] backup missing — cannot restore src/app/studio');
    return;
  }
  if (fs.existsSync(STUDIO_SRC)) {
    fs.rmSync(STUDIO_SRC, {recursive: true, force: true});
  }
  fs.mkdirSync(path.dirname(STUDIO_SRC), {recursive: true});
  fs.cpSync(STUDIO_HIDDEN, STUDIO_SRC, {recursive: true});
  fs.rmSync(STUDIO_HIDDEN, {recursive: true, force: true});
  cleanupHiddenRoot();
  console.log('[studio-gate] restored src/app/studio');
}

function stripStudioExport() {
  if (!fs.existsSync(STUDIO_OUT)) return;
  fs.rmSync(STUDIO_OUT, {recursive: true, force: true});
  console.log('[studio-gate] removed out/studio from static export');
}

ensureRestored();

let hidden = false;
if (!withStudio) {
  try {
    hidden = hideStudio();
  } catch (err) {
    console.warn(
      '[studio-gate] could not move studio aside — will strip out/studio after build:',
      err instanceof Error ? err.message : err,
    );
    hidden = false;
  }
} else {
  console.log('[studio-gate] INCLUDE_STUDIO — building with /studio routes');
}

const onSignal = () => {
  try {
    restoreStudio(hidden);
  } catch {
    // ignore
  }
  process.exit(1);
};
process.on('SIGINT', onSignal);
process.on('SIGTERM', onSignal);

let status = 1;
try {
  const result = spawnSync('npx', ['next', 'build'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      INCLUDE_STUDIO: withStudio ? 'true' : 'false',
    },
  });
  status = result.status ?? 1;
  if (status === 0 && !withStudio) {
    stripStudioExport();
  }
} finally {
  try {
    restoreStudio(hidden);
  } catch (err) {
    console.error(
      '[studio-gate] FAILED to restore src/app/studio — check .studio-build-exclude/',
      err instanceof Error ? err.message : err,
    );
  }
}

process.exit(status);
