'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import PlanePicker from './PlanePicker';
import {
  drawPlaneSprite,
  drawSpriteImage,
  loadAllPlanes,
  loadImageMap,
  planeDisplaySize,
  type LoadedPlane,
} from './planeAssets';
import {
  DEFAULT_PLANE_ID,
  isPickerPlaneId,
  PLANE_SHOOT_PLANES,
} from './planes';
import {
  DEFAULT_WEAPON,
  ENEMY_BOLT,
  getWeapon,
  HEART_DROP_CHANCE,
  HEART_ITEM,
  pickWeaponItem,
  WEAPON_ITEMS,
  WEAPONS,
  type WeaponId,
} from './weapons';
import {
  pickEnemyForStage,
  resolvePlaneDifficulty,
  type PlaneStageId,
} from './stages';
import './plane-shoot.css';

type Phase = 'ready' | 'playing' | 'over';

type Enemy = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  planeId: string;
  speedMul: number;
  vx: number;
  hp: number;
  lastShot: number;
  nextShotIn: number;
};

type Bullet = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  damage: number;
  weaponId: WeaponId;
  spin: number;
};

type EnemyBullet = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

type Pickup = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'weapon' | 'heart';
  itemId: string;
  weaponId: WeaponId | null;
};

type GameState = {
  planeX: number;
  steerVel: number;
  pointerX: number | null;
  enemies: Enemy[];
  bullets: Bullet[];
  enemyBullets: EnemyBullet[];
  pickups: Pickup[];
  score: number;
  speed: number;
  lastSpawn: number;
  lastShot: number;
  nextId: number;
  scroll: number;
  lives: number;
  invulnUntil: number;
  weaponId: WeaponId;
  weaponUntil: number;
};

const PLANE_DISPLAY_H = 72;
const PLAY_RATIO = 0.88;
const START_LIVES = 3;
const HIT_INVULN_MS = 1200;
const WEAPON_DURATION_MS = 14000;
const PLANE_STORAGE_KEY = 'kaisa-plane-shoot-plane';
const STAGE_BANNER_MS = 2200;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function sizeForPlane(
  planeId: string,
  planes: Map<string, LoadedPlane> | undefined,
  displayH = PLANE_DISPLAY_H,
): {w: number; h: number} {
  const loaded = planes?.get(planeId);
  if (loaded) {
    const {width, height} = planeDisplaySize(loaded, displayH);
    return {w: width, h: height};
  }
  return {w: Math.round(displayH * 0.65), h: displayH};
}

function spawnEnemy(
  fieldLeft: number,
  fieldWidth: number,
  nextId: number,
  planes: Map<string, LoadedPlane>,
  now: number,
  diff: ReturnType<typeof resolvePlaneDifficulty>,
): Enemy {
  const pool = [...planes.keys()].filter((id) =>
    PLANE_SHOOT_PLANES.some((p) => p.id === id && p.asEnemy),
  );
  const planeId = pickEnemyForStage(
    pool.length ? pool : ['scout'],
    diff.lightBias,
    diff.eliteBias,
  );
  const big = planeId === 'titan' || planeId === 'bomber' || planeId === 'cargo';
  const {w, h} = sizeForPlane(planeId, planes, big ? PLANE_DISPLAY_H * 1.15 : PLANE_DISPLAY_H);
  const laneW = fieldWidth / 4;
  const lane = Math.floor(Math.random() * 4);
  const laneCenter = fieldLeft + laneW * (lane + 0.5);
  const jitter = (Math.random() - 0.5) * laneW * 0.3;
  const minX = fieldLeft + w * 0.55;
  const maxX = fieldLeft + fieldWidth - w * 0.55;
  const zig =
    diff.zigVxMin + Math.random() * Math.max(0, diff.zigVxMax - diff.zigVxMin);
  const shooty = planeId === 'titan' || planeId === 'dark-ace' || planeId === 'raider';
  const baseGap = (shooty ? 700 : 1200) + Math.random() * (shooty ? 900 : 1600);
  return {
    id: nextId,
    x: clamp(laneCenter + jitter, minX, maxX),
    y: -h - 8,
    w,
    h,
    planeId,
    speedMul:
      diff.enemySpeedMulMin +
      Math.random() * Math.max(0, diff.enemySpeedMulMax - diff.enemySpeedMulMin),
    vx: (Math.random() < 0.5 ? -1 : 1) * zig,
    hp: big ? 3 : planeId === 'dark-ace' || planeId === 'stealth' ? 2 : 1,
    lastShot: now,
    nextShotIn: baseGap * diff.shootIntervalMul,
  };
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) {
  const aInsetX = aw * 0.28;
  const aInsetY = ah * 0.32;
  const bInsetX = bw * 0.26;
  const bInsetY = bh * 0.28;
  return (
    ax + aInsetX < bx + bw - bInsetX &&
    ax + aw - aInsetX > bx + bInsetX &&
    ay + aInsetY < by + bh - bInsetY &&
    ay + ah - aInsetY > by + bInsetY
  );
}

