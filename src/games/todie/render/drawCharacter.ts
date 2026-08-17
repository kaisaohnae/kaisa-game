import {displaySettings} from '../content/settings';
import type {ActionId, JobId} from '../content/types';
import type {LoadedImages} from '../content/jobAssets';
import type {Equipment, GearSlot} from '../content/equip';
import {gearImageKey, type GearTier} from '../content/items';

const char = displaySettings.character;
const skillFx = displaySettings.skillFx;
const layerOrder = (displaySettings.equipLayerOrder ?? [
  'shoes',
  'armor',
  'gloves',
  'head',
  'weapon',
  'necklace',
  'earring_l',
  'earring_r',
  'ring_l',
  'ring_r',
]) as GearSlot[];

function applyPixelScale(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = char.imageSmoothing !== false;
}

function drawGearLayers(
  ctx: CanvasRenderingContext2D,
  equipped: Equipment | null | undefined,
  gearImages: Record<string, HTMLImageElement> | null | undefined,
  size: number,
  ox: number,
  oy: number,
) {
  if (!equipped || !gearImages) return;
  for (const slot of layerOrder) {
    const it = equipped[slot];
    if (!it || it.kind !== 'gear' || !it.job || !it.gearId || !it.tier) continue;
    const img = gearImages[gearImageKey(it.job, it.tier as GearTier, it.gearId)];
    if (!img || !img.complete || img.naturalWidth <= 0) continue;
    ctx.drawImage(img, ox, oy, size, size);
  }
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
  gearImages?: Record<string, HTMLImageElement> | null,
) {
  const size = char.worldSize;
  const img = images?.actions[action] ?? images?.actions.idle;
  const ox = -size * char.anchorX;
  const oy = -size * char.anchorY;
  ctx.save();
  applyPixelScale(ctx);
  ctx.translate(x, y);
  ctx.rotate(facing + char.facingOffsetRad);
  if (rollingSpin) ctx.rotate(performance.now() / 40);
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, ox, oy, size, size);
  } else {
    ctx.fillStyle = job === 'warrior' ? '#ff8a65' : '#7e57c2';
    ctx.fillRect(-14, -16, 28, 30);
  }
  drawGearLayers(ctx, equipped, gearImages, size, ox, oy);
  ctx.restore();
}

export function drawJobPreview(
  ctx: CanvasRenderingContext2D,
  images: LoadedImages | null,
  job: JobId,
  w: number,
  h: number,
  equipped?: Equipment | null,
  gearImages?: Record<string, HTMLImageElement> | null,
) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0f1512';
  ctx.fillRect(0, 0, w, h);
  applyPixelScale(ctx);
  const img = images?.actions.idle;
  const size = Math.min(w, h) * 0.78;
  const ox = (w - size) / 2;
  const oy = (h - size) / 2 + 4;
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, ox, oy, size, size);
  } else {
    ctx.fillStyle = job === 'warrior' ? '#ff8a65' : '#7e57c2';
    ctx.fillRect(w / 2 - 20, h / 2 - 10, 40, 44);
  }
  drawGearLayers(ctx, equipped, gearImages, size, ox, oy);
}

export function drawSkillSprite(
  ctx: CanvasRenderingContext2D,
  images: LoadedImages | null,
  skillId: string,
  x: number,
  y: number,
  alpha = 1,
  size = skillFx.size,
) {
  const img = images?.skills[skillId];
  if (!img || !img.complete || img.naturalWidth <= 0) return;
  ctx.save();
  applyPixelScale(ctx);
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
  ctx.restore();
}
