import {displaySettings} from '../content/settings';
import type {ActionId, JobId} from '../content/types';
import {facingToCardinal, type LoadedImages} from '../content/jobAssets';
import type {Equipment} from '../content/equip';

const char = displaySettings.character;
const skillFx = displaySettings.skillFx;

export type AttackSwing = {
  /** 1 → 0 over the swing */
  t: number;
  kind: 'slash' | 'spin' | 'bash' | 'bolt' | 'nova' | 'shield' | string;
};

function applyPixelScale(ctx: CanvasRenderingContext2D) {
  // CraftPix-style: crisp pixels
  ctx.imageSmoothingEnabled = char.imageSmoothing === true;
}

export function drawJobCharacter(
  ctx: CanvasRenderingContext2D,
  images: LoadedImages | null,
  job: JobId,
  action: ActionId,
  x: number,
  y: number,
  facing: number,
  rollingSpin = false,
  _equipped?: Equipment | null,
  _gearImages?: Record<string, HTMLImageElement> | null,
  _attackSwing?: AttackSwing | null,
) {
  const size = char.worldSize;
  const dir = facingToCardinal(facing);
  const img =
    images?.actions[action]?.[dir] ??
    images?.actions.idle?.[dir] ??
    images?.actions.idle?.down;
  const ox = -size * char.anchorX;
  const oy = -size * char.anchorY;

  ctx.save();
  applyPixelScale(ctx);
  ctx.translate(x, y);

  // ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.28, size * 0.26, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4-dir sprites — do NOT continuous-rotate
  if (rollingSpin) {
    ctx.rotate(performance.now() / 45);
  }

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, ox, oy, size, size);
  } else {
    ctx.fillStyle = job === 'warrior' ? '#ff8a65' : '#7e57c2';
    ctx.fillRect(-14, -18, 28, 36);
  }

  ctx.restore();
}

export function drawJobPreview(
  ctx: CanvasRenderingContext2D,
  images: LoadedImages | null,
  job: JobId,
  w: number,
  h: number,
  _equipped?: Equipment | null,
  _gearImages?: Record<string, HTMLImageElement> | null,
) {
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w * 0.45, h * 0.35, 8, w * 0.5, h * 0.55, w * 0.75);
  g.addColorStop(0, '#2a241c');
  g.addColorStop(0.55, '#161310');
  g.addColorStop(1, '#0a0908');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  applyPixelScale(ctx);
  const img = images?.actions.idle?.down;
  const size = Math.min(w, h) * 0.88;
  const ox = (w - size) / 2;
  const oy = (h - size) / 2;
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, ox, oy, size, size);
  } else {
    ctx.fillStyle = job === 'warrior' ? '#ff8a65' : '#7e57c2';
    ctx.fillRect(w / 2 - 20, h / 2 - 10, 40, 44);
  }
}

export function drawSkillSprite(
  ctx: CanvasRenderingContext2D,
  images: LoadedImages | null,
  skillId: string,
  x: number,
  y: number,
  alpha = 1,
  size = skillFx.size,
  facing?: number,
) {
  const img = images?.skills[skillId];
  if (!img || !img.complete || img.naturalWidth <= 0) return;
  ctx.save();
  applyPixelScale(ctx);
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (facing != null && Number.isFinite(facing)) {
    ctx.rotate(facing + Math.PI / 2);
  }
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
}
