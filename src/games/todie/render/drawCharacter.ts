import {displaySettings} from '../content/settings';
import type {ActionId, JobId} from '../content/types';
import {facingToCardinal, type LoadedImages} from '../content/jobAssets';
import {EQUIP_SLOTS, type Equipment} from '../content/equip';

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

/** Equipped mythic piece count (0..slot count). */
export function countMythicEquipped(equipped?: Equipment | null): number {
  if (!equipped) return 0;
  let n = 0;
  for (const s of EQUIP_SLOTS) {
    if (equipped[s.id]?.tier === 'mythic') n += 1;
  }
  return n;
}

/**
 * Soft purple glow behind the body — strength scales with mythic pieces worn.
 * Drawn in local character space (origin at feet/center after translate).
 */
function drawMythicBackGlow(
  ctx: CanvasRenderingContext2D,
  mythicCount: number,
  bodySize: number,
) {
  if (mythicCount <= 0) return;
  const t = performance.now() / 1000;
  const pulse = 0.85 + Math.sin(t * 2.2) * 0.15;
  const strength = Math.min(1, mythicCount / 8);
  const baseR = bodySize * (0.38 + strength * 0.42);
  const alpha = (0.16 + strength * 0.38) * pulse;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Outer soft bloom (behind body)
  const outer = ctx.createRadialGradient(0, -bodySize * 0.08, bodySize * 0.08, 0, -bodySize * 0.05, baseR);
  outer.addColorStop(0, `rgba(225, 190, 231, ${alpha * 0.95})`);
  outer.addColorStop(0.35, `rgba(171, 71, 188, ${alpha * 0.55})`);
  outer.addColorStop(0.7, `rgba(123, 31, 162, ${alpha * 0.22})`);
  outer.addColorStop(1, 'rgba(74, 20, 140, 0)');
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.ellipse(0, -bodySize * 0.05, baseR * 0.92, baseR * 1.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Inner brighter core when 3+ mythic
  if (mythicCount >= 3) {
    const innerA = alpha * (0.35 + (mythicCount - 2) * 0.12);
    const inner = ctx.createRadialGradient(0, -bodySize * 0.12, 2, 0, -bodySize * 0.1, baseR * 0.45);
    inner.addColorStop(0, `rgba(243, 229, 245, ${innerA})`);
    inner.addColorStop(0.5, `rgba(206, 147, 216, ${innerA * 0.5})`);
    inner.addColorStop(1, 'rgba(171, 71, 188, 0)');
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.ellipse(0, -bodySize * 0.1, baseR * 0.42, baseR * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Full set accessories+armor: faint rim ring
  if (mythicCount >= 8) {
    ctx.strokeStyle = `rgba(224, 176, 255, ${0.35 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -bodySize * 0.06, baseR * 0.78, baseR * 0.95, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

export function walkSheetFrameCount(img: HTMLImageElement): number {
  const h = img.naturalHeight;
  const w = img.naturalWidth;
  if (h <= 0 || w <= h) return 1;
  return Math.max(1, Math.round(w / h));
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
  equipped?: Equipment | null,
  _gearImages?: Record<string, HTMLImageElement> | null,
  _attackSwing?: AttackSwing | null,
  actionFrame = 0,
) {
  const size = char.worldSize;
  const dir = facingToCardinal(facing);
  const img =
    images?.actions[action]?.[dir] ??
    images?.actions.walk?.[dir] ??
    images?.actions.idle?.[dir] ??
    images?.actions.walk?.down ??
    images?.actions.idle?.down;
  const ox = -size * char.anchorX;
  const oy = -size * char.anchorY;
  const mythicCount = countMythicEquipped(equipped);

  ctx.save();
  applyPixelScale(ctx);
  ctx.translate(x, y);

  // Mythic aura behind body (before shadow/sprite)
  drawMythicBackGlow(ctx, mythicCount, size);

  // ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.28, size * 0.26, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4-dir sprites — do NOT continuous-rotate
  if (rollingSpin) {
    ctx.rotate(performance.now() / 45);
  }

  if (img && img.complete && img.naturalWidth > 0) {
    const frames = action === 'walk' || action === 'attack' ? walkSheetFrameCount(img) : 1;
    if (frames > 1) {
      const frameW = img.naturalWidth / frames;
      const fi = ((actionFrame % frames) + frames) % frames;
      ctx.drawImage(img, fi * frameW, 0, frameW, img.naturalHeight, ox, oy, size, size);
    } else {
      ctx.drawImage(img, ox, oy, size, size);
    }
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
  equipped?: Equipment | null,
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
  const mythicCount = countMythicEquipped(equipped);
  if (mythicCount > 0) {
    ctx.save();
    ctx.translate(w / 2, h * 0.55);
    drawMythicBackGlow(ctx, mythicCount, size);
    ctx.restore();
  }
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
