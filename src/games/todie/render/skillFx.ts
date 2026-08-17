/** Procedural warrior skill VFX drawn on the world canvas. */

export type SkillFxDraw = {
  skillId: string;
  x: number;
  y: number;
  /** 1 → 0 over lifetime */
  progress: number;
  facing?: number;
  color?: string;
  radius?: number;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hexAlpha(hex: string, a: number) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}

/** Slash: facing-aligned crescent that sweeps open then fades */
function drawSlashFx(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: number,
  facing: number,
  color: string,
  radius: number,
) {
  const t = 1 - p; // 0 → 1
  const ease = 1 - Math.pow(1 - Math.min(1, t * 1.35), 2);
  const fade = Math.pow(p, 0.55);
  const r = radius * lerp(0.7, 1.35, ease);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);
  ctx.globalCompositeOperation = 'lighter';

  // outer glow arc
  const start = -1.2;
  const end = lerp(-1.2, 1.2, ease);
  ctx.lineCap = 'round';
  ctx.strokeStyle = hexAlpha(color, 0.3 * fade);
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.arc(0, 0, r, start, end);
  ctx.stroke();

  ctx.strokeStyle = hexAlpha('#fff8e1', 0.9 * fade);
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.arc(0, 0, r, start, end);
  ctx.stroke();

  ctx.strokeStyle = hexAlpha('#ffffff', 0.95 * fade);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, r + 2, start, end);
  ctx.stroke();

  // tip spark
  const tip = end;
  const tipX = Math.cos(tip) * r;
  const tipY = Math.sin(tip) * r;
  const spark = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 20);
  spark.addColorStop(0, `rgba(255,255,255,${0.95 * fade})`);
  spark.addColorStop(0.35, hexAlpha(color, 0.75 * fade));
  spark.addColorStop(1, 'rgba(255,180,40,0)');
  ctx.fillStyle = spark;
  ctx.beginPath();
  ctx.arc(tipX, tipY, 20, 0, Math.PI * 2);
  ctx.fill();

  // motion ticks
  for (let i = 0; i < 6; i += 1) {
    const a = lerp(start, end, i / 5);
    const rr = r * (0.72 + (i % 2) * 0.12);
    ctx.strokeStyle = hexAlpha('#ffffff', 0.4 * fade);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (rr - 8), Math.sin(a) * (rr - 8));
    ctx.lineTo(Math.cos(a) * (rr + 6), Math.sin(a) * (rr + 6));
    ctx.stroke();
  }

  ctx.restore();
}

/** Spin: expanding rotating blade ring (drawn ABOVE character) */
function drawSpinFx(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: number,
  color: string,
  radius: number,
) {
  const t = 1 - p;
  const fade = Math.pow(p, 0.4);
  const r = radius * lerp(0.55, 1.35, 1 - Math.pow(1 - t, 1.4));
  const rot = t * Math.PI * 2.6;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalCompositeOperation = 'lighter';

  // soft disc
  const disc = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r);
  disc.addColorStop(0, hexAlpha(color, 0.22 * fade));
  disc.addColorStop(0.65, hexAlpha(color, 0.12 * fade));
  disc.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // thick blade segments
  const blades = 12;
  for (let i = 0; i < blades; i += 1) {
    const a0 = (i / blades) * Math.PI * 2;
    const a1 = a0 + 0.42;
    ctx.strokeStyle = hexAlpha(color, 0.55 * fade);
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, r, a0, a1);
    ctx.stroke();
    ctx.strokeStyle = hexAlpha(i % 2 ? '#ffffff' : '#ffe082', 0.9 * fade);
    ctx.lineWidth = i % 2 ? 5 : 8;
    ctx.beginPath();
    ctx.arc(0, 0, r, a0, a1);
    ctx.stroke();
  }

  // outer ring
  ctx.strokeStyle = hexAlpha('#fff3e0', 0.85 * fade);
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
  ctx.stroke();

  // sparks
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2 + t * 3;
    const rr = r * (0.88 + (i % 3) * 0.08);
    ctx.fillStyle = hexAlpha(i % 2 ? '#ffffff' : color, 0.85 * fade);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Bash: impact burst + forward shock cone */
