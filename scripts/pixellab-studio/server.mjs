/**
 * Local PixelLab Asset Studio server.
 * Binds 127.0.0.1 only — API key stays server-side in .env.local
 *
 * Run: npm run studio
 * UI:  npm run dev  →  http://localhost:5555/studio/
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MANIFEST, manifestForApi} from './manifest.mjs';
import {PixelLabClient} from './pixellab.mjs';
import {
  ensurePromptDefaults,
  getDefaultDescription,
  getEffectiveDescription,
  promptsForApi,
  setPrompt,
} from './prompts.mjs';
import {loadCatalog, listPendingLibrary, syncLibrary} from './library-sync.mjs';
import {StudioRunner} from './runner.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

loadEnvLocal();
ensurePromptDefaults();

const PORT = Number(process.env.STUDIO_PORT ?? 8890);
const SECRET =
  process.env.STUDIO_SECRET ?? process.env.NEXT_PUBLIC_STUDIO_SECRET ?? 'dev-secret';
const API_KEY = process.env.PIXELLAB_API_KEY ?? '';

/** @type {PixelLabClient | null} */
let client = API_KEY ? new PixelLabClient(API_KEY) : null;

/** @type {StudioRunner | null} */
let runner = client ? new StudioRunner(client, broadcast) : null;

