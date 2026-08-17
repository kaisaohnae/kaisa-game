/**
 * todie field BGM — loops a real track (not procedural beeps).
 *
 * Track: "The Little Big Adventure!" by HitCtrl
 * Source: https://opengameart.org/content/the-little-big-adventure
 * License: CC-BY 3.0 — attribution required (see CREDITS.txt next to the ogg).
 *
 * Mute preference: localStorage key `todie_bgm_muted`.
 */

const MUTE_KEY = 'todie_bgm_muted';
const MASTER_VOL = 0.38;
const BGM_SRC = '/todie/audio/adventure.ogg';

export function readBgmMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeBgmMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export type TodieBgm = {
  unlock: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
  dispose: () => void;
};

export function createTodieBgm(opts?: {volume?: number; muted?: boolean}): TodieBgm {
  const volume = opts?.volume ?? MASTER_VOL;
  let muted = opts?.muted ?? readBgmMuted();
  let audio: HTMLAudioElement | null = null;
  let wantPlay = false;
  let paused = false;
  let unlockToken = 0;

  const ensureAudio = () => {
    if (audio) return audio;
    const a = new Audio(BGM_SRC);
    a.loop = true;
    a.preload = 'auto';
    a.volume = volume;
    audio = a;
    return a;
  };

  const applyVolume = () => {
    if (!audio) return;
    audio.volume = volume;
  };

  const tryPlay = async () => {
    const a = ensureAudio();
    a.muted = false;
    applyVolume();
    if (muted || paused || !wantPlay) return;
    try {
      await a.play();
    } catch {
      /* autoplay blocked until next gesture */
    }
  };

  const unlock = async () => {
    const a = ensureAudio();
    const token = ++unlockToken;
    applyVolume();
    try {
      // Gesture unlock only — never clobber an in-progress start().
      a.muted = true;
      await a.play();
      if (token !== unlockToken || wantPlay) {
        a.muted = false;
        if (wantPlay && !paused && !muted) {
          await a.play().catch(() => undefined);
        }
        return;
      }
      a.pause();
      a.currentTime = 0;
      a.muted = false;
    } catch {
      /* ignore — start() will retry */
    }
  };

  const start = async () => {
    unlockToken += 1; // invalidate in-flight unlock pause
    wantPlay = true;
    paused = false;
    await tryPlay();
  };

  const stop = () => {
    wantPlay = false;
    paused = false;
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }
  };

  const pause = () => {
    paused = true;
    if (audio && !audio.paused) {
      try {
        audio.pause();
      } catch {
        /* ignore */
      }
    }
  };

  const resume = () => {
    paused = false;
    if (!wantPlay) {
      void start();
      return;
    }
    void tryPlay();
  };

  const setMuted = (next: boolean) => {
    muted = next;
    writeBgmMuted(next);
    if (muted) {
      if (audio && !audio.paused) {
        try {
          audio.pause();
        } catch {
          /* ignore */
        }
      }
      return;
    }
    void tryPlay();
  };

  const dispose = () => {
    wantPlay = false;
    if (audio) {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch {
        /* ignore */
      }
      audio = null;
    }
  };

  return {
    unlock,
    start,
    stop,
    pause,
    resume,
    setMuted,
    isMuted: () => muted,
    dispose,
  };
}
