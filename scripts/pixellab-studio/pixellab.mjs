const BASE = 'https://api.pixellab.ai/v2';

export class PixelLabClient {
  /** @param {string} apiKey */
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /** @param {string} path @param {RequestInit} [init] */
  async request(path, init = {}) {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = {raw: text};
    }
    if (!res.ok) {
      const msg = data?.detail ?? data?.message ?? text ?? res.statusText;
      throw new Error(`PixelLab ${res.status}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    }
    return data;
  }

  getBalance() {
    return this.request('/balance');
  }

  listCharacters(limit = 50) {
    return this.request(`/characters?limit=${limit}`);
  }

  /** @param {string} id */
  getCharacter(id) {
    return this.request(`/characters/${id}`);
  }

  /** @param {string} jobId */
  getBackgroundJob(jobId) {
    return this.request(`/background-jobs/${jobId}`);
  }

  /** @param {object} body */
  createPixflux(body) {
    return this.request('/create-image-pixflux', {
      method: 'POST',
      body: JSON.stringify({
        no_background: true,
        ...body,
      }),
    });
  }

  /** @param {object} body */
  createCharacter8Dir(body) {
    return this.request('/create-character-with-8-directions', {
      method: 'POST',
      body: JSON.stringify({
        view: 'low top-down',
        template_id: 'mannequin',
        image_size: {width: 80, height: 80},
        ...body,
      }),
    });
  }

  /** @param {object} body */
  createCharacterState(body) {
    return this.request('/create-character-state', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /** @param {string} jobId @param {{ intervalMs?: number, timeoutMs?: number, onTick?: (j: object) => void }} [opts] */
  async waitBackgroundJob(jobId, opts = {}) {
    const intervalMs = opts.intervalMs ?? 4000;
    const timeoutMs = opts.timeoutMs ?? 600_000;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const job = await this.getBackgroundJob(jobId);
      opts.onTick?.(job);

      const lr = job.last_response;
      const lrStatus = lr?.status ?? lr?.done;
      const images = lr?.images ?? lr?.image ?? null;
      const hasImages = Array.isArray(images) ? images.length > 0 : Boolean(images);

      if (job.status === 'failed' || lrStatus === 'failed') {
        throw new Error(job.error ?? lr?.error ?? 'PixelLab job failed');
      }

      if (job.status === 'completed' || lrStatus === 'completed' || lrStatus === 'done' || hasImages) {
        return job;
      }

      await sleep(intervalMs);
    }
    throw new Error(`PixelLab job timeout: ${jobId}`);
  }

  /** @param {string} characterId @param {{ intervalMs?: number, timeoutMs?: number, onTick?: (c: object) => void }} [opts] */
  async waitCharacter(characterId, opts = {}) {
    const intervalMs = opts.intervalMs ?? 4000;
    const timeoutMs = opts.timeoutMs ?? 600_000;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const ch = await this.getCharacter(characterId);
      opts.onTick?.(ch);
      if (ch.status === 'completed' && ch.rotation_urls) return ch;
      if (ch.status === 'failed') throw new Error(`Character ${characterId} failed`);
      await sleep(intervalMs);
    }
    throw new Error(`Character timeout: ${characterId}`);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** @param {object} job */
export function extractPixfluxImage(job) {
  const images = job.last_response?.images ?? job.last_response?.image;
  if (!images) return null;
  const first = Array.isArray(images) ? images[0] : images;
  if (!first) return null;
  if (typeof first === 'string') return first;
  if (first.url) return first.url;
  if (first.base64) return `data:image/png;base64,${first.base64}`;
  if (first.type === 'base64' && first.base64) return `data:image/png;base64,${first.base64}`;
  return null;
}

/** @param {string} src */
export async function loadImageSource(src) {
  if (src.startsWith('data:')) {
    const b64 = src.split(',')[1];
    return Buffer.from(b64, 'base64');
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error(`fetch image ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
