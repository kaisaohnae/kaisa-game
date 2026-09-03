'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import CarPicker from './CarPicker';
import {
  drawVehicleSprite,
  loadAllVehicles,
  vehicleDisplaySize,
  type LoadedVehicle,
} from './vehicleAssets';
import {
  loadObstacleImages,
  type ObstacleSpriteKind,
} from './obstacleAssets';
import {CAR_RUN_VEHICLES, DEFAULT_VEHICLE_ID, isPickerVehicleId, pickObstacleVehicleId} from './vehicles';
import {resolveCarDifficulty, type CarStageId} from './stages';
import './car-run.css';

type Phase = 'ready' | 'playing' | 'over';

type ObstacleKind = 'heart' | 'vehicle';

type Obstacle = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: ObstacleKind;
  /** kind === 'vehicle' 일 때 */
  vehicleId?: string;
  /** 도로 기준 속도 배율 — 장애물마다 다르게 */
  speedMul: number;
  /** 가로 이동 속도 (px/s). 0이면 직진만 */
  vx: number;
};

const HEART_SIZE = {w: 40, h: 38};

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

const CAR_DISPLAY_H = 81;
const ROAD_RATIO = 0.8;
const LANE_COUNT = 4;
const START_LIVES = 3;
const MAX_LIVES = 5;
const HIT_INVULN_MS = 1200;
const VEHICLE_STORAGE_KEY = 'kaisa-car-run-vehicle';
const STAGE_BANNER_MS = 2200;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function obstacleSpeedMul(kind: ObstacleKind) {
  if (kind === 'heart') return 0.72 + Math.random() * 0.16;
  return 0.9 + Math.random() * 0.28;
}

/** 장애물 차량 = 플레이어와 같은 표시 높이(비율은 해당 스프라이트) */
function sizeForObstacleVehicle(
  vehicleId: string,
  vehicles: Map<string, LoadedVehicle> | undefined,
  playerVehicle: LoadedVehicle | undefined,
): {w: number; h: number} {
  const loaded = vehicles?.get(vehicleId) ?? playerVehicle;
  if (loaded) {
    const {width, height} = vehicleDisplaySize(loaded, CAR_DISPLAY_H);
    return {w: width, h: height};
  }
  if (playerVehicle) {
    const {width, height} = vehicleDisplaySize(playerVehicle, CAR_DISPLAY_H);
    return {w: width, h: height};
  }
  return {w: Math.round(CAR_DISPLAY_H * 0.55), h: CAR_DISPLAY_H};
}