/** @type {Set<import('node:http').ServerResponse>} */
const sseClients = new Set();

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);

  if (url.pathname === '/api/events' && req.method === 'GET') {
    if (!auth(req)) return unauthorized(res);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  try {
    if (url.pathname === '/api/health' && req.method === 'GET') {
      return json(res, {
        ok: true,
        hasApiKey: Boolean(API_KEY),
        port: PORT,
      });
    }

    if (!auth(req)) return unauthorized(res);

    if (url.pathname === '/api/balance' && req.method === 'GET') {
      assertClient();
      const balance = await client.getBalance();
      return json(res, balance);
    }

    if (url.pathname === '/api/manifest' && req.method === 'GET') {
      const items = manifestForApi().map((item) => {
        const description = getEffectiveDescription({
          id: item.id,
          description: item.defaultDescription,
        });
        return {
          ...item,
          description,
          edited: description !== (item.defaultDescription ?? ''),
        };
      });
      const byDesc = new Map(items.map((i) => [i.id, i]));
      const queue = runner
        ? runner.snapshot().map((row) => ({
            ...row,
            description: byDesc.get(row.id)?.description ?? row.description,
            defaultDescription: byDesc.get(row.id)?.defaultDescription ?? '',
            edited: byDesc.get(row.id)?.edited ?? false,
            previewUrl: byDesc.get(row.id)?.previewUrl,
          }))
        : MANIFEST.map((item) => ({
            ...item,
            description: byDesc.get(item.id)?.description ?? item.description,
            defaultDescription: byDesc.get(item.id)?.defaultDescription ?? '',
            edited: byDesc.get(item.id)?.edited ?? false,
            previewUrl: byDesc.get(item.id)?.previewUrl,
            queue: {id: item.id, status: 'pending'},
          }));
      return json(res, {
        items,
        queue,
        running: Boolean(runner?.running),
      });
    }

    if (url.pathname === '/api/prompts' && req.method === 'GET') {
      return json(res, {prompts: promptsForApi()});
    }

    if (url.pathname === '/api/prompts' && req.method === 'POST') {
      const body = await readJson(req);
      const id = body?.id;
      const description = body?.description;
      if (typeof id !== 'string' || typeof description !== 'string') {
        return json(res, {error: 'id and description required'}, 400);
      }
      const saved = setPrompt(id, description);
      return json(res, {
        ok: true,
        id,
        description: saved.prompts[id],
        defaultDescription: getDefaultDescription(id),
        path: '.pixellab-studio/prompts.json',
      });
    }

    if (url.pathname === '/api/characters' && req.method === 'GET') {
      assertClient();
      const data = await client.listCharacters(30);
      return json(res, data);
    }

    if (url.pathname === '/api/pixellab/library' && req.method === 'GET') {
      return json(res, loadCatalog());
    }

    if (url.pathname === '/api/pixellab/library/pending' && req.method === 'GET') {
      assertClient();
      const pending = await listPendingLibrary(client);
      const total =
        (pending.objects?.length ?? 0) +
        (pending.tiles?.length ?? 0) +
        (pending.characters?.length ?? 0);
      return json(res, {pending, total});
    }

    if (url.pathname === '/api/pixellab/library/sync' && req.method === 'POST') {
      assertClient();
      const body = await readJson(req);
      const mode = body?.mode === 'resync' ? 'resync' : 'new';
      const names = Array.isArray(body?.names) ? body.names : undefined;
      const logs = [];
      const result = await syncLibrary(client, {
        mode,
        names,
        onProgress: (msg) => logs.push(msg),
      });
      return json(res, {...result, logs});
    }

    if (url.pathname === '/api/queue/run' && req.method === 'POST') {
      assertRunner();
      const body = await readJson(req);
      const ids = body.ids;
      if (!Array.isArray(ids) || !ids.length) {
        return json(res, {error: 'ids required'}, 400);
      }
      runner.enqueue(ids);
      return json(res, {ok: true, queue: runner.snapshot()});
    }

    if (url.pathname === '/api/queue' && req.method === 'GET') {
      assertRunner();
      return json(res, {queue: runner.snapshot(), running: runner.running});
    }

    if (url.pathname === '/api/config' && req.method === 'POST') {
      const body = await readJson(req);
      if (body.apiKey && typeof body.apiKey === 'string') {
        persistApiKey(body.apiKey.trim());
        client = new PixelLabClient(body.apiKey.trim());
        runner = new StudioRunner(client, broadcast);
        return json(res, {ok: true, hasApiKey: true});
      }
      return json(res, {error: 'apiKey required'}, 400);
    }

    if (url.pathname === '/api/todie-maps' && req.method === 'GET') {
      const dir = path.join(ROOT, 'public', 'todie', 'map');
      fs.mkdirSync(dir, {recursive: true});
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
      const maps = files.map((f) => {
        const id = f.slice(0, -5);
        let name = id;
        let cols = 0;
        let rows = 0;
        let updatedAt = 0;
        try {
          const stat = fs.statSync(path.join(dir, f));
          updatedAt = stat.mtimeMs;
          const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
          if (typeof data.name === 'string') name = data.name;
          cols = Number(data.cols) || 0;
          rows = Number(data.rows) || 0;
        } catch {
          // ignore unreadable/corrupt map file, still list it by id
        }
        return {id, name, cols, rows, updatedAt};
      });
      maps.sort((a, b) => {
        const rank = (id) => (id === 'stage1' ? 0 : id === 'stage2' ? 1 : id === 'stage3' ? 2 : 10);
        const d = rank(a.id) - rank(b.id);
        return d !== 0 ? d : a.id.localeCompare(b.id);
      });
      return json(res, {maps});
    }

    if (url.pathname === '/api/todie-map' && req.method === 'GET') {
      const id = sanitizeMapId(url.searchParams.get('id'));
      if (!id) return json(res, {error: 'invalid map id'}, 400);
      const mapPath = path.join(ROOT, 'public', 'todie', 'map', `${id}.json`);
      if (!fs.existsSync(mapPath)) {
        return json(res, {error: `${id}.json missing`}, 404);
      }
      const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
      return json(res, map);
    }

    if (url.pathname === '/api/todie-map' && req.method === 'POST') {
      const body = await readJson(req);
      if (!body || body.version !== 1 || !Array.isArray(body.cells) || !Array.isArray(body.palette)) {
        return json(res, {error: 'invalid map payload'}, 400);
      }
      const id = sanitizeMapId(body.id ?? url.searchParams.get('id') ?? 'stage1');
      if (!id) return json(res, {error: 'invalid map id'}, 400);
      const cols = Number(body.cols) || 100;
      const rows = Number(body.rows) || 100;
      if (body.cells.length !== cols * rows) {
        return json(res, {error: `cells length must be ${cols * rows}`}, 400);
      }
      const dir = path.join(ROOT, 'public', 'todie', 'map');
      fs.mkdirSync(dir, {recursive: true});
      const mapPath = path.join(dir, `${id}.json`);
      const objects = Array.isArray(body.objects) ? body.objects : [];
      const payload = {
        version: 1,
        name: typeof body.name === 'string' ? body.name : id,
        worldSize: Number(body.worldSize) || 10000,
        tileSize: Number(body.tileSize) || 100,
        cols,
        rows,
        palette: body.palette,
        cells: body.cells,
        objects,
        nextObjectId: Number(body.nextObjectId) || objects.length + 1,
      };
      fs.writeFileSync(mapPath, JSON.stringify(payload));
      return json(res, {
        ok: true,
        localOnly: true,
        id,
        path: `public/todie/map/${id}.json`,
        cells: payload.cells.length,
        objects: objects.length,
      });
    }

    if (url.pathname === '/api/todie-map' && req.method === 'DELETE') {
      const id = sanitizeMapId(url.searchParams.get('id'));
      if (!id || id === 'stage1') return json(res, {error: 'cannot delete this map'}, 400);
      const mapPath = path.join(ROOT, 'public', 'todie', 'map', `${id}.json`);
      if (fs.existsSync(mapPath)) fs.unlinkSync(mapPath);
      return json(res, {ok: true, id});
    }

    return json(res, {error: 'not found'}, 404);
  } catch (err) {
    return json(res, {error: err instanceof Error ? err.message : String(err)}, 500);
  }
});