function drawBashFx(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: number,
  facing: number,
  color: string,
  radius: number,
) {
  const t = 1 - p;
  const fade = Math.pow(p, 0.5);
  const burst = radius * lerp(0.4, 1.25, Math.min(1, t * 1.8));

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);
  ctx.globalCompositeOperation = 'lighter';

  // shockwave ring
  ctx.strokeStyle = hexAlpha('#ffffff', 0.7 * fade);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, burst, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = hexAlpha(color, 0.45 * fade);
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, burst * 0.85, 0, Math.PI * 2);
  ctx.stroke();

  // core flash
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, burst * 0.55);
  core.addColorStop(0, `rgba(255,255,255,${0.95 * fade})`);
  core.addColorStop(0.4, hexAlpha(color, 0.65 * fade));
  core.addColorStop(1, 'rgba(255,100,40,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, burst * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // forward speed streaks (behind impact, negative X)
  for (let i = 0; i < 6; i += 1) {
    const oy = (i - 2.5) * 7;
    const len = 28 + (i % 3) * 14;
    const ox = -12 - t * 30 - (i % 2) * 8;
    ctx.strokeStyle = hexAlpha(i % 2 ? '#ffffff' : color, 0.55 * fade);
    ctx.lineWidth = 2 + (i % 2);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox - len, oy * 0.85);
    ctx.stroke();
  }

  // shards
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + t;
    const rr = burst * (0.55 + (i % 3) * 0.12);
    ctx.fillStyle = hexAlpha(i % 2 ? '#ffffff' : color, 0.75 * fade);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Dash trail ghost behind player while bash is active */
export function drawDashTrail(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: number,
  alpha: number,
) {
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 4; i += 1) {
    const ox = -10 - i * 12;
    ctx.fillStyle = `rgba(255, 170, 90, ${0.35 - i * 0.06})`;
    ctx.beginPath();
    ctx.ellipse(ox, 0, 10 - i, 16 - i * 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Nova: expanding purple blast ring */
function drawNovaFx(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  p: number,
  color: string,
  radius: number,
) {
  const t = 1 - p;
  const fade = Math.pow(p, 0.4);
  const r = radius * (0.35 + 0.75 * (1 - Math.pow(1 - Math.min(1, t * 1.2), 2)));

  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = 'lighter';

  const fill = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
  fill.addColorStop(0, `rgba(255,255,255,${0.55 * fade})`);
  fill.addColorStop(0.35, hexAlpha(color, 0.45 * fade));
  fill.addColorStop(1, 'rgba(120,40,180,0)');
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hexAlpha('#f3e5f5', 0.9 * fade);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = hexAlpha(color, 0.7 * fade);
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 14; i += 1) {
    const a = (i / 14) * Math.PI * 2 + t * 2;
    const rr = r * (0.7 + (i % 3) * 0.1);
    ctx.fillStyle = hexAlpha(i % 2 ? '#ffffff' : color, 0.8 * fade);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawSkillWorldFx(ctx: CanvasRenderingContext2D, fx: SkillFxDraw) {
  const facing = fx.facing ?? -Math.PI / 2;
  const color = fx.color ?? '#ffe082';
  const radius = fx.radius ?? 48;
  const p = Math.max(0, Math.min(1, fx.progress));

  if (fx.skillId === 'slash') {
    drawSlashFx(ctx, fx.x, fx.y, p, facing, color, radius);
    return;
  }
  if (fx.skillId === 'spin') {
    drawSpinFx(ctx, fx.x, fx.y, p, color, radius);
    return;
  }
  if (fx.skillId === 'bash') {
    drawBashFx(ctx, fx.x, fx.y, p, facing, color, radius);
    return;
  }
  if (fx.skillId === 'nova') {
    drawNovaFx(ctx, fx.x, fx.y, p, color, radius);
    return;
  }
}
