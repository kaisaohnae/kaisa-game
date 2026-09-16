/**
 * Next build wrapper — studio UI is local-only by default.
 *
 *   npm run build              → builds normally, then removes out/studio
 *   npm run build:with-studio  → keeps /studio in the static export
 *   INCLUDE_STUDIO=true …      → same as with-studio
 *
 * `npm run dev` always serves studio from the source tree.
 *
 * We intentionally keep src/app/studio during compile so Next route types
 * stay consistent with a running `next dev` (avoids LayoutRoutes mismatch).
 * Deploy artifact simply omits out/studio.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const NEXT_DIR = path.join(ROOT, '.next');
const STUDIO_SRC = path.join(ROOT, 'src', 'app', 'studio');
const STUDIO_HIDDEN = path.join(ROOT, '.studio-build-exclude', 'studio');
const HIDDEN_ROOT = path.join(ROOT, '.studio-build-exclude');
const STUDIO_OUT = path.join(ROOT, 'out', 'studio');

const withStudio =
  process.argv.includes('--with-studio') ||
  process.env.INCLUDE_STUDIO === 'true' ||
  process.env.INCLUDE_STUDIO === '1';

/** Heal a previous interrupted exclude-from-source build. */
function ensureStudioRestored() {
  if (fs.existsSync(STUDIO_HIDDEN) && !fs.existsSync(STUDIO_SRC)) {
    fs.mkdirSync(path.dirname(STUDIO_SRC), {recursive: true});
    fs.cpSync(STUDIO_HIDDEN, STUDIO_SRC, {recursive: true});
    fs.rmSync(STUDIO_HIDDEN, {recursive: true, force: true});
    console.log('[studio-gate] restored src/app/studio from .studio-build-exclude');
  }
  if (fs.existsSync(HIDDEN_ROOT)) {
    try {
      const left = fs.readdirSync(HIDDEN_ROOT);
      if (left.length === 0) fs.rmdirSync(HIDDEN_ROOT);
      else if (!fs.existsSync(STUDIO_SRC) && fs.existsSync(path.join(HIDDEN_ROOT, 'studio'))) {
        // already handled above
      } else {
        // leftover backup while studio exists — drop stale backup
        fs.rmSync(HIDDEN_ROOT, {recursive: true, force: true});
      }
    } catch {
      // ignore
    }
  }
}

function clearNextCache() {
  if (!fs.existsSync(NEXT_DIR)) return;
  fs.rmSync(NEXT_DIR, {recursive: true, force: true});
  console.log('[studio-gate] cleared .next (avoids dev/prod route type clash)');
}

function stripStudioExport() {
  if (!fs.existsSync(STUDIO_OUT)) {
    console.log('[studio-gate] out/studio already absent');
    return;
  }
  fs.rmSync(STUDIO_OUT, {recursive: true, force: true});
  console.log('[studio-gate] removed out/studio from static export');
}

ensureStudioRestored();
clearNextCache();

if (withStudio) {
  console.log('[studio-gate] INCLUDE_STUDIO — keeping /studio in export');
} else {
  console.log('[studio-gate] production export will omit /studio');
}

const result = spawnSync('npx', ['next', 'build'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    INCLUDE_STUDIO: withStudio ? 'true' : 'false',
  },
});

const status = result.status ?? 1;
if (status === 0 && !withStudio) {
  stripStudioExport();
}

process.exit(status);