function spawnObstacle(
  roadLeft: number,
  roadWidth: number,
  nextId: number,
  opts: {
    kind?: ObstacleKind;
    selectedVehicleId?: string;
    vehicles?: Map<string, LoadedVehicle>;
    movingChance: number;
    zigVxMin: number;
    zigVxMax: number;
    heavyBias: number;
  },
): Obstacle {
  const selectedVehicleId = opts.selectedVehicleId ?? DEFAULT_VEHICLE_ID;
  const vehicles = opts.vehicles;
  const playerVehicle = vehicles?.get(selectedVehicleId);

  let kind: ObstacleKind = opts.kind ?? 'vehicle';
  let vehicleId: string | undefined;
  let w: number;
  let h: number;

  if (kind === 'heart') {
    ({w, h} = HEART_SIZE);
  } else {
    kind = 'vehicle';
    vehicleId = pickObstacleVehicleId(selectedVehicleId, vehicles?.keys(), opts.heavyBias);
    ({w, h} = sizeForObstacleVehicle(vehicleId, vehicles, playerVehicle));
  }

  const laneW = roadWidth / LANE_COUNT;
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const laneCenter = roadLeft + laneW * (lane + 0.5);
  const jitter = (Math.random() - 0.5) * laneW * 0.28;
  const minX = roadLeft + w * 0.55;
  const maxX = roadLeft + roadWidth - w * 0.55;
  const moving = kind !== 'heart' && Math.random() < opts.movingChance;
  const zig =
    opts.zigVxMin + Math.random() * Math.max(0, opts.zigVxMax - opts.zigVxMin);
  return {
    id: nextId,
    x: clamp(laneCenter + jitter, minX, maxX),
    y: -h - 8,
    w,
    h,
    kind,
    vehicleId,
    speedMul: obstacleSpeedMul(kind),
    vx: moving ? (Math.random() < 0.5 ? -1 : 1) * zig : 0,
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

function drawTopDownTree(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  // 위에서 본 나무 — 수관 원 + 가운데 줄기
  ctx.fillStyle = '#558b2f';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7cb342';
  ctx.beginPath();
  ctx.arc(x - r * 0.18, y - r * 0.2, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#33691e';
  ctx.beginPath();
  ctx.arc(x + r * 0.22, y + r * 0.15, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5d4037';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
}

function drawRoadsideTrees(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  roadLeft: number,
  roadWidth: number,
  scroll: number,
) {
  const period = 118;
  const offset = scroll % period;
  const leftCx = roadLeft * 0.48;
  const rightCx = roadLeft + roadWidth + (w - roadLeft - roadWidth) * 0.52;

  for (let row = -2; row < Math.ceil(h / period) + 2; row += 1) {
    const y = row * period + offset;
    // 띄엄띄엄 — 홀수 행만 / 좌우 어긋나게
    if (row % 2 === 0) {
      drawTopDownTree(ctx, leftCx + ((row * 17) % 11) - 5, y, 14 + (Math.abs(row) % 3) * 2);
    } else {
      drawTopDownTree(ctx, rightCx + ((row * 13) % 9) - 4, y + 18, 13 + (Math.abs(row) % 4));
    }
    if (row % 3 === 0) {
      drawTopDownTree(ctx, leftCx * 0.55, y + 42, 11);
    }
    if (row % 3 === 1) {
      drawTopDownTree(ctx, rightCx + (w - rightCx) * 0.35, y + 55, 12);
    }
  }
}

function drawRoad(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  roadLeft: number,
  roadWidth: number,
  scroll: number,
) {
  // 전체 잔디 (하늘색 없음)
  ctx.fillStyle = '#7cb342';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(104, 159, 56, 0.28)';
  for (let y = 0; y < h; y += 16) {
    const oy = (y + scroll * 0.35) % 16;
    ctx.fillRect(0, y - oy, roadLeft - 2, 6);
    ctx.fillRect(roadLeft + roadWidth + 2, y - oy, w - roadLeft - roadWidth, 6);
  }

  drawRoadsideTrees(ctx, w, h, roadLeft, roadWidth, scroll);

  ctx.fillStyle = '#ffd54f';
  ctx.fillRect(roadLeft - 6, 0, 6, h);
  ctx.fillRect(roadLeft + roadWidth, 0, 6, h);

  const asphalt = ctx.createLinearGradient(roadLeft, 0, roadLeft + roadWidth, 0);
  asphalt.addColorStop(0, '#616161');
  asphalt.addColorStop(0.5, '#757575');
  asphalt.addColorStop(1, '#616161');
  ctx.fillStyle = asphalt;
  ctx.fillRect(roadLeft, 0, roadWidth, h);

  // 4차선 → 점선 3개
  const dashH = 26;
  const gap = 20;
  const period = dashH + gap;
  const offset = scroll % period;
  const laneW = roadWidth / LANE_COUNT;
  ctx.fillStyle = '#fffde7';
  for (let lane = 1; lane < LANE_COUNT; lane += 1) {
    const lx = roadLeft + laneW * lane;
    const thick = lane === LANE_COUNT / 2 ? 5 : 3;
    for (let y = -period; y < h + period; y += period) {
      ctx.fillRect(lx - thick / 2, y + offset, thick, dashH);
    }
  }
}

function drawObstacle(
  ctx: CanvasRenderingContext2D,
  o: Obstacle,
  sprites: Partial<Record<ObstacleSpriteKind, HTMLImageElement>>,
  vehicles: Map<string, LoadedVehicle>,
) {
  const left = o.x - o.w / 2;
  const top = o.y;

  if (o.kind === 'vehicle' && o.vehicleId) {
    const v = vehicles.get(o.vehicleId);
    const img = v?.images[0];
    if (img && img.complete && img.naturalWidth > 0) {
      // 장애물 = 6시(위에서 내려옴), 플레이어와 동일 display 크기
      drawVehicleSprite(ctx, img, o.x, o.y + o.h / 2, o.w, o.h, {faceUp: false});
      return;
    }
    ctx.fillStyle = '#546e7a';
    roundRect(ctx, left, top, o.w, o.h, 8);
    ctx.fill();
    return;
  }

  if (o.kind === 'heart') {
    const img = sprites.heart;
    const bob = Math.sin(performance.now() / 220 + o.id) * 2.5;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, left, top + bob, o.w, o.h);
      ctx.restore();
      return;
    }
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
    speed: resolveCarDifficulty(0).speed,
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
  const obstaclesRef = useRef<Partial<Record<ObstacleSpriteKind, HTMLImageElement>>>({});
  const selectedVehicleRef = useRef(DEFAULT_VEHICLE_ID);
  const dragRef = useRef({active: false, pointerId: -1});
  const keysRef = useRef({left: false, right: false});

  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [assetsReady, setAssetsReady] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(DEFAULT_VEHICLE_ID);
  const [stageId, setStageId] = useState<CarStageId>(1);
  const [stageLabel, setStageLabel] = useState('연습 도로');
  const [stageBanner, setStageBanner] = useState<string | null>(null);
  const stageIdRef = useRef<CarStageId>(1);
  const stageBannerUntilRef = useRef(0);

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
    setStageId(1);
    setStageLabel('연습 도로');
    setStageBanner(null);
    stageIdRef.current = 1;
    stageBannerUntilRef.current = 0;
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
    setStageId(1);
    setStageLabel('연습 도로');
    setStageBanner(null);
    stageIdRef.current = 1;
    stageBannerUntilRef.current = 0;
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

    Promise.all([loadAllVehicles(CAR_RUN_VEHICLES), loadObstacleImages()])
      .then(([map, obstacles]) => {
        vehiclesRef.current = map;
        obstaclesRef.current = obstacles;
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
        const meters = game.distance / 10;
        const diff = resolveCarDifficulty(meters);
        game.speed = diff.speed;
        game.distance += game.speed * dt;
        game.scroll += game.speed * dt;

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

        let steerInput = 0;
        if (keysRef.current.left && !keysRef.current.right) steerInput = -1;
        else if (keysRef.current.right && !keysRef.current.left) steerInput = 1;
        else if (game.pointerX != null) {
          const dx = game.pointerX - game.carX;
          if (Math.abs(dx) > 10) steerInput = Math.sign(dx);
        }

        const speedRatio = game.speed / Math.max(100, diff.speedMin);
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
          .map((o) => {
            let x = o.x + o.vx * dt;
            let vx = o.vx;
            const minX = roadLeft + o.w * 0.55;
            const maxX = roadLeft + roadWidth - o.w * 0.55;
            if (x < minX) {
              x = minX;
              vx = Math.abs(vx);
            } else if (x > maxX) {
              x = maxX;
              vx = -Math.abs(vx);
            }
            return {
              ...o,
              x,
              vx,
              y: o.y + game.speed * o.speedMul * dt,
            };
          })
          .filter((o) => o.y < h + 60);

        if (now - game.lastSpawn >= diff.spawnGapMs) {
          const spawnOpts = {
            selectedVehicleId: selectedVehicleRef.current,
            vehicles: vehiclesRef.current,
            movingChance: diff.movingChance,
            zigVxMin: diff.zigVxMin,
            zigVxMax: diff.zigVxMax,
            heavyBias: diff.heavyBias,
          };
          if (Math.random() < diff.heartChance) {
            game.obstacles.push(
              spawnObstacle(roadLeft, roadWidth, game.nextId, {...spawnOpts, kind: 'heart'}),
            );
          } else {
            game.obstacles.push(spawnObstacle(roadLeft, roadWidth, game.nextId, spawnOpts));
          }
          game.nextId += 1;

          if (Math.random() < diff.doubleSpawnChance) {
            const extra = spawnObstacle(roadLeft, roadWidth, game.nextId, spawnOpts);
            extra.y -= 80 + Math.random() * 120;
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

      drawRoad(ctx, w, h, roadLeft, roadWidth, game.scroll);

      for (const o of game.obstacles) {
        drawObstacle(ctx, o, obstaclesRef.current, vehiclesRef.current);
      }

      if (vehicle) {
        const img = vehicle.images[0];
        if (img) {
          const blinking = now < game.invulnUntil && Math.floor(now / 90) % 2 === 0;
          drawVehicleSprite(
            ctx,
            img,
            game.carX,
            carY - carH / 2,
            carW,
            carH,
            {faceUp: true, alpha: blinking ? 0.35 : 1},
          );
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
            <div className="car-run__hud-stage" aria-label={`스테이지 ${stageId}`}>
              S{stageId} · {stageLabel}
            </div>
            <div className="car-run__hearts" aria-label={`하트 ${lives}개`}>
              {Array.from({length: lives}, (_, i) => (
                <img
                  key={i}
                  className="car-run__heart"
                  src="/car-run/obstacles/heart.png"
                  alt=""
                  aria-hidden
                  draggable={false}
                />
              ))}
            </div>
          </div>
        ) : null}

        {phase === 'playing' && stageBanner ? (
          <div className="car-run__stage-banner" aria-live="assertive">
            {stageBanner}
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
                <p className="car-run__setup-best">
                  도달 S{stageId} · {stageLabel}
                </p>
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
