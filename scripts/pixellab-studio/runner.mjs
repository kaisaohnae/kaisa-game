import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MANIFEST} from './manifest.mjs';
import {installCharacterRotations, installRawPng} from './install.mjs';
import {extractPixfluxImage, loadImageSource, PixelLabClient} from './pixellab.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_DIR = path.join(__dirname, '..', '..', '.pixellab-studio');
const STATE_FILE = path.join(STATE_DIR, 'queue.json');

/** @typedef {'pending' | 'running' | 'completed' | 'failed' | 'skipped'} RunStatus */

/**
 * @typedef {object} QueueEntry
 * @property {string} id
 * @property {RunStatus} status
 * @property {string} [message]
 * @property {string} [updatedAt]
 * @property {string} [outputPath]
 */

export class StudioRunner {
  /** @param {PixelLabClient} client @param {(entry: QueueEntry) => void} [onUpdate] */
  constructor(client, onUpdate) {
    this.client = client;
    this.onUpdate = onUpdate ?? (() => {});
    /** @type {Map<string, QueueEntry>} */
    this.queue = new Map();
    this.running = false;
    this.loadState();
  }

  loadState() {
    fs.mkdirSync(STATE_DIR, {recursive: true});
    if (!fs.existsSync(STATE_FILE)) return;
    try {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      for (const e of saved.entries ?? []) {
        if (e.status === 'running') e.status = 'pending';
        this.queue.set(e.id, e);
      }
    } catch {
      /* ignore corrupt state */
    }
  }

  saveState() {
    fs.mkdirSync(STATE_DIR, {recursive: true});
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({entries: [...this.queue.values()]}, null, 2),
    );
  }

  /** @param {string} id @param {Partial<QueueEntry>} patch */
  patch(id, patch) {
    const prev = this.queue.get(id) ?? {id, status: 'pending'};
    const next = {...prev, ...patch, id, updatedAt: new Date().toISOString()};
    this.queue.set(id, next);
    this.saveState();
    this.onUpdate(next);
    return next;
  }

  snapshot() {
    return MANIFEST.map((item) => {
      const q = this.queue.get(item.id);
      return {
        ...item,
        queue: q ?? {id: item.id, status: 'pending'},
      };
    });
  }

  /** @param {string[]} ids */
  enqueue(ids) {
    for (const id of ids) {
      if (!MANIFEST.find((m) => m.id === id)) continue;
      const cur = this.queue.get(id);
      if (cur?.status === 'running') continue;
      this.patch(id, {status: 'pending', message: 'queued'});
    }
    void this.pump();
  }

  async pump() {
    if (this.running) return;
    this.running = true;
    try {
      while (true) {
        const next = [...this.queue.values()].find((e) => e.status === 'pending');
        if (!next) break;
        const item = MANIFEST.find((m) => m.id === next.id);
        if (!item) {
          this.patch(next.id, {status: 'failed', message: 'manifest missing'});
          continue;
        }
        this.patch(next.id, {status: 'running', message: 'started'});
        try {
          const out = await this.runItem(item);
          this.patch(next.id, {
            status: 'completed',
            message: 'installed',
            outputPath: out,
          });
        } catch (err) {
          this.patch(next.id, {
            status: 'failed',
            message: err instanceof Error ? err.message : String(err),
          });
        }
        await sleep(1200);
      }
    } finally {
      this.running = false;
    }
  }

  /** @param {import('./manifest.mjs').ManifestItem} item */
  async runItem(item) {
    if (item.type === 'sync_character') {
      const ch = await this.client.getCharacter(item.characterId);
      if (!ch.rotation_urls) {
        const ready = await this.client.waitCharacter(item.characterId, {
          onTick: (c) => {
            this.patch(item.id, {message: `character ${c.status}`});
          },
        });
        return installCharacterRotations(item.characterInstall, ready.rotation_urls);
      }
      return installCharacterRotations(item.characterInstall, ch.rotation_urls);
    }

    if (item.type === 'pixflux') {
      const created = await this.client.createPixflux({
        description: item.description,
        image_size: item.imageSize,
      });
      const jobId = created.background_job_id ?? created.job_id;
      if (!jobId) throw new Error('no background_job_id from pixflux');
      this.patch(item.id, {message: `job ${jobId}`});
      const done = await this.client.waitBackgroundJob(jobId, {
        onTick: (j) => this.patch(item.id, {message: `pixflux ${j.status}`}),
      });
      const src = extractPixfluxImage(done);
      if (!src) throw new Error('pixflux returned no image');
      const buf = await loadImageSource(src);
      return installRawPng(item.fileInstall.path, buf);
    }

    if (item.type === 'generate_character') {
      const created = await this.client.createCharacter8Dir({
        description: item.description,
        image_size: item.imageSize ?? {width: 80, height: 80},
      });
      const characterId = created.character_id ?? created.id;
      const jobId = created.background_job_id;
      if (jobId) {
        await this.client.waitBackgroundJob(jobId, {
          onTick: (j) => this.patch(item.id, {message: `char job ${j.status}`}),
        });
      }
      const ready = await this.client.waitCharacter(characterId, {
        onTick: (c) => this.patch(item.id, {message: `character ${c.status}`}),
      });
      return installCharacterRotations(item.characterInstall, ready.rotation_urls);
    }

    if (item.type === 'generate_character_state') {
      const created = await this.client.createCharacterState({
        character_id: item.baseCharacterId,
        state_name: item.stateName,
        description: item.description,
      });
      const characterId = created.character_id ?? created.id;
      const jobId = created.background_job_id;
      if (jobId) {
        await this.client.waitBackgroundJob(jobId, {
          onTick: (j) => this.patch(item.id, {message: `state job ${j.status}`}),
        });
      }
      const ready = await this.client.waitCharacter(characterId, {
        onTick: (c) => this.patch(item.id, {message: `state ${c.status}`}),
      });
      return installCharacterRotations(item.characterInstall, ready.rotation_urls);
    }

    throw new Error(`unsupported type ${item.type}`);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