/** Stable pseudo-random 0..1 from integer seed */
function hash01(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type CloudSpec = {xRatio: number; y: number; r: number; alpha: number};

function makeCloudLayer(count: number, seed: number, span: number): CloudSpec[] {
  const clouds: CloudSpec[] = [];
  for (let i = 0; i < count; i += 1) {
    clouds.push({
      xRatio: hash01(seed + i * 3),
      y: hash01(seed + i * 7) * span,
      r: 18 + hash01(seed + i * 11) * 28,
      alpha: 0.28 + hash01(seed + i * 13) * 0.35,
    });
  }
  return clouds;
}

const FAR_CLOUDS = makeCloudLayer(10, 101, 900);
const MID_CLOUDS = makeCloudLayer(8, 202, 1100);
const NEAR_CLOUDS = makeCloudLayer(6, 303, 1300);

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
  ctx.arc(x + r * 0.65, y + 3, r * 0.55, 0, Math.PI * 2);
  ctx.arc(x - r * 0.5, y + 5, r * 0.48, 0, Math.PI * 2);
  ctx.arc(x + r * 0.15, y - r * 0.25, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Soft multi-layer parallax — clouds drift slowly vs plane speed so motion feels natural.
 */
function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, scroll: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#39b6f0');
  sky.addColorStop(0.45, '#6ec8f5');
  sky.addColorStop(1, '#a8def8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // subtle haze bands (very slow)
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  const hazePeriod = 220;
  const hazeOff = (scroll * 0.08) % hazePeriod;
  for (let y = -hazePeriod; y < h + hazePeriod; y += hazePeriod) {
    ctx.fillRect(0, y + hazeOff, w, 28);
  }

  const layers = [
    {clouds: FAR_CLOUDS, speed: 0.12, span: 900},
    {clouds: MID_CLOUDS, speed: 0.26, span: 1100},
    {clouds: NEAR_CLOUDS, speed: 0.42, span: 1300},
  ];

  for (const layer of layers) {
    for (const c of layer.clouds) {
      const wrapped = ((c.y + scroll * layer.speed) % layer.span + layer.span) % layer.span;
      const y = wrapped - 80;
      if (y < -100 || y > h + 100) continue;
      ctx.globalAlpha = c.alpha;
      ctx.fillStyle = '#ffffff';
      drawCloud(ctx, 24 + c.xRatio * Math.max(1, w - 48), y, c.r);
      ctx.globalAlpha = 1;
    }
  }
}

function createInitialState(canvasW: number): GameState {
  return {
    planeX: canvasW / 2,
    steerVel: 0,
    pointerX: null,
    enemies: [],
    bullets: [],
    enemyBullets: [],
    pickups: [],
    score: 0,
    speed: resolvePlaneDifficulty(0).speed,
    lastSpawn: 0,
    lastShot: 0,
    nextId: 1,
    scroll: 0,
    lives: START_LIVES,
    invulnUntil: 0,
    weaponId: DEFAULT_WEAPON,
    weaponUntil: 0,
  };
}

function playerSize(plane: LoadedPlane | undefined) {
  if (!plane) return {width: 48, height: PLANE_DISPLAY_H};
  return planeDisplaySize(plane, PLANE_DISPLAY_H);
}

function scoreForEnemy(planeId: string) {
  if (planeId === 'titan') return 5;
  if (planeId === 'dark-ace' || planeId === 'stealth') return 3;
  if (planeId === 'bomber' || planeId === 'cargo') return 2;
  return 1;
}

export default function PlaneShootGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const phaseRef = useRef<Phase>('ready');
  const bestRef = useRef(0);
  const planesRef = useRef<Map<string, LoadedPlane>>(new Map());
  const projectileImgsRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const itemImgsRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const selectedPlaneRef = useRef(DEFAULT_PLANE_ID);
  const dragRef = useRef({active: false, pointerId: -1});
  const keysRef = useRef({left: false, right: false});

  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [weaponLabel, setWeaponLabel] = useState(WEAPONS.basic.label);
  const [assetsReady, setAssetsReady] = useState(false);
  const [selectedPlaneId, setSelectedPlaneId] = useState(DEFAULT_PLANE_ID);
  const [stageId, setStageId] = useState<PlaneStageId>(1);
  const [stageLabel, setStageLabel] = useState('초보 비행');
  const [stageBanner, setStageBanner] = useState<string | null>(null);
  const stageIdRef = useRef<PlaneStageId>(1);
  const stageBannerUntilRef = useRef(0);
  const itemDropChanceRef = useRef(0.28);
  const shootYMaxRatioRef = useRef(0.55);
  const shootIntervalMulRef = useRef(1.55);

  const clampPlaneX = useCallback((x: number, canvasW: number, planeW: number) => {
    const fieldLeft = (canvasW * (1 - PLAY_RATIO)) / 2;
    const fieldWidth = canvasW * PLAY_RATIO;
    return Math.min(fieldLeft + fieldWidth - planeW / 2, Math.max(fieldLeft + planeW / 2, x));
  }, []);

  const syncSize = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const plane = planesRef.current.get(selectedPlaneRef.current);
    const {width: planeW} = playerSize(plane);

    if (!gameRef.current) gameRef.current = createInitialState(rect.width);
    gameRef.current.planeX = clampPlaneX(gameRef.current.planeX, rect.width, planeW);
    if (gameRef.current.pointerX != null) {
      gameRef.current.pointerX = clampPlaneX(gameRef.current.pointerX, rect.width, planeW);
    }
  }, [clampPlaneX]);

  const resetGame = useCallback(() => {
    const wrap = wrapRef.current;
    const w = wrap?.getBoundingClientRect().width ?? 320;
    const plane = planesRef.current.get(selectedPlaneRef.current);
    const {width: planeW} = playerSize(plane);
    const state = createInitialState(w);
    state.planeX = clampPlaneX(w / 2, w, planeW);
    gameRef.current = state;
    keysRef.current.left = false;
    keysRef.current.right = false;
    setScore(0);
    setLives(START_LIVES);
    setWeaponLabel(WEAPONS.basic.label);
    setStageId(1);
    setStageLabel('초보 비행');
    setStageBanner(null);
    stageIdRef.current = 1;
    stageBannerUntilRef.current = 0;
    phaseRef.current = 'playing';
    setPhase('playing');
  }, [clampPlaneX]);

  const startReady = useCallback(() => {
    const wrap = wrapRef.current;
    const w = wrap?.getBoundingClientRect().width ?? 320;
    const plane = planesRef.current.get(selectedPlaneRef.current);
    const {width: planeW} = playerSize(plane);
    const state = createInitialState(w);
    state.planeX = clampPlaneX(w / 2, w, planeW);
    gameRef.current = state;
    keysRef.current.left = false;
    keysRef.current.right = false;
    setScore(0);
    setLives(START_LIVES);
    setWeaponLabel(WEAPONS.basic.label);
    setStageId(1);
    setStageLabel('초보 비행');
    setStageBanner(null);
    stageIdRef.current = 1;
    stageBannerUntilRef.current = 0;
    phaseRef.current = 'ready';
    setPhase('ready');
  }, [clampPlaneX]);

  useEffect(() => {
    const saved = localStorage.getItem(PLANE_STORAGE_KEY);
    if (saved && isPickerPlaneId(saved)) {
      setSelectedPlaneId(saved);
      selectedPlaneRef.current = saved;
    }

    const projectileUrls: Record<string, string> = {
      ...Object.fromEntries(Object.values(WEAPONS).map((w) => [w.id, w.src])),
      [ENEMY_BOLT.id]: ENEMY_BOLT.src,
    };
    const itemUrls = {
      ...Object.fromEntries(WEAPON_ITEMS.map((it) => [it.id, it.src])),
      [HEART_ITEM.id]: HEART_ITEM.src,
    };

    Promise.all([
      loadAllPlanes(PLANE_SHOOT_PLANES),
      loadImageMap(projectileUrls),
      loadImageMap(itemUrls),
    ])
      .then(([map, projectiles, items]) => {
        planesRef.current = map;
        projectileImgsRef.current = projectiles;
        itemImgsRef.current = items;
        setAssetsReady(true);
      })
      .catch(() => setAssetsReady(true));
  }, []);

  useEffect(() => {
    if (!assetsReady) return;
    startReady();
    syncSize();
    window.addEventListener('resize', syncSize);
    return () => window.removeEventListener('resize', syncSize);
  }, [assetsReady, startReady, syncSize]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.left = true;
        e.preventDefault();
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.right = true;
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
    };
    const onBlur = () => {
      keysRef.current.left = false;
      keysRef.current.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let uiTick = 0;

    const endGame = (game: GameState) => {
      keysRef.current.left = false;
      keysRef.current.right = false;
      game.pointerX = null;
      phaseRef.current = 'over';
      setPhase('over');
      if (game.score > bestRef.current) {
        bestRef.current = game.score;
        setBest(game.score);
      }
    };

    const tick = (now: number) => {
      const canvas = canvasRef.current;
      const game = gameRef.current;
      if (!canvas || !game) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dt = Math.min((now - last) / 1000, 0.04);
      last = now;

      const fieldLeft = (w * (1 - PLAY_RATIO)) / 2;
      const fieldWidth = w * PLAY_RATIO;
      const planeY = h - 18;
      const plane = planesRef.current.get(selectedPlaneRef.current);
      const {width: planeW, height: planeH} = playerSize(plane);

      if (phaseRef.current === 'playing') {
        const diff = resolvePlaneDifficulty(game.score);
        game.speed = diff.speed;
        game.scroll += game.speed * dt;
        itemDropChanceRef.current = diff.itemDropChance;
        shootYMaxRatioRef.current = diff.shootYMaxRatio;
        shootIntervalMulRef.current = diff.shootIntervalMul;

        if (diff.id !== stageIdRef.current) {
          stageIdRef.current = diff.id;
          setStageId(diff.id);
          setStageLabel(diff.label);
          setStageBanner(`STAGE ${diff.id} · ${diff.label}`);
          stageBannerUntilRef.current = now + STAGE_BANNER_MS;
        } else if (now > stageBannerUntilRef.current && stageBannerUntilRef.current > 0) {
          stageBannerUntilRef.current = 0;
          setStageBanner(null);
        }

        if (game.weaponId !== DEFAULT_WEAPON && now > game.weaponUntil) {
          game.weaponId = DEFAULT_WEAPON;
        }

        let steerInput = 0;
        if (keysRef.current.left && !keysRef.current.right) steerInput = -1;
        else if (keysRef.current.right && !keysRef.current.left) steerInput = 1;
        else if (game.pointerX != null) {
          const dx = game.pointerX - game.planeX;
          if (Math.abs(dx) > 10) steerInput = Math.sign(dx);
        }

        const maxSteerSpeed = 110 + game.speed * 0.65;
        const steerAccel = 1700 + 800 * Math.min(1.5, game.speed / Math.max(85, diff.speedMin));
        if (steerInput !== 0) {
          game.steerVel += steerInput * steerAccel * dt;
          if (Math.sign(game.steerVel) !== 0 && Math.sign(game.steerVel) !== steerInput) {
            game.steerVel += steerInput * steerAccel * 0.85 * dt;
          }
        } else {
          game.steerVel *= Math.exp(-7.5 * dt);
          if (Math.abs(game.steerVel) < 4) game.steerVel = 0;
        }
        game.steerVel = clamp(game.steerVel, -maxSteerSpeed, maxSteerSpeed);
        game.planeX = clampPlaneX(game.planeX + game.steerVel * dt, w, planeW);

        const weapon = getWeapon(game.weaponId);
        if (now - game.lastShot >= weapon.fireGapMs) {
          const muzzleY = planeY - planeH + 4;
          for (const angle of weapon.angles) {
            const speed = weapon.speed;
            game.bullets.push({
              id: game.nextId,
              x: game.planeX,
              y: muzzleY,
              vx: Math.sin(angle) * speed,
              vy: -Math.cos(angle) * speed,
              w: weapon.displayW,
              h: weapon.displayH,
              damage: weapon.damage,
              weaponId: weapon.id,
              spin: 0,
            });
            game.nextId += 1;
          }
          game.lastShot = now;
        }

        game.bullets = game.bullets
          .map((b) => ({
            ...b,
            x: b.x + b.vx * dt,
            y: b.y + b.vy * dt,
            spin: b.spin + (b.weaponId === 'star' || b.weaponId === 'plasma' ? dt * 6 : 0),
          }))
          .filter((b) => b.y + b.h > -40 && b.x > -40 && b.x < w + 40);

        // Enemies zigzag + occasionally fire
        const freshEnemyBullets: EnemyBullet[] = [];
        game.enemies = game.enemies
          .map((e) => {
            let x = e.x + e.vx * dt;
            let vx = e.vx;
            const minX = fieldLeft + e.w * 0.55;
            const maxX = fieldLeft + fieldWidth - e.w * 0.55;
            if (x < minX) {
              x = minX;
              vx = Math.abs(vx);
            } else if (x > maxX) {
              x = maxX;
              vx = -Math.abs(vx);
            }
            const y = e.y + game.speed * e.speedMul * dt;
            let lastShot = e.lastShot;
            let nextShotIn = e.nextShotIn;
            if (
              y > 40 &&
              y < h * shootYMaxRatioRef.current &&
              now - lastShot >= nextShotIn
            ) {
              freshEnemyBullets.push({
                id: game.nextId,
                x,
                y: y + e.h * 0.55,
                w: ENEMY_BOLT.displayW,
                h: ENEMY_BOLT.displayH,
              });
              game.nextId += 1;
              lastShot = now;
              nextShotIn = (900 + Math.random() * 1400) * shootIntervalMulRef.current;
            }
            return {...e, x, vx, y, lastShot, nextShotIn};
          })
          .filter((e) => e.y < h + 60);

        game.enemyBullets.push(...freshEnemyBullets);
        game.enemyBullets = game.enemyBullets
          .map((b) => ({...b, y: b.y + (ENEMY_BOLT.speed + game.speed * 0.25) * dt}))
          .filter((b) => b.y < h + 40);

        game.pickups = game.pickups
          .map((p) => ({...p, y: p.y + game.speed * 0.55 * dt}))
          .filter((p) => p.y < h + 40);

        if (now - game.lastSpawn >= diff.spawnGapMs) {
          game.enemies.push(
            spawnEnemy(fieldLeft, fieldWidth, game.nextId, planesRef.current, now, diff),
          );
          game.nextId += 1;
          if (Math.random() < diff.doubleSpawnChance) {
            const extra = spawnEnemy(
              fieldLeft,
              fieldWidth,
              game.nextId,
              planesRef.current,
              now,
              diff,
            );
            extra.y -= 70 + Math.random() * 100;
            game.enemies.push(extra);
            game.nextId += 1;
          }
          if (Math.random() < diff.tripleSpawnChance) {
            const extra2 = spawnEnemy(
              fieldLeft,
              fieldWidth,
              game.nextId,
              planesRef.current,
              now,
              diff,
            );
            extra2.y -= 140 + Math.random() * 140;
            game.enemies.push(extra2);
            game.nextId += 1;
          }
          game.lastSpawn = now;
        }

        // Player bullets vs enemies
        const hitBulletIds = new Set<number>();
        const deadEnemyIds = new Set<number>();
        const newPickups: Pickup[] = [];
        for (const b of game.bullets) {
          for (const e of game.enemies) {
            if (deadEnemyIds.has(e.id) || hitBulletIds.has(b.id)) continue;
            if (!rectsOverlap(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, e.x - e.w / 2, e.y, e.w, e.h)) {
              continue;
            }
            hitBulletIds.add(b.id);
            e.hp -= b.damage;
            if (e.hp <= 0) {
              deadEnemyIds.add(e.id);
              game.score += scoreForEnemy(e.planeId);
              const heartChance = game.lives < START_LIVES ? HEART_DROP_CHANCE : 0;
              if (Math.random() < heartChance) {
                newPickups.push({
                  id: game.nextId,
                  x: e.x,
                  y: e.y + e.h / 2,
                  w: HEART_ITEM.displayW,
                  h: HEART_ITEM.displayH,
                  kind: 'heart',
                  itemId: HEART_ITEM.id,
                  weaponId: null,
                });
                game.nextId += 1;
              } else if (Math.random() < itemDropChanceRef.current) {
                const item = pickWeaponItem();
                newPickups.push({
                  id: game.nextId,
                  x: e.x,
                  y: e.y + e.h / 2,
                  w: 34,
                  h: 34,
                  kind: 'weapon',
                  itemId: item.id,
                  weaponId: item.weaponId,
                });
                game.nextId += 1;
              }
            }
          }
        }
        game.bullets = game.bullets.filter((b) => !hitBulletIds.has(b.id));
        if (deadEnemyIds.size) {
          game.enemies = game.enemies.filter((e) => !deadEnemyIds.has(e.id));
        }
        game.pickups.push(...newPickups);

        const playerLeft = game.planeX - planeW / 2;
        const playerTop = planeY - planeH;

        // Pickup weapons / hearts
        const taken = new Set<number>();
        for (const p of game.pickups) {
          if (
            rectsOverlap(playerLeft, playerTop, planeW, planeH, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h)
          ) {
            taken.add(p.id);
            if (p.kind === 'heart') {
              game.lives = Math.min(START_LIVES, game.lives + 1);
              setLives(game.lives);
            } else if (p.weaponId) {
              game.weaponId = p.weaponId;
              game.weaponUntil = now + WEAPON_DURATION_MS;
            }
          }
        }
        if (taken.size) game.pickups = game.pickups.filter((p) => !taken.has(p.id));

        const invuln = now < game.invulnUntil;
        if (!invuln) {
          const hitEnemy = game.enemies.find((e) =>
            rectsOverlap(playerLeft, playerTop, planeW, planeH, e.x - e.w / 2, e.y, e.w, e.h),
          );
          const hitBolt = game.enemyBullets.find((b) =>
            rectsOverlap(playerLeft, playerTop, planeW, planeH, b.x - b.w / 2, b.y, b.w, b.h),
          );

          if (hitEnemy || hitBolt) {
            if (hitEnemy) game.enemies = game.enemies.filter((e) => e.id !== hitEnemy.id);
            if (hitBolt) game.enemyBullets = game.enemyBullets.filter((b) => b.id !== hitBolt.id);
            game.lives = Math.max(0, game.lives - 1);
            game.invulnUntil = now + HIT_INVULN_MS;
            game.steerVel *= 0.35;
            setLives(game.lives);
            if (game.lives <= 0) endGame(game);
          }
        }

        if (now - uiTick > 100) {
          uiTick = now;
          setScore(game.score);
          setWeaponLabel(getWeapon(game.weaponId).label);
        }
      }

      drawSky(ctx, w, h, game.scroll);

      for (const p of game.pickups) {
        const bob = Math.sin(now / 200 + p.id) * 3;
        drawSpriteImage(
          ctx,
          itemImgsRef.current.get(p.itemId),
          p.x,
          p.y + bob,
          p.w,
          p.h,
        );
      }

      for (const e of game.enemies) {
        const loaded = planesRef.current.get(e.planeId);
        const img = loaded?.images[0];
        if (img && img.complete && img.naturalWidth > 0) {
          drawPlaneSprite(ctx, img, e.x, e.y + e.h / 2, e.w, e.h, {faceDown: true});
        } else {
          ctx.fillStyle = '#546e7a';
          ctx.fillRect(e.x - e.w / 2, e.y, e.w, e.h);
        }
      }

      for (const b of game.enemyBullets) {
        drawSpriteImage(
          ctx,
          projectileImgsRef.current.get(ENEMY_BOLT.id),
          b.x,
          b.y + b.h / 2,
          b.w,
          b.h,
        );
      }

      for (const b of game.bullets) {
        drawSpriteImage(
          ctx,
          projectileImgsRef.current.get(b.weaponId),
          b.x,
          b.y,
          b.w,
          b.h,
          {rotation: b.spin},
        );
      }

      if (plane) {
        const img = plane.images[0];
        if (img) {
          const blinking = now < game.invulnUntil && Math.floor(now / 90) % 2 === 0;
          drawPlaneSprite(
            ctx,
            img,
            game.planeX,
            planeY - planeH / 2,
            planeW,
            planeH,
            {faceDown: false, alpha: blinking ? 0.35 : 1},
          );
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clampPlaneX]);

  const setPointerX = useCallback(
    (clientX: number, fieldWidth: number) => {
      const game = gameRef.current;
      if (!game) return;
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const localX = clientX - rect.left;
      const plane = planesRef.current.get(selectedPlaneRef.current);
      const {width: planeW} = playerSize(plane);
      game.pointerX = clampPlaneX(localX, fieldWidth, planeW);
    },
    [clampPlaneX],
  );

  const beginRun = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const onFieldPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== 'playing') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {active: true, pointerId: e.pointerId};
    setPointerX(e.clientX, e.currentTarget.getBoundingClientRect().width);
  };

  const onFieldPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
    if (phaseRef.current !== 'playing') return;
    setPointerX(e.clientX, e.currentTarget.getBoundingClientRect().width);
  };

  const onFieldPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current.active = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const game = gameRef.current;
    if (game) game.pointerX = null;
  };

  const onFieldPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current.active = false;
    const game = gameRef.current;
    if (game) game.pointerX = null;
  };

  const onSelectPlane = (id: string) => {
    if (phase === 'playing') return;
    selectedPlaneRef.current = id;
    setSelectedPlaneId(id);
    localStorage.setItem(PLANE_STORAGE_KEY, id);

    const wrap = wrapRef.current;
    const game = gameRef.current;
    if (wrap && game) {
      const canvasW = wrap.getBoundingClientRect().width;
      const {width: planeW} = playerSize(planesRef.current.get(id));
      game.planeX = clampPlaneX(game.planeX, canvasW, planeW);
      if (game.pointerX != null) {
        game.pointerX = clampPlaneX(game.pointerX, canvasW, planeW);
      }
    }
  };

  const showSetup = phase === 'ready' || phase === 'over';

  return (
    <div className="plane-shoot">
      <div
        ref={wrapRef}
        className={`plane-shoot__field${phase === 'playing' ? '' : ' plane-shoot__field--idle'}`}
        onPointerDown={onFieldPointerDown}
        onPointerMove={onFieldPointerMove}
        onPointerUp={onFieldPointerUp}
        onPointerCancel={onFieldPointerCancel}
        role="application"
        aria-label="비행기 슈팅"
      >
        <canvas ref={canvasRef} className="plane-shoot__canvas" />

        {phase === 'playing' ? (
          <div className="plane-shoot__hud" aria-live="polite">
            <div className="plane-shoot__hud-score">{score}점</div>
            <div className="plane-shoot__hud-stage" aria-label={`스테이지 ${stageId}`}>
              S{stageId} · {stageLabel}
            </div>
            <div className="plane-shoot__hud-weapon">{weaponLabel}</div>
            <div className="plane-shoot__hearts" aria-label={`하트 ${lives}개`}>
              {Array.from({length: lives}, (_, i) => (
                <img
                  key={i}
                  className="plane-shoot__heart"
                  src="/plane-shoot/fx/heart.png"
                  alt=""
                  aria-hidden
                  draggable={false}
                />
              ))}
            </div>
          </div>
        ) : null}

        {phase === 'playing' && stageBanner ? (
          <div className="plane-shoot__stage-banner" aria-live="assertive">
            {stageBanner}
          </div>
        ) : null}

        {showSetup ? (
          <div className="plane-shoot__setup" role="dialog" aria-labelledby="plane-shoot-setup-title">
            {phase === 'over' ? (
              <>
                <p
                  id="plane-shoot-setup-title"
                  className="plane-shoot__setup-title plane-shoot__setup-title--over"
                >
                  하트가 다 떨어졌어요
                </p>
                <p className="plane-shoot__setup-score">{score}점 획득</p>
                <p className="plane-shoot__setup-best">
                  도달 S{stageId} · {stageLabel}
                </p>
                {best > 0 ? <p className="plane-shoot__setup-best">최고 {best}점</p> : null}
              </>
            ) : (
              <p id="plane-shoot-setup-title" className="plane-shoot__setup-title">
                비행기 슈팅
              </p>
            )}

            <PlanePicker selectedId={selectedPlaneId} onSelect={onSelectPlane} />

            <button
              type="button"
              className="plane-shoot__btn plane-shoot__btn--start"
              disabled={!assetsReady}
              onClick={beginRun}
            >
              {phase === 'over' ? '다시 날기' : '출격!'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
