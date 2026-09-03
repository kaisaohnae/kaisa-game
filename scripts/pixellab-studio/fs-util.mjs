import fs from 'node:fs';
import path from 'node:path';

const RETRY_CODES = new Set(['UNKNOWN', 'EPERM', 'EBUSY', 'EACCES', 'EAGAIN']);

function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* spin — keep sync API for callers */
  }
}

/**
 * Windows-safe JSON persist: write temp → rename/copy, with retries.
 * Never throws for common lock races (logs and returns false).
 * @param {string} filePath
 * @param {unknown} data
 * @returns {boolean}
 */
export function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, {recursive: true});
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );

  let lastErr = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      fs.writeFileSync(tmp, payload, 'utf8');
      try {
        fs.renameSync(tmp, filePath);
      } catch (renameErr) {
        // On Windows, rename over existing can fail — fall back to copy
        fs.copyFileSync(tmp, filePath);
        try {
          fs.unlinkSync(tmp);
        } catch {
          /* ignore */
        }
        if (renameErr && !RETRY_CODES.has(/** @type {NodeJS.ErrnoException} */ (renameErr).code ?? '')) {
          // rename failed for other reasons but copy succeeded
        }
      }
      return true;
    } catch (err) {
      lastErr = err;
      const code = /** @type {NodeJS.ErrnoException} */ (err).code;
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
      if (!RETRY_CODES.has(code ?? '')) break;
      sleepSync(30 + attempt * 40);
    }
  }

  console.warn(
    `[studio] persist failed ${filePath}:`,
    lastErr instanceof Error ? lastErr.message : String(lastErr),
  );
  return false;
}
