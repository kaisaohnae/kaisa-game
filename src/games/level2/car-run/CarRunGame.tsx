'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import CarPicker from './CarPicker';
import {
  loadAllVehicles,
  vehicleDisplaySize,
  vehicleFrameIndex,
  type LoadedVehicle,
} from './vehicleAssets';
import {CAR_RUN_VEHICLES, DEFAULT_VEHICLE_ID, isPickerVehicleId} from './vehicles';
import './car-run.css';

type Phase = 'ready' | 'playing' | 'over';

type ObstacleKind =
  | 'cone'
  | 'rock'
  | 'crate'
  | 'barrel'
  | 'tire'
  | 'barrier'
  | 'puddle'
  | 'sign'
  | 'heart';

type Obstacle = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: ObstacleKind;
  /** 도로 기준 속도 배율 — 장애물마다 다르게 */
  speedMul: number;
};

const OBSTACLE_KINDS: Exclude<ObstacleKind, 'heart'>[] = [
  'cone',
  'rock',
  'crate',
  'barrel',
  'tire',
  'barrier',
  'puddle',
  'sign',
];

const OBSTACLE_SIZE: Record<ObstacleKind, {w: number; h: number}> = {
  cone: {w: 34, h: 38},
  rock: {w: 40, h: 36},
  crate: {w: 44, h: 40},
  barrel: {w: 36, h: 42},
  tire: {w: 42, h: 34},
  barrier: {w: 56, h: 28},
  puddle: {w: 52, h: 24},
  sign: {w: 38, h: 44},
  heart: {w: 36, h: 34},
};

type GameState = {
  carX: number;
  /** 가로 조향 속도 (px/s) */
  steerVel: number;
  /** 포인터가 가리키는 목표 X (없으면 null) */
  pointerX: number | null;
  obstacles: Obstacle[];
  distance: number;
  speed: number;
  lastSpawn: number;
  nextId: number;
  scroll: number;
  lives: number;
  /** 충돌 직후 무적 종료 시각 (ms) */
  invulnUntil: number;
};

const START_SPEED = 105;
const MAX_SPEED = 320;
const CAR_DISPLAY_H = 81;
const ROAD_RATIO = 0.74;
const START_LIVES = 3;
const MAX_LIVES = 5;
const HIT_INVULN_MS = 1200;
const HEART_SPAWN_CHANCE = 0.075;
const VEHICLE_STORAGE_KEY = 'kaisa-car-run-vehicle';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function obstacleSpeedMul(kind: ObstacleKind) {
  if (kind === 'heart') return 0.72 + Math.random() * 0.16;
  if (kind === 'cone' || kind === 'sign') return 0.68 + Math.random() * 0.2;
  if (kind === 'rock' || kind === 'puddle') return 0.86 + Math.random() * 0.22;
  if (kind === 'tire' || kind === 'barrier') return 0.94 + Math.random() * 0.28;
  return 1.02 + Math.random() * 0.32;
}

function spawnObstacle(
  roadLeft: number,
  roadWidth: number,
  nextId: number,
  kind?: ObstacleKind,
): Obstacle {
  const picked =
    kind ?? OBSTACLE_KINDS[Math.floor(Math.random() * OBSTACLE_KINDS.length)]!;
  const {w, h} = OBSTACLE_SIZE[picked];
  const minX = roadLeft + w * 0.6;
  const maxX = roadLeft + roadWidth - w * 0.6;
  return {
    id: nextId,
    x: minX + Math.random() * (maxX - minX),
    y: -h - 8,
    w,
    h,
    kind: picked,
    speedMul: obstacleSpeedMul(picked),
  };
}

function spawnGapMs(speed: number) {
  return Math.max(400, 920 - speed * 1.2);
}

/** 거리 기반 속도 — 초반은 천천히, 점점 가속감 */
function speedFromDistance(distance: number) {
  const t = distance / 14_000;
  const eased = 1 - Math.exp(-t * 2.4);
  return START_SPEED + (MAX_SPEED - START_SPEED) * eased;
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
  // Visual sprite보다 작은 중앙 히트박스 — 살짝 스치는 정도는 통과
  const carInsetX = aw * 0.32;
  const carInsetY = ah * 0.38;
  const obsInsetX = bw * 0.28;
  const obsInsetY = bh * 0.3;

  return (
    ax + carInsetX < bx + bw - obsInsetX &&
    ax + aw - carInsetX > bx + obsInsetX &&
    ay + carInsetY < by + bh - obsInsetY &&
    ay + ah - carInsetY > by + obsInsetY
  );
}

