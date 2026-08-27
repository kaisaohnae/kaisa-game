/**
 * Local PixelLab Asset Studio server.
 * Binds 127.0.0.1 only — API key stays server-side in .env.local
 *
 * Run: npm run studio
 * UI:  npm run dev  →  http://localhost:8887/studio/
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {manifestForApi} from './manifest.mjs';
import {PixelLabClient} from './pixellab.mjs';
import {StudioRunner} from './runner.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

loadEnvLocal();

const PORT = Number(process.env.STUDIO_PORT ?? 8890);
const SECRET = process.env.STUDIO_SECRET ?? 'dev-secret';
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
      assertRunner();
      return json(res, {
        items: manifestForApi(),
        queue: runner.snapshot(),
        running: runner.running,
      });
    }

    if (url.pathname === '/api/characters' && req.method === 'GET') {
      assertClient();
      const data = await client.listCharacters(30);
      return json(res, data);
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

    if (url.pathname === '/api/queue/run-defaults' && req.method === 'POST') {
      assertRunner();
      const defaults = manifestForApi()
        .filter((i) => i.selectedByDefault)
        .map((i) => i.id);
      runner.enqueue(defaults);
      return json(res, {ok: true, ids: defaults, queue: runner.snapshot()});
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

    return json(res, {error: 'not found'}, 404);
  } catch (err) {
    return json(res, {error: err instanceof Error ? err.message : String(err)}, 500);
  }
});

server.on('error', (err) => {
  if (err && typeof err === 'object' && 'code' in err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use (studio may already be running).`);
    console.error(`Open http://127.0.0.1:${PORT}/api/health or stop the other process:`);
    console.error(`  netstat -ano | findstr :${PORT}`);
    console.error(`  taskkill /PID <pid> /F`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`PixelLab Studio → http://127.0.0.1:${PORT}`);
  console.log(`Open UI       → http://localhost:8887/studio/`);
  if (!API_KEY) {
    console.log('PIXELLAB_API_KEY missing — paste key in /studio/ settings');
  }
});

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
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