startServer().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

/**
 * Kill whatever is LISTENING on our studio port, then bind.
 * Retries a few times so Windows can release the socket after taskkill.
 */
async function startServer() {
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const killed = freePort(PORT);
    if (killed) await sleep(400);

    try {
      await listenOnce();
      console.log(`PixelLab Studio → http://127.0.0.1:${PORT}`);
      console.log(`Open UI       → http://localhost:5555/studio/`);
      console.log(`Map editor    → http://localhost:5555/studio/map/`);
      if (!API_KEY) {
        console.log('PIXELLAB_API_KEY missing — paste key in /studio/ settings');
      }
      return;
    } catch (err) {
      const busy =
        err && typeof err === 'object' && 'code' in err && err.code === 'EADDRINUSE';
      if (!busy || attempt === maxAttempts) throw err;
      console.warn(`Port ${PORT} busy — killing occupant (attempt ${attempt}/${maxAttempts})…`);
      freePort(PORT);
      await sleep(500 + attempt * 200);
    }
  }
}

/** @returns {Promise<void>} */
function listenOnce() {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.off('listening', onListening);
      reject(err);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(PORT, '127.0.0.1');
  });
}

/** @param {number} ms */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Force-kill processes LISTENING on `port` (not ourselves).
 * @param {number} port
 * @returns {boolean} true if at least one PID was targeted
 */
function freePort(port) {
  const pids = listeningPids(port).filter((pid) => pid !== process.pid);
  if (!pids.length) return false;
  for (const pid of pids) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /PID ${pid} /F`, {stdio: 'ignore'});
      } else {
        process.kill(pid, 'SIGKILL');
      }
      console.log(`Killed PID ${pid} on port ${port}`);
    } catch (e) {
      console.warn(`Could not kill PID ${pid}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return true;
}

/** @param {number} port @returns {number[]} */
function listeningPids(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync('netstat -ano -p tcp', {encoding: 'utf8'});
      const found = new Set();
      for (const line of out.split(/\r?\n/)) {
        if (!/\bLISTENING\b/i.test(line)) continue;
        // e.g. TCP    127.0.0.1:8890    0.0.0.0:0    LISTENING    12345
        const m = line.match(new RegExp(`:${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`, 'i'));
        if (m) found.add(Number(m[1]));
      }
      return [...found].filter((n) => Number.isFinite(n) && n > 0);
    }

    try {
      const out = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, {encoding: 'utf8'}).trim();
      if (!out) return [];
      return out
        .split(/\s+/)
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0);
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

function loadEnvLocal() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

function persistApiKey(key) {
  const envPath = path.join(ROOT, '.env.local');
  let lines = [];
  if (fs.existsSync(envPath)) lines = fs.readFileSync(envPath, 'utf8').split('\n');
  let found = false;
  lines = lines.map((line) => {
    if (line.startsWith('PIXELLAB_API_KEY=')) {
      found = true;
      return `PIXELLAB_API_KEY=${key}`;
    }
    return line;
  });
  if (!found) lines.push(`PIXELLAB_API_KEY=${key}`);
  fs.writeFileSync(envPath, lines.filter((l, i, a) => !(i === a.length - 1 && l === '')).join('\n') + '\n');
  process.env.PIXELLAB_API_KEY = key;
}

function assertClient() {
  if (!client) throw new Error('PIXELLAB_API_KEY not configured');
}

function assertRunner() {
  if (!runner) throw new Error('PIXELLAB_API_KEY not configured');
}

/** @param {string | null} id */
function sanitizeMapId(id) {
  if (typeof id !== 'string') return '';
  const trimmed = id.trim();
  if (!trimmed || !/^[a-zA-Z0-9_-]{1,64}$/.test(trimmed)) return '';
  return trimmed;
}

/** @param {import('node:http').IncomingMessage} req */
function auth(req) {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
  const h = req.headers['x-studio-secret'] ?? url.searchParams.get('secret');
  return h === SECRET;
}

/** @param {import('node:http').IncomingMessage} req */
function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

/** @param {import('node:http').ServerResponse} res */
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Studio-Secret');
}

/** @param {import('node:http').ServerResponse} res */
function unauthorized(res) {
  json(res, {error: 'unauthorized — set X-Studio-Secret header'}, 401);
}

/** @param {import('node:http').ServerResponse} res @param {unknown} data @param {number} [code] */
function json(res, data, code = 200) {
  res.writeHead(code, {'Content-Type': 'application/json; charset=utf-8'});
  res.end(JSON.stringify(data));
}

/** @param {object} entry */
function broadcast(entry) {
  const payload = `data: ${JSON.stringify(entry)}\n\n`;
  for (const c of sseClients) {
    try {
      c.write(payload);
    } catch {
      sseClients.delete(c);
    }
  }
}