function drawRoad(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  roadLeft: number,
  roadWidth: number,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#b3e5fc');
  sky.addColorStop(1, '#e1f5fe');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#aed581';
  ctx.fillRect(0, 0, roadLeft, h);
  ctx.fillRect(roadLeft + roadWidth, 0, w - roadLeft - roadWidth, h);

  ctx.fillStyle = '#ffe082';
  ctx.fillRect(roadLeft - 5, 0, 5, h);
  ctx.fillRect(roadLeft + roadWidth, 0, 5, h);

  ctx.fillStyle = '#bdbdbd';
  ctx.fillRect(roadLeft, 0, roadWidth, h);
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(x, y, 16 * s, 0, Math.PI * 2);
  ctx.arc(x + 18 * s, y - 4 * s, 14 * s, 0, Math.PI * 2);
  ctx.arc(x + 36 * s, y, 15 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle) {
  const left = o.x - o.w / 2;
  const top = o.y;

  if (o.kind === 'cone') {
    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.moveTo(o.x, top);
    ctx.lineTo(left, top + o.h);
    ctx.lineTo(left + o.w, top + o.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(left + 8, top + o.h - 14, o.w - 16, 5);
    ctx.fillRect(left + 11, top + o.h - 24, o.w - 22, 4);
  } else if (o.kind === 'rock') {
    ctx.fillStyle = '#90a4ae';
    ctx.beginPath();
    ctx.ellipse(o.x, top + o.h / 2, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cfd8dc';
    ctx.beginPath();
    ctx.ellipse(o.x - 6, top + o.h / 2 - 4, 8, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (o.kind === 'crate') {
    ctx.fillStyle = '#8d6e63';
    roundRect(ctx, left, top + 6, o.w, o.h - 6, 8);
    ctx.fill();
    ctx.fillStyle = '#ffcc80';
    roundRect(ctx, left + 6, top, o.w - 12, 10, 4);
    ctx.fill();
    ctx.fillStyle = '#fff8e1';
    ctx.fillRect(left + 10, top + 16, o.w - 20, 4);
    ctx.fillRect(left + 10, top + 24, o.w - 20, 4);
  } else if (o.kind === 'barrel') {
    ctx.fillStyle = '#ef5350';
    roundRect(ctx, left, top + 4, o.w, o.h - 4, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(left + 4, top + o.h * 0.35, o.w - 8, 6);
    ctx.fillRect(left + 4, top + o.h * 0.58, o.w - 8, 6);
    ctx.fillStyle = '#c62828';
    roundRect(ctx, left + 6, top, o.w - 12, 10, 4);
    ctx.fill();
  } else if (o.kind === 'tire') {
    ctx.fillStyle = '#37474f';
    ctx.beginPath();
    ctx.ellipse(o.x, top + o.h / 2, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#90a4ae';
    ctx.beginPath();
    ctx.ellipse(o.x, top + o.h / 2, o.w * 0.28, o.h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.ellipse(o.x, top + o.h / 2, o.w * 0.12, o.h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (o.kind === 'barrier') {
    ctx.fillStyle = '#ffeb3b';
    roundRect(ctx, left, top + 4, o.w, o.h - 8, 6);
    ctx.fill();
    ctx.fillStyle = '#212121';
    for (let i = 0; i < 3; i++) {
      const bx = left + 6 + i * ((o.w - 12) / 3);
      ctx.beginPath();
      ctx.moveTo(bx, top + 6);
      ctx.lineTo(bx + 10, top + 6);
      ctx.lineTo(bx + 18, top + o.h - 6);
      ctx.lineTo(bx + 8, top + o.h - 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#ff7043';
    ctx.fillRect(left + 4, top + o.h - 6, 8, 6);
    ctx.fillRect(left + o.w - 12, top + o.h - 6, 8, 6);
  } else if (o.kind === 'puddle') {
    ctx.fillStyle = 'rgba(33, 150, 243, 0.55)';
    ctx.beginPath();
    ctx.ellipse(o.x, top + o.h / 2, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(227, 242, 253, 0.7)';
    ctx.beginPath();
    ctx.ellipse(o.x - 8, top + o.h / 2 - 2, 10, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (o.kind === 'heart') {
    const bob = Math.sin(performance.now() / 220 + o.id) * 2.5;
    const cy = top + o.h / 2 + bob;
    const s = o.w * 0.42;
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(o.x, cy + s * 0.7);
    ctx.bezierCurveTo(o.x + s * 1.2, cy + s * 0.1, o.x + s * 1.1, cy - s * 0.75, o.x, cy - s * 0.2);
    ctx.bezierCurveTo(o.x - s * 1.1, cy - s * 0.75, o.x - s * 1.2, cy + s * 0.1, o.x, cy + s * 0.7);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(o.x - s * 0.28, cy - s * 0.22, s * 0.22, s * 0.16, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // caution sign
    ctx.fillStyle = '#78909c';
    ctx.fillRect(o.x - 3, top + 18, 6, o.h - 18);
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.moveTo(o.x, top);
    ctx.lineTo(left + o.w, top + 22);
    ctx.lineTo(left, top + 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#212121';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', o.x, top + 14);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function createInitialState(canvasW: number): GameState {
  return {
    carX: canvasW / 2,
    steerVel: 0,
    pointerX: null,
    obstacles: [],
    distance: 0,
    speed: START_SPEED,
    lastSpawn: 0,
    nextId: 1,
    scroll: 0,
    lives: START_LIVES,
    invulnUntil: 0,
  };
}

function carSize(vehicle: LoadedVehicle | undefined) {
  if (!vehicle) return {width: 51, height: CAR_DISPLAY_H};
  return vehicleDisplaySize(vehicle, CAR_DISPLAY_H);
}

export default function CarRunGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const phaseRef = useRef<Phase>('ready');
  const bestRef = useRef(0);
  const vehiclesRef = useRef<Map<string, LoadedVehicle>>(new Map());
  const selectedVehicleRef = useRef(DEFAULT_VEHICLE_ID);
  const dragRef = useRef({active: false, pointerId: -1});
  const keysRef = useRef({left: false, right: false});

  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [assetsReady, setAssetsReady] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(DEFAULT_VEHICLE_ID);

  const clampCarX = useCallback((x: number, canvasW: number, carW: number) => {
    const roadLeft = canvasW * (1 - ROAD_RATIO) / 2;
    const roadWidth = canvasW * ROAD_RATIO;
    return Math.min(roadLeft + roadWidth - carW / 2, Math.max(roadLeft + carW / 2, x));
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

    const vehicle = vehiclesRef.current.get(selectedVehicleRef.current);
    const {width: carW} = carSize(vehicle);

    if (!gameRef.current) {
      gameRef.current = createInitialState(rect.width);
    }
    gameRef.current.carX = clampCarX(gameRef.current.carX, rect.width, carW);
    if (gameRef.current.pointerX != null) {
      gameRef.current.pointerX = clampCarX(gameRef.current.pointerX, rect.width, carW);
    }
  }, [clampCarX]);

  const resetGame = useCallback(() => {
    const wrap = wrapRef.current;
    const w = wrap?.getBoundingClientRect().width ?? 320;
    const vehicle = vehiclesRef.current.get(selectedVehicleRef.current);
    const {width: carW} = carSize(vehicle);
    const state = createInitialState(w);
    state.carX = clampCarX(w / 2, w, carW);
    gameRef.current = state;
    keysRef.current.left = false;
    keysRef.current.right = false;
    setScore(0);
    setLives(START_LIVES);
    phaseRef.current = 'playing';
    setPhase('playing');
  }, [clampCarX]);

  const startReady = useCallback(() => {
    const wrap = wrapRef.current;
    const w = wrap?.getBoundingClientRect().width ?? 320;
    const vehicle = vehiclesRef.current.get(selectedVehicleRef.current);
    const {width: carW} = carSize(vehicle);
    const state = createInitialState(w);
    state.carX = clampCarX(w / 2, w, carW);
    gameRef.current = state;
    keysRef.current.left = false;
    keysRef.current.right = false;
    setScore(0);
    setLives(START_LIVES);
    phaseRef.current = 'ready';
    setPhase('ready');
  }, [clampCarX]);

  useEffect(() => {
    const saved = localStorage.getItem(VEHICLE_STORAGE_KEY);
    if (saved && isPickerVehicleId(saved)) {
      setSelectedVehicleId(saved);
      selectedVehicleRef.current = saved;
    } else {
      setSelectedVehicleId(DEFAULT_VEHICLE_ID);
      selectedVehicleRef.current = DEFAULT_VEHICLE_ID;
    }

    loadAllVehicles(CAR_RUN_VEHICLES)
      .then((map) => {
        vehiclesRef.current = map;
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
    let scoreTick = 0;

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

      const roadLeft = w * (1 - ROAD_RATIO) / 2;
      const roadWidth = w * ROAD_RATIO;
      const carY = h - 20;
      const vehicle = vehiclesRef.current.get(selectedVehicleRef.current);
      const {width: carW, height: carH} = carSize(vehicle);

      if (phaseRef.current === 'playing') {
        game.speed = speedFromDistance(game.distance);
        game.distance += game.speed * dt;
        game.scroll += game.speed * dt;

        let steerInput = 0;
        if (keysRef.current.left && !keysRef.current.right) steerInput = -1;
        else if (keysRef.current.right && !keysRef.current.left) steerInput = 1;
        else if (game.pointerX != null) {
          const dx = game.pointerX - game.carX;
          if (Math.abs(dx) > 10) steerInput = Math.sign(dx);
        }

        const speedRatio = game.speed / START_SPEED;
        const maxSteerSpeed = 95 + game.speed * 0.72;
        const steerAccel = 1600 + 900 * Math.min(1.6, speedRatio);
        if (steerInput !== 0) {
          game.steerVel += steerInput * steerAccel * dt;
          // 목표 반대 방향이면 더 빨리 꺾기
          if (Math.sign(game.steerVel) !== 0 && Math.sign(game.steerVel) !== steerInput) {
            game.steerVel += steerInput * steerAccel * 0.85 * dt;
          }
        } else {
          game.steerVel *= Math.exp(-7.5 * dt);
          if (Math.abs(game.steerVel) < 4) game.steerVel = 0;
        }
        game.steerVel = clamp(game.steerVel, -maxSteerSpeed, maxSteerSpeed);
        game.carX = clampCarX(game.carX + game.steerVel * dt, w, carW);

        game.obstacles = game.obstacles
          .map((o) => ({...o, y: o.y + game.speed * o.speedMul * dt}))
          .filter((o) => o.y < h + 60);

        if (now - game.lastSpawn >= spawnGapMs(game.speed)) {
          if (Math.random() < HEART_SPAWN_CHANCE) {
            game.obstacles.push(spawnObstacle(roadLeft, roadWidth, game.nextId, 'heart'));
          } else {
            game.obstacles.push(spawnObstacle(roadLeft, roadWidth, game.nextId));
          }
          game.nextId += 1;

          if (Math.random() < 0.28) {
            const extra = spawnObstacle(roadLeft, roadWidth, game.nextId);
            extra.y -= 65 + Math.random() * 95;
            game.obstacles.push(extra);
            game.nextId += 1;
          }

          game.lastSpawn = now;
        }

        const carLeft = game.carX - carW / 2;
        const carTop = carY - carH;

        const heartHit = game.obstacles.find(
          (o) =>
            o.kind === 'heart' &&
            rectsOverlap(carLeft, carTop, carW, carH, o.x - o.w / 2, o.y, o.w, o.h),
        );
        if (heartHit) {
          game.obstacles = game.obstacles.filter((o) => o.id !== heartHit.id);
          if (game.lives < MAX_LIVES) {
            game.lives += 1;
            setLives(game.lives);
          }
        }

        const invuln = now < game.invulnUntil;
        if (!invuln) {
          const hitObs = game.obstacles.find(
            (o) =>
              o.kind !== 'heart' &&
              rectsOverlap(carLeft, carTop, carW, carH, o.x - o.w / 2, o.y, o.w, o.h),
          );

          if (hitObs) {
            game.obstacles = game.obstacles.filter((o) => o.id !== hitObs.id);
            game.lives = Math.max(0, game.lives - 1);
            game.invulnUntil = now + HIT_INVULN_MS;
            game.steerVel *= 0.35;
            setLives(game.lives);

            if (game.lives <= 0) {
              keysRef.current.left = false;
              keysRef.current.right = false;
              game.pointerX = null;
              phaseRef.current = 'over';
              setPhase('over');
              const meters = Math.floor(game.distance / 10);
              if (meters > bestRef.current) {
                bestRef.current = meters;
                setBest(meters);
              }
            }
          }
        }

        if (now - scoreTick > 180) {
          scoreTick = now;
          setScore(Math.floor(game.distance / 10));
        }
      }

      drawRoad(ctx, w, h, roadLeft, roadWidth);
      drawCloud(ctx, w * 0.18, 50 + ((game.scroll * 0.08) % (h + 80)) - 40, 1);
      drawCloud(ctx, w * 0.78, 90 + ((game.scroll * 0.06) % (h + 100)) - 60, 0.85);
      drawCloud(ctx, w * 0.62, 30 + ((game.scroll * 0.05) % (h + 120)) - 80, 0.7);

      for (const o of game.obstacles) drawObstacle(ctx, o);

      if (vehicle) {
        const frame = vehicleFrameIndex(vehicle, now);
        const img = vehicle.images[frame] ?? vehicle.images[0];
        if (img) {
          const blinking = now < game.invulnUntil && Math.floor(now / 90) % 2 === 0;
          ctx.save();
          if (blinking) ctx.globalAlpha = 0.35;
          ctx.drawImage(img, game.carX - carW / 2, carY - carH, carW, carH);
          ctx.restore();
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clampCarX]);

  const setPointerX = useCallback(
    (clientX: number, fieldWidth: number) => {
      const game = gameRef.current;
      if (!game) return;

      const wrap = wrapRef.current;
      if (!wrap) return;

      const rect = wrap.getBoundingClientRect();
      const localX = clientX - rect.left;
      const vehicle = vehiclesRef.current.get(selectedVehicleRef.current);
      const {width: carW} = carSize(vehicle);
      game.pointerX = clampCarX(localX, fieldWidth, carW);
    },
    [clampCarX],
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

  const onSelectVehicle = (id: string) => {
    if (phase === 'playing') return;
    selectedVehicleRef.current = id;
    setSelectedVehicleId(id);
    localStorage.setItem(VEHICLE_STORAGE_KEY, id);

    const wrap = wrapRef.current;
    const game = gameRef.current;
    if (wrap && game) {
      const canvasW = wrap.getBoundingClientRect().width;
      const {width: carW} = carSize(vehiclesRef.current.get(id));
      game.carX = clampCarX(game.carX, canvasW, carW);
      if (game.pointerX != null) {
        game.pointerX = clampCarX(game.pointerX, canvasW, carW);
      }
    }
  };

  const showSetup = phase === 'ready' || phase === 'over';

  return (
    <div className="car-run">
      <div
        ref={wrapRef}
        className={`car-run__field${phase === 'playing' ? '' : ' car-run__field--idle'}`}
        onPointerDown={onFieldPointerDown}
        onPointerMove={onFieldPointerMove}
        onPointerUp={onFieldPointerUp}
        onPointerCancel={onFieldPointerCancel}
        role="application"
        aria-label="자동차 피하기"
      >
        <canvas ref={canvasRef} className="car-run__canvas" />

        {phase === 'playing' ? (
          <div className="car-run__hud" aria-live="polite">
            <div className="car-run__hud-score">{score}m</div>
            <div className="car-run__hearts" aria-label={`하트 ${lives}개`}>
              {Array.from({length: MAX_LIVES}, (_, i) => (
                <span
                  key={i}
                  className={`car-run__heart${i < lives ? '' : ' car-run__heart--empty'}`}
                  aria-hidden
                >
                  ♥
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {showSetup ? (
          <div className="car-run__setup" role="dialog" aria-labelledby="car-run-setup-title">
            {phase === 'over' ? (
              <>
                <p id="car-run-setup-title" className="car-run__setup-title car-run__setup-title--over">
                  하트가 다 떨어졌어요
                </p>
                <p className="car-run__setup-score">{score}m 달렸어요</p>
                {best > 0 ? <p className="car-run__setup-best">최고 {best}m</p> : null}
              </>
            ) : (
              <p id="car-run-setup-title" className="car-run__setup-title">
                자동차 달리기
              </p>
            )}

            <CarPicker selectedId={selectedVehicleId} onSelect={onSelectVehicle} />

            <button
              type="button"
              className="car-run__btn car-run__btn--start"
              disabled={!assetsReady}
              onClick={beginRun}
            >
              {phase === 'over' ? '다시 달리기' : '출발!'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
