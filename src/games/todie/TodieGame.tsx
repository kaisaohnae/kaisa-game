'use client';

import Link from 'next/link';
import React, {useEffect, useRef, useState} from 'react';
import './todie.css';
import {
  balanceSettings,
  buildStageSpawnPlan,
  clearItem,
  displaySettings,
  draftToItem,
  dropSettings,
  emptyEquipment,
  ensureHotbarConsumableSlots,
  EQUIP_SLOTS,
  extractGearToEnhanceStone,
  applyEnhanceStone,
  isExtractableGear,
  stageForEquipped,
  facingToCardinal,
  gameSettings,
  gearImageKey,
  inAttackRange,
  JOB_ART,
  jobLabel,
  jobSpeed,
  monsterAggro,
  monsterDrawSize,
  ownsSameUniqueGear,
  alreadyOwnedToast,
  pickMonsterSprite,
  getTileId,
  DEFAULT_MAP_TILE,
  tileDef,
  mapObjectDef,
  preloadAllTodieAssets,
  pickupOrAutoEquip,
  randDropCount,
  rollLootDrop,
  showNameOnGround,
  skillsFromBalance,
  starterGearItem,
  sumEquippedStats,
  stageTouchDamageMult,
  tierConfig,
  tierMeta,
  toggleEquipFromBag,
  unequipSlot,
  wrongJobColor,
  loadTodieMap,
  type ActionId,
  type Equipment,
  type GearSlot,
  type GearTier,
  type Item,
  type JobId,
  type LoadedImages,
  type MonsterDef,
  type MonsterImages,
  type MonsterTier,
  type RuntimeSkill,
  type TodieAssetBundle,
} from './content';
import {drawJobCharacter, drawSkillSprite, walkSheetFrameCount} from './render/drawCharacter';
import {drawDashTrail, drawSkillWorldFx} from './render/skillFx';

import {InventoryDock} from './ui/InventoryDock';
import {createTodieBgm, readBgmMuted, type TodieBgm} from './audio/proceduralBgm';

const WORLD = gameSettings.world.size;
const TILE = gameSettings.world.tileSize ?? 100;
const PLAYER_R = 18;
const HOTBAR = 5;
const BAG_SIZE = 80;
const TARGET_RANGE = 1000;
const MOB_CLICK_R = 36;
const CHASE_STOP = (gameSettings.combat?.player?.melee?.forward ?? 100) * 0.85;
/** 몹 강화: 플레이 1분마다 레벨 +1, 20분(레벨 20)에서 최대치로 고정 */
const MOB_SCALE_MAX_MINUTES = 20;
/** 레벨 1당 체력·공격력 배율 증가폭(10%) / 이동속도는 더 완만하게(2%) */
const MOB_SCALE_HP_DMG_PER_LEVEL = 0.1;
const MOB_SCALE_SPEED_PER_LEVEL = 0.02;

/** 경과 시간(초) → 몹 강화 레벨 (1분당 1, 20레벨에서 고정) */
function mobLevelAt(gameTimeSec: number) {
  return Math.min(Math.floor(gameTimeSec / 60), MOB_SCALE_MAX_MINUTES);
}

/** 초 → "시:분:초" (예: 1:05:07) */
function formatPlayTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
const NAME_STORAGE_KEY = 'todie_char_name';
const GEAR_STORAGE_KEY = 'todie_gear';
const BAG_STORAGE_KEY = 'todie_bag';
const MAP_NAME = '죽음의 황무지';
const NAME_MAX = 10;

const bal = balanceSettings;
const drops = dropSettings;
const ROLL_COST = bal.player.rollCost;
const MAX_ROLLS_EQUIV = bal.player.staminaRegenRolls;
const GROUND_TTL = drops.groundTtlSec;
const OWNED_TTL = (drops as {alreadyOwnedTtlSec?: number}).alreadyOwnedTtlSec ?? 1;
const PICKUP_R = drops.pickupRadius;

type Job = JobId;

type GroundDrop = {
  uid: number;
  x: number;
  y: number;
  item: Item;
  life: number;
  maxLife: number;
};

type Mob = {
  id: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  speed: number;
  kind: string; // monster folder id e.g. 'skeleton-warrior'
  title: string;
  tier: MonsterTier;
  ranged: boolean;
  facing: number; // atan2
  /** remaining attack-pose seconds (>0 → attack sprite) */
  attackT: number;
  /** cooldown until next swing may start (walk pose while waiting in range) */
  attackCd: number;
  hurt: number;
  aggro: boolean;
};

const isElite = (m: Mob) => m.tier === 'elite';
const isBoss = (m: Mob) => m.tier === 'boss';
const isFinalBoss = (m: Mob) => m.tier === 'final';
const isAnyBoss = (m: Mob) => m.tier === 'boss' || m.tier === 'final';

type Fx = {
  x: number;
  y: number;
  life: number;
  max: number;
  text?: string;
  color: string;
  r?: number;
  skillId?: string;
  facing?: number;
  /** procedural world VFX (warrior slash/spin/bash) */
  worldFx?: boolean;
};

type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  job: Job;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stamina: number;
  maxStamina: number;
  speed: number;
  rolling: number;
  invuln: number;
  atkCd: number;
  /** Remaining swing time (seconds) */
  swingT: number;
  swingMax: number;
  swingKind: string | null;
  /** Remaining absorb shield HP (mage 보호막) */
  shieldHp: number;
  shieldMax: number;
};

function distPointToSeg(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1e-6) return Math.hypot(apx, apy);
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function emptyBag(): Item[] {
  return Array.from({length: BAG_SIZE}, (_, i) => ({
    id: `slot-${i}`,
    kind: 'empty' as const,
    name: '',
    qty: 0,
    color: '#555',
    job: null,
    gearId: null,
    gearSlot: null,
    tier: null,
    enhance: 0,
  }));
}

type StageDef = {id: number; name: string; label: string};

const STAGE_DEFS: StageDef[] = [
  {id: 1, name: '죽음의 황무지', label: '스테이지 1 · 죽음의 황무지'},
  {id: 2, name: '죽음의 문', label: '스테이지 2 · 죽음의 문'},
  {id: 3, name: '죽음', label: '스테이지 3 · 죽음'},
  {id: 4, name: '영원한 죽음', label: '스테이지 4 · 영원한 죽음'},
];

function stageDef(id: number): StageDef {
  return STAGE_DEFS[Math.min(STAGE_DEFS.length, Math.max(1, id)) - 1] ?? STAGE_DEFS[0];
}

function canPickupItem(item: Item, job: JobId) {
  return item.job == null || item.job === job;
}

/** 금연마크처럼 빨간 ○ + ✕ (못 먹는 / 남의 직업 아이템) */
function drawForbidMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  const color = wrongJobColor();
  const lw = Math.max(2.2, radius * 0.14);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  const inset = radius * 0.52;
  ctx.beginPath();
  ctx.moveTo(cx - inset, cy - inset);
  ctx.lineTo(cx + inset, cy + inset);
  ctx.moveTo(cx + inset, cy - inset);
  ctx.lineTo(cx - inset, cy + inset);
  ctx.stroke();
  ctx.restore();
}

function readNameCookie() {
  if (typeof window === 'undefined') return '';
  try {
    const v = window.localStorage.getItem(NAME_STORAGE_KEY);
    return v ? v.slice(0, NAME_MAX) : '';
  } catch {
    return '';
  }
}

function writeNameCookie(name: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NAME_STORAGE_KEY, name.slice(0, NAME_MAX));
  } catch {
    /* ignore */
  }
}

function clearNameCookie() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(NAME_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

type SavedGearItem = {
  id: string;
  kind: 'gear';
  name: string;
  qty: number;
  color: string;
  job: JobId | null;
  gearId: string | null;
  gearSlot: GearSlot | null;
  tier: GearTier | null;
  enhance?: number;
};

type GearSave = {
  v: 1;
  name: string;
  job: JobId;
  /** May include legacy earring_l/r, ring_l/r from older cookies */
  equipped: Partial<Record<string, SavedGearItem | null>>;
};

const LEGACY_GEAR_SLOT_KEYS = ['earring_l', 'earring_r', 'ring_l', 'ring_r'] as const;

function gearSaveHasEquipped(save: GearSave | null | undefined): boolean {
  if (!save?.equipped) return false;
  if (EQUIP_SLOTS.some((s) => Boolean(save.equipped[s.id]))) return true;
  return LEGACY_GEAR_SLOT_KEYS.some((k) => Boolean(save.equipped[k]));
}

function serializeGearItem(it: Item): SavedGearItem | null {
  if (it.kind !== 'gear') return null;
  return {
    id: it.id,
    kind: 'gear',
    name: it.name,
    qty: it.qty,
    color: it.color,
    job: it.job,
    gearId: it.gearId,
    gearSlot: it.gearSlot,
    tier: it.tier,
    enhance: it.enhance ?? 0,
  };
}

function writeGearCookie(save: GearSave) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GEAR_STORAGE_KEY, JSON.stringify(save));
  } catch {
    /* ignore (private mode / quota) */
  }
}

function clearGearCookie() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(GEAR_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function clearAllTodieProgress() {
  clearNameCookie();
  clearGearCookie();
  clearBagCookie();
}

function readGearCookie(): GearSave | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(GEAR_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GearSave;
    if (!data || data.v !== 1 || (data.job !== 'warrior' && data.job !== 'mage')) return null;
    return data;
  } catch {
    return null;
  }
}

function equipmentFromSave(save: GearSave): Equipment {
  const eq = emptyEquipment();
  const legacySlot = (id: string): GearSlot | null => {
    if (id === 'earring_l' || id === 'earring_r') return 'earring';
    if (id === 'ring_l' || id === 'ring_r') return 'ring';
    if (
      id === 'head' ||
      id === 'armor' ||
      id === 'weapon' ||
      id === 'gloves' ||
      id === 'shoes' ||
      id === 'necklace' ||
      id === 'earring' ||
      id === 'ring'
    ) {
      return id;
    }
    return null;
  };
  const rawMap = save.equipped ?? {};
  for (const [key, raw] of Object.entries(rawMap)) {
    const slot = legacySlot(key);
    if (!slot || !raw || raw.kind !== 'gear') continue;
    if (eq[slot]) continue; // keep first if both L/R existed
    const gearId = raw.gearId
      ? raw.gearId.replace(/_(?:l|r)$/, '')
      : raw.gearId;
    eq[slot] = {
      id: raw.id || `saved-${slot}`,
      kind: 'gear',
      name: raw.name,
      qty: Math.max(1, raw.qty || 1),
      color: raw.color || '#aaa',
      job: raw.job,
      gearId,
      gearSlot: slot,
      tier: raw.tier,
      enhance: raw.enhance ?? 0,
    };
  }
  return eq;
}

function gearSaveFromEquipment(name: string, job: JobId, equipped: Equipment): GearSave {
  const equippedOut: GearSave['equipped'] = {};
  for (const s of EQUIP_SLOTS) {
    const it = equipped[s.id];
    equippedOut[s.id] = it ? serializeGearItem(it) : null;
  }
  return {v: 1, name: name.slice(0, NAME_MAX), job, equipped: equippedOut};
}

type SavedBagItem = {
  id: string;
  kind: Item['kind'];
  name: string;
  qty: number;
  color: string;
  job: JobId | null;
  gearId: string | null;
  gearSlot: GearSlot | null;
  tier: GearTier | null;
  enhance?: number;
};

type BagSave = {
  v: 1;
  job: JobId;
  items: (SavedBagItem | null)[];
};

function serializeBagItem(it: Item): SavedBagItem | null {
  if (it.kind === 'empty' || it.qty <= 0) return null;
  return {
    id: it.id,
    kind: it.kind,
    name: it.name,
    qty: it.qty,
    color: it.color,
    job: it.job,
    gearId: it.gearId,
    gearSlot: it.gearSlot,
    tier: it.tier,
    enhance: it.enhance ?? 0,
  };
}

function bagSaveFromBag(job: JobId, bag: Item[]): BagSave {
  return {v: 1, job, items: bag.map((it) => serializeBagItem(it))};
}

function writeBagCookie(save: BagSave) {
  if (typeof window === 'undefined') return;
  try {
    // Bag can hold up to 80 slots of Korean-named items — that easily blows past a
    // cookie's ~4KB budget (Korean text triple-encodes via encodeURIComponent), so this
    // persists to localStorage instead, which has no such practical size limit.
    window.localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(save));
  } catch {
    /* ignore (private mode / quota) */
  }
}

function clearBagCookie() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(BAG_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function readBagCookie(): BagSave | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(BAG_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as BagSave;
    if (!data || data.v !== 1 || !Array.isArray(data.items)) return null;
    if (data.job !== 'warrior' && data.job !== 'mage') return null;
    return data;
  } catch {
    return null;
  }
}

function bagItemFromSaved(raw: SavedBagItem, i: number): Item {
  return {
    id: raw.id || `slot-${i}`,
    kind: raw.kind,
    name: raw.name,
    qty: Math.max(0, raw.qty || 0),
    color: raw.color || '#555',
    job: raw.job ?? null,
    gearId: raw.gearId ?? null,
    gearSlot: raw.gearSlot ?? null,
    tier: raw.tier ?? null,
    enhance: raw.enhance ?? 0,
  };
}

/** Overlays saved bag contents onto a freshly-built bag (in place) — restores potions, mana, stones, wrong-job/duplicate gear, etc. */
function applyBagSave(save: BagSave, bag: Item[]) {
  for (let i = 0; i < bag.length; i += 1) {
    const raw = save.items[i];
    if (raw && raw.kind !== 'empty' && raw.qty > 0) {
      bag[i] = bagItemFromSaved(raw, i);
    }
  }
}


const NAME_SYLLABLES = [
  '가',
  '나',
  '다',
  '라',
  '마',
  '바',
  '사',
  '아',
  '자',
  '차',
  '카',
  '타',
  '파',
  '하',
] as const;

/** 가~하 중 3글자 무작위 조합 (예: 파다사) */
function randomCharName(): string {
  let out = '';
  for (let i = 0; i < 3; i += 1) {
    out += NAME_SYLLABLES[Math.floor(Math.random() * NAME_SYLLABLES.length)];
  }
  return out;
}

function confirmExitToMain() {
  if (window.confirm('게임을 종료하고 메인으로 돌아갈까요?')) {
    window.location.href = '/';
  }
}

function confirmFreshStart(wipeRef?: {current: boolean}) {
  if (!window.confirm('저장한 장비·이름을 모두 지우고 초기화할까요?')) return;
  if (wipeRef) wipeRef.current = true;
  clearAllTodieProgress();
  window.location.reload();
}

/** Tiny hash for procedural map tiles (0..1) */
function tileSeed(tx: number, ty: number, salt = 0) {
  let n = (tx * 374761393 + ty * 668265263 + salt * 982451653) >>> 0;
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return (n % 10000) / 10000;
}

function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * 0 = soft grass meadow, 1 = wasteland dirt.
 * Center spawn stays grassy; large wasteland lobes toward the outer map + inland patches.
 */
function biomeWasteland(tx: number, ty: number): number {
  const tiles = WORLD / TILE;
  const nx = tx / tiles;
  const ny = ty / tiles;
  const cx = nx - 0.5;
  const cy = ny - 0.5;
  const dist = Math.hypot(cx, cy);

  // outer ring → more wasteland
  const ring = smoothstep((dist - 0.18) / 0.32);

  // large soft lobes (inland wasteland pockets)
  const nA = tileSeed(Math.floor(tx / 14), Math.floor(ty / 14), 11);
  const nB = tileSeed(Math.floor(tx / 9), Math.floor(ty / 9), 29);
  const nC = tileSeed(Math.floor(tx / 22), Math.floor(ty / 22), 71);
  const lobes = nA * 0.45 + nB * 0.35 + nC * 0.2;

  // pull a NW / SE wasteland belt so the map reads as composed regions
  const belt =
    smoothstep(1 - Math.abs(nx + ny - 1.05) / 0.42) * 0.55 +
    smoothstep(1 - Math.abs(nx - ny) / 0.55) * 0.25;

  let w = ring * 0.7 + (lobes - 0.42) * 1.35 + belt * 0.35;
  // keep a clear grassy basin around spawn
  w *= 1 - smoothstep(1 - dist / 0.14) * 0.85;
  return Math.min(1, Math.max(0, w));
}

function VirtualJoystick({
  joystickRef,
  knobElRef,
}: {
  joystickRef: React.RefObject<{dx: number; dy: number; active: boolean}>;
  knobElRef: React.RefObject<HTMLDivElement | null>;
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const ptrId = useRef<number | null>(null);
  const baseRect = useRef({cx: 0, cy: 0, r: 0});

  const moveKnob = (dx: number, dy: number) => {
    const el = knobElRef.current;
    const base = baseRef.current;
    if (!el || !base) return;
    const r = base.offsetWidth / 2;
    const len = Math.hypot(dx, dy);
    const clamped = Math.min(len, 1);
    const nx = len > 0 ? (dx / len) * clamped : 0;
    const ny = len > 0 ? (dy / len) * clamped : 0;
    el.style.left = `${r + nx * r}px`;
    el.style.top = `${r + ny * r}px`;
  };

  const update = (clientX: number, clientY: number) => {
    const {cx, cy, r} = baseRect.current;
    let dx = (clientX - cx) / r;
    let dy = (clientY - cy) / r;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    joystickRef.current.dx = dx;
    joystickRef.current.dy = dy;
    joystickRef.current.active = true;
    moveKnob(dx, dy);
  };

  const onDown = (e: React.PointerEvent) => {
    if (ptrId.current != null) return;
    ptrId.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const el = baseRef.current!;
    const rect = el.getBoundingClientRect();
    baseRect.current = {cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, r: rect.width / 2};
    update(e.clientX, e.clientY);
  };

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerId !== ptrId.current) return;
    update(e.clientX, e.clientY);
  };

  const onUp = (e: React.PointerEvent) => {
    if (e.pointerId !== ptrId.current) return;
    ptrId.current = null;
    joystickRef.current.dx = 0;
    joystickRef.current.dy = 0;
    joystickRef.current.active = false;
    moveKnob(0, 0);
  };

  return (
    <div
      className="todie__joystick-zone"
      ref={baseRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className="todie__joystick-base" />
      <div
        className="todie__joystick-knob"
        ref={knobElRef}
        style={{left: '50%', top: '50%'}}
      />
    </div>
  );
}

export default function TodieGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bagRef = useRef<Item[]>(emptyBag());
  const equippedRef = useRef<Equipment>(emptyEquipment());
  const toastFnRef = useRef<(msg: string) => void>(() => {});

  const [draftName, setDraftName] = useState('');
  const [nameError, setNameError] = useState('');
  const [started, setStarted] = useState(false);
  const [charName, setCharName] = useState('');
  const [startJob, setStartJob] = useState<Job>('warrior');
  const [pickJobUi, setPickJobUi] = useState<Job>('warrior');
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [, setBagTick] = useState(0);
  const assetsRef = useRef<TodieAssetBundle | null>(null);
  const [assetsVersion, setAssetsVersion] = useState(0);
  const [hasGearSave, setHasGearSave] = useState(false);
  const [showRestart, setShowRestart] = useState(false);
  const setShowRestartRef = useRef(setShowRestart);
  setShowRestartRef.current = setShowRestart;
  const wipeProgressRef = useRef(false);
  /** 인벤 기본: 최소(접힘) */
  const [invExpanded, setInvExpanded] = useState(false);
  /** 인벤 열림 여부를 게임 루프(effect)에서 읽기 위한 ref */
  const invExpandedRef = useRef(invExpanded);
  invExpandedRef.current = invExpanded;
  /** 현재 스테이지(1~3) — 장착 장비 등급으로 판정 */
  const stageRef = useRef(1);
  const [stageLabel, setStageLabel] = useState(STAGE_DEFS[0].label);
  /** 게임 루프(effect) 안에서 정의되는 스테이지 전환 처리를 바깥에서 트리거하기 위한 ref */
  const stageTransitionRef = useRef<(stage: number) => void>(() => {});
  /** Virtual joystick direction (normalized -1..1) for mobile */
  const joystickRef = useRef({dx: 0, dy: 0, active: false});
  const knobElRef = useRef<HTMLDivElement | null>(null);
  const bgmRef = useRef<TodieBgm | null>(null);
  const [bgmMuted, setBgmMuted] = useState(() => readBgmMuted());
  /** 플레이 시간 (초 단위, 시작 후 1초마다 증가) */
  const [playSeconds, setPlaySeconds] = useState(0);

  const ensureBgm = () => {
    if (!bgmRef.current) {
      bgmRef.current = createTodieBgm({volume: 0.38, muted: bgmMuted});
    }
    return bgmRef.current;
  };

  const toggleBgmMute = () => {
    const next = !bgmMuted;
    setBgmMuted(next);
    ensureBgm().setMuted(next);
  };

  const restartGame = () => {
    bgmRef.current?.stop();
    window.location.reload();
  };

  useEffect(() => {
    const savedName = readNameCookie();
    setDraftName(savedName || randomCharName());
    const gear = readGearCookie();
    if (gear?.job === 'warrior' || gear?.job === 'mage') {
      setPickJobUi(gear.job);
      setHasGearSave(gearSaveHasEquipped(gear));
    } else {
      // Fresh gate: randomize initial job (avoid SSR/client hydration mismatch).
      setPickJobUi(Math.random() < 0.5 ? 'warrior' : 'mage');
    }
  }, []);

  useEffect(() => {
    if (!started) return;
    const persist = () => {
      if (wipeProgressRef.current) {
        clearAllTodieProgress();
        return;
      }
      writeGearCookie(gearSaveFromEquipment(charName, startJob, equippedRef.current));
      writeBagCookie(bagSaveFromBag(startJob, bagRef.current));
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') persist();
    };
    window.addEventListener('beforeunload', persist);
    document.addEventListener('visibilitychange', onHide);
    const id = window.setInterval(persist, 8000);
    return () => {
      window.removeEventListener('beforeunload', persist);
      document.removeEventListener('visibilitychange', onHide);
      window.clearInterval(id);
      persist();
    };
  }, [started, charName, startJob]);

  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => {
      setPlaySeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [started]);

  /** Block browser back / forward while on this game page */
  useEffect(() => {
    const lock = () => {
      window.history.pushState({todieLock: 1}, '', window.location.href);
    };
    lock();
    const onPop = () => lock();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  const syncBag = () => {
    ensureHotbarConsumableSlots(bagRef.current);
    setBagTick((t) => t + 1);
    if (started) {
      writeGearCookie(gearSaveFromEquipment(charName, startJob, equippedRef.current));
      writeBagCookie(bagSaveFromBag(startJob, bagRef.current));
      const newStage = stageForEquipped(equippedRef.current);
      if (newStage > stageRef.current) {
        stageRef.current = newStage;
        stageTransitionRef.current(newStage);
      }
    }
  };

  const begin = async () => {
    const n = (draftName.trim() || randomCharName()).slice(0, NAME_MAX);
    if (loadingAssets) return;
    setDraftName(n);
    setLoadingAssets(true);
    setNameError('');
    // Unlock + keep gesture chain before awaits (autoplay policy).
    const bgm = ensureBgm();
    try {
      await bgm.unlock();
    } catch {
      /* start() will retry */
    }
    try {
      const savedForStage = readGearCookie();
      const restoreForStage =
        savedForStage &&
        savedForStage.job === pickJobUi &&
        gearSaveHasEquipped(savedForStage);
      const initialStage =
        restoreForStage && savedForStage
          ? stageForEquipped(equipmentFromSave(savedForStage))
          : 1;
      stageRef.current = initialStage;
      setStageLabel(stageDef(initialStage).label);

      const bundle = await preloadAllTodieAssets(initialStage);
      assetsRef.current = bundle;
      setAssetsVersion((v) => v + 1);
      writeNameCookie(n);
      setCharName(n);
      setStartJob(pickJobUi);

      const bag = emptyBag();
      bag[0] = {
        id: 'start-p',
        kind: 'potion',
        name: '체력포션',
        qty: 3,
        color: '#ef5350',
        job: null,
        gearId: null,
        gearSlot: null,
        tier: null,
        enhance: 0,
      };
      bag[1] = {
        id: 'start-m',
        kind: 'mana',
        name: '마나포션',
        qty: 3,
        color: '#42a5f5',
        job: null,
        gearId: null,
        gearSlot: null,
        tier: null,
        enhance: 0,
      };

      const saved = readGearCookie();
      const restore =
        saved &&
        saved.job === pickJobUi &&
        gearSaveHasEquipped(saved);

      if (restore && saved) {
        equippedRef.current = equipmentFromSave(saved);
        bagRef.current = bag;
        writeGearCookie(gearSaveFromEquipment(n, pickJobUi, equippedRef.current));
      } else {
        const stick = draftToItem(starterGearItem(pickJobUi));
        stick.id = 'start-stick';
        bag[2] = stick;
        bagRef.current = bag;
        const eq = emptyEquipment();
        eq.weapon = {...stick, qty: 1};
        clearItem(bag[2]);
        equippedRef.current = eq;
        writeGearCookie(gearSaveFromEquipment(n, pickJobUi, eq));
      }
      const savedBagForStage = readBagCookie();
      if (savedBagForStage && savedBagForStage.job === pickJobUi) {
        applyBagSave(savedBagForStage, bagRef.current);
      }
      ensureHotbarConsumableSlots(bagRef.current);
      // Start BGM in the same turn as gameplay begin (after unlock finished).
      void bgm.start();
      setStarted(true);
    } catch (err) {
      console.error(err);
      setNameError('이미지 로딩에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    if (!started) return;
    const bgm = ensureBgm();
    // begin() already called start(); this covers remount / Strict Mode.
    void bgm.start();
    return () => {
      bgm.stop();
    };
    // intentionally only on enter/leave gameplay
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const bgm = bgmRef.current;
    if (!bgm) return;
    if (showRestart) bgm.pause();
    else void bgm.start();
  }, [started, showRestart]);

  useEffect(() => {
    return () => {
      bgmRef.current?.dispose();
      bgmRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!started) return;

    const canvas = canvasRef.current;
    const mini = miniRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !mini || !wrap) return;

    const ctx = canvas.getContext('2d');
    const mctx = mini.getContext('2d');
    if (!ctx || !mctx) return;

    const job = startJob;
    const jobBal = bal.player.jobs[job];
    const player: Player = {
      x: WORLD / 2,
      y: WORLD / 2,
      vx: 0,
      vy: 0,
      facing: 0,
      job,
      hp: bal.player.maxHp,
      maxHp: bal.player.maxHp,
      mp: bal.player.maxMp,
      maxMp: bal.player.maxMp,
      stamina: bal.player.maxStamina,
      maxStamina: bal.player.maxStamina,
      speed: jobSpeed(job),
      rolling: 0,
      invuln: 0,
      atkCd: 0,
      swingT: 0,
      swingMax: 0,
      swingKind: null,
      shieldHp: 0,
      shieldMax: 0,
    };

    const skills: RuntimeSkill[] = skillsFromBalance(job);
    const inventory = bagRef.current;
    const jobImages: LoadedImages | null = assetsRef.current?.jobs[job] ?? null;
    const gearImages: Record<string, HTMLImageElement> = assetsRef.current?.gear ?? {};
    const consumableImages: Record<string, HTMLImageElement> =
      assetsRef.current?.consumables ?? {};
    const mobImages: MonsterImages = assetsRef.current?.mobs ?? {};
    const tileImages = assetsRef.current?.tiles ?? {};
    const objectImages = assetsRef.current?.objects ?? {};
    let worldMap = assetsRef.current?.map ?? null;


    let mobs: Mob[] = [];
    let fx: Fx[] = [];
    let groundDrops: GroundDrop[] = [];
    let nextDropUid = 1;
    let wrongJobToastCd = 0;
    let projectiles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      dmg: number;
      color: string;
      hitR: number;
    }[] = [];
    let camX = player.x;
    let camY = player.y;
    let camFollow = true;
    let toast = '';
    let toastT = 0;
    let killCount = 0;
    let nextMobId = 1;
    let alive = true;
    let gameTime = 0;
    /** Absolute gameTime when a world respawn should fire */
    let pendingRespawns: {at: number; tier: MonsterTier}[] = [];
    let moveTarget: {x: number; y: number} | null = null;
    let targetMobId: number | null = null;
    let chaseTarget = false;

    /** Canvas drag-to-move (acts like a joystick centered on drag start point) */
    const canvasDrag = {active: false, pointerId: -1, startX: 0, startY: 0, dx: 0, dy: 0};
    const DRAG_DEAD = 12;
    const DRAG_MAX = 120;
    let screenW = 800;
    let screenH = 600;

    /** Use KeyboardEvent.code so IME/layout can't stick WASD */
    const keys = new Set<string>();
    const MINI_FULL = {w: 320, h: 320};
    const miniBox = {
      w: MINI_FULL.w,
      h: MINI_FULL.h,
      dragging: false,
      lastX: 0,
      lastY: 0,
      interactive: true,
    };

    const clearKeys = () => keys.clear();

    const clampCam = () => {
      const halfW = screenW / 2;
      const halfH = screenH / 2;
      if (WORLD <= screenW) camX = WORLD / 2;
      else camX = Math.max(halfW, Math.min(WORLD - halfW, camX));
      if (WORLD <= screenH) camY = WORLD / 2;
      else camY = Math.max(halfH, Math.min(WORLD - halfH, camY));
    };

    const showToast = (msg: string) => {
      toast = msg;
      toastT = 2.2;
    };
    toastFnRef.current = showToast;

    /** 스테이지2/3 전용 맵이 스튜디오에 저장돼 있으면 갈아끼우고, 없으면 기존 맵 유지 */
    const reloadStageMap = async (stage: number) => {
      try {
        const m = await loadTodieMap(stage);
        worldMap = m;
      } catch {
        /* keep current map */
      }
    };

    stageTransitionRef.current = (stage: number) => {
      const def = stageDef(stage);
      setStageLabel(def.label);
      const req =
        stage >= 4
          ? '신화템 +10'
          : stage === 3
            ? '신화템'
            : '영웅템';
      showToast(`🎉 ${def.label} 진입! 전 슬롯 ${req} 이상 달성`);
      toastT = 4.5;
      void reloadStageMap(stage);
    };

    const applyMinimapLayout = () => {
      const compact = screenW < 1000;
      miniBox.w = compact ? Math.round(MINI_FULL.w / 2) : MINI_FULL.w;
      miniBox.h = compact ? Math.round(MINI_FULL.h / 2) : MINI_FULL.h;
      miniBox.interactive = !compact;
      if (compact) {
        miniBox.dragging = false;
        camFollow = true;
      }
      mini.classList.toggle('is-compact', compact);
      mini.classList.toggle('is-disabled', compact);
      mini.style.pointerEvents = compact ? 'none' : 'auto';
      mini.style.cursor = compact ? 'default' : 'grab';
    };

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      screenW = Math.max(1, Math.floor(r.width));
      screenH = Math.max(1, Math.floor(r.height));
      canvas.width = Math.floor(screenW * devicePixelRatio);
      canvas.height = Math.floor(screenH * devicePixelRatio);
      canvas.style.width = `${screenW}px`;
      canvas.style.height = `${screenH}px`;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      applyMinimapLayout();
      mini.width = miniBox.w * devicePixelRatio;
      mini.height = miniBox.h * devicePixelRatio;
      mini.style.width = `${miniBox.w}px`;
      mini.style.height = `${miniBox.h}px`;
      mctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      clampCam();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const margin = gameSettings.world.margin ?? 80;

    const makeMobFromDef = (
      x: number,
      y: number,
      def: MonsterDef,
      tier: MonsterTier,
    ): Mob => {
      const cfg = tierConfig(tier);
      const mobLevel = mobLevelAt(gameTime);
      const scaleHpDmg = 1 + mobLevel * MOB_SCALE_HP_DMG_PER_LEVEL;
      const scaleSpeed = 1 + mobLevel * MOB_SCALE_SPEED_PER_LEVEL;
      const maxHp = Math.round(cfg.hp * scaleHpDmg);
      return {
        id: nextMobId++,
        x,
        y,
        homeX: x,
        homeY: y,
        hp: maxHp,
        maxHp,
        speed: cfg.speed * scaleSpeed,
        kind: def.id,
        title: def.title,
        tier,
        ranged: def.ranged,
        facing: Math.random() * Math.PI * 2,
        attackT: 0,
        attackCd: 0,
        hurt: 0,
        aggro: false,
      };
    };

    const spawnAllForStage = () => {
      const plan = buildStageSpawnPlan(stageRef.current);
      for (const row of plan) {
        const x = rand(margin, WORLD - margin);
        const y = rand(margin, WORLD - margin);
        mobs.push(makeMobFromDef(x, y, row.def, row.tier));
      }
    };

    const spawnOneOfTier = (tier: MonsterTier) => {
      const candidates = buildStageSpawnPlan(stageRef.current).filter(
        (row) => row.tier === tier,
      );
      if (candidates.length === 0) return;
      const row = candidates[Math.floor(Math.random() * candidates.length)]!;
      const x = rand(margin, WORLD - margin);
      const y = rand(margin, WORLD - margin);
      mobs.push(makeMobFromDef(x, y, row.def, tier));
    };

    const scheduleRespawn = (tier: MonsterTier) => {
      pendingRespawns.push({
        at: gameTime + tierConfig(tier).respawnSec,
        tier,
      });
      pendingRespawns.sort((a, b) => a.at - b.at);
    };

    const pullAggro = (m: Mob) => {
      // First aggroer locks; do not retarget until deaggro
      if (!m.aggro) m.aggro = true;
    };

    spawnAllForStage();

    const gearPower = () => sumEquippedStats(equippedRef.current);

    const applyGearVitals = () => {
      const g = gearPower();
      const nextMax = bal.player.maxHp + g.hp;
      if (player.maxHp !== nextMax) {
        const ratio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
        player.maxHp = nextMax;
        player.hp = Math.min(nextMax, Math.max(1, Math.round(nextMax * ratio)));
      }
    };

    const spawnGroundDrop = (x: number, y: number, item: Item, scatter = 42) => {
      const ang = Math.random() * Math.PI * 2;
      const dist = rand(18, scatter);
      const owned = ownsSameUniqueGear(inventory, equippedRef.current, item);
      const ttl = owned ? OWNED_TTL : GROUND_TTL;
      groundDrops.push({
        uid: nextDropUid++,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        item,
        life: ttl,
        maxLife: ttl,
      });
    };

    /** 가방·장착 아이템의 약 50%를 랜덤으로 바닥에 드랍 */
    const dropHalfItemsOnDeath = () => {
      type Entry =
        | {source: 'bag'; index: number}
        | {source: 'equip'; slot: GearSlot};
      const entries: Entry[] = [];
      for (let i = 0; i < inventory.length; i += 1) {
        if (inventory[i].kind !== 'empty') entries.push({source: 'bag', index: i});
      }
      for (const s of EQUIP_SLOTS) {
        if (equippedRef.current[s.id]) entries.push({source: 'equip', slot: s.id});
      }
      if (entries.length === 0) return 0;

      for (let i = entries.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = entries[i];
        entries[i] = entries[j];
        entries[j] = tmp;
      }

      const dropCount = Math.round(entries.length * 0.5);
      let dropped = 0;
      for (let i = 0; i < dropCount; i += 1) {
        const e = entries[i];
        if (e.source === 'bag') {
          const it = inventory[e.index];
          if (it.kind === 'empty') continue;
          spawnGroundDrop(player.x, player.y, {...it}, 90);
          clearItem(it);
          dropped += 1;
        } else {
          const it = equippedRef.current[e.slot];
          if (!it) continue;
          spawnGroundDrop(player.x, player.y, {...it}, 90);
          equippedRef.current[e.slot] = null;
          dropped += 1;
        }
      }
      syncBag();
      return dropped;
    };

    const hurtPlayer = (dmg: number) => {
      if (player.rolling > 0) return;
      const def = gearPower().def;
      let remaining = Math.max(1, Math.round(dmg - def * 0.35));

      if (player.shieldHp > 0) {
        const absorbed = Math.min(player.shieldHp, remaining);
        player.shieldHp -= absorbed;
        remaining -= absorbed;
        fx.push({
          x: player.x,
          y: player.y - 34,
          life: 0.55,
          max: 0.55,
          text: `막음 ${absorbed}`,
          color: '#80deea',
        });
        if (player.shieldHp <= 0) {
          player.shieldHp = 0;
          player.shieldMax = 0;
          showToast('보호막 파괴!');
          fx.push({
            x: player.x,
            y: player.y,
            life: 0.35,
            max: 0.35,
            color: '#4dd0e1',
            r: 64,
            skillId: 'shield-break',
            worldFx: true,
          });
        }
        if (remaining <= 0) {
          player.invuln = Math.max(player.invuln, 0.15);
          return;
        }
      }

      if (player.invuln > 0) return;
      const taken = remaining;
      player.hp = Math.max(0, player.hp - taken);
      player.invuln = 0.55;
      fx.push({
        x: player.x,
        y: player.y - 28,
        life: 0.7,
        max: 0.7,
        text: `-${taken}`,
        color: '#ff8a80',
      });
      if (player.hp <= 0) {
        alive = false;
        const n = dropHalfItemsOnDeath();
        clearGearCookie();
        setShowRestartRef.current(true);
        showToast(
          n > 0
            ? `쓰러졌다… 아이템 ${n}개 떨어짐 · R로 재시작`
            : '쓰러졌다… R로 재시작',
        );
      }
    };

    const killMob = (m: Mob) => {
      const cfg = tierConfig(m.tier);
      const dropN = randDropCount(m.tier);
      let lastName = '';
      for (let i = 0; i < dropN; i += 1) {
        const loot = draftToItem(
          rollLootDrop({
            job: player.job,
            bag: inventory,
            equipped: equippedRef.current,
            potionChance: cfg.potionChance,
            tierWeights: cfg.tierWeights,
          }),
        );
        lastName = loot.name;
        spawnGroundDrop(m.x, m.y, loot);
      }
      killCount += 1;
      const tierLabel = cfg.label;
      const special = isElite(m) || isAnyBoss(m);
      fx.push({
        x: m.x,
        y: m.y,
        life: 1.1,
        max: 1.1,
        text: special ? `${m.title} 처치! x${dropN}` : `+${lastName}`,
        color: isFinalBoss(m)
          ? '#e1bee7'
          : isBoss(m)
            ? '#ff6d00'
            : isElite(m)
              ? '#ce93d8'
              : '#fff59d',
      });
      showToast(
        special
          ? `${tierLabel} 처치 · 아이템 ${dropN}개!`
          : `${lastName} 드랍!`,
      );
      mobs = mobs.filter((x) => x.id !== m.id);
      scheduleRespawn(m.tier);
      if (targetMobId === m.id) {
        targetMobId = null;
        chaseTarget = false;
        moveTarget = null;
      }
    };

    const tryPickupDrops = () => {
      if (!alive) return;
      const keep: GroundDrop[] = [];
      for (const d of groundDrops) {
        const near = Math.hypot(d.x - player.x, d.y - player.y) <= PICKUP_R;
        if (!near) {
          keep.push(d);
          continue;
        }
        if (ownsSameUniqueGear(inventory, equippedRef.current, d.item)) {
          if (wrongJobToastCd <= 0) {
            showToast(alreadyOwnedToast());
            wrongJobToastCd = drops.wrongJobToastCooldown;
          }
          // 이미 소지 → 짧게 남기고 사라짐
          d.life = Math.min(d.life, OWNED_TTL);
          d.maxLife = Math.min(d.maxLife, OWNED_TTL);
          keep.push(d);
          continue;
        }
        // 다른 직업 장비도 그대로 습득 — 장착은 못 해도 가방에 쌓이고,
        // 인벤에서 클릭하면 강화석으로 추출할 수 있음.
        const picked = pickupOrAutoEquip(
          inventory,
          equippedRef.current,
          d.item,
          player.job,
        );
        if (!picked.ok) {
          showToast('가방이 가득 찼어요');
          keep.push(d);
          continue;
        }
        syncBag();
        // 자동 장착은 머리 위 등급 도트로만 표시 (장착 토스트 생략)
        if (!picked.autoEquipped) {
          fx.push({
            x: d.x,
            y: d.y - 12,
            life: 0.6,
            max: 0.6,
            text: `+${d.item.name}`,
            color: d.item.color,
          });
          const wrongJobHint =
            d.item.kind === 'gear' && d.item.job && d.item.job !== player.job
              ? ' (다른 직업 · 강화석 추출 가능)'
              : '';
          showToast(`${d.item.name} 획득!${wrongJobHint}`);
        }
      }
      groundDrops = keep;
    };

    const damageMobsInCircle = (x: number, y: number, r: number, dmg: number) => {
      for (const m of mobs) {
        const dx = m.x - x;
        const dy = m.y - y;
        if (dx * dx + dy * dy <= r * r) {
          pullAggro(m);
          m.hp -= dmg;
          m.hurt = 0.2;
          fx.push({x: m.x, y: m.y - 20, life: 0.5, max: 0.5, text: `-${dmg}`, color: '#fff59d'});
          if (m.hp <= 0) killMob(m);
        }
      }
    };

    const useSkill = (index: number) => {
      if (!alive) return;
      const sk = skills[index];
      if (!sk || sk.cdLeft > 0 || player.mp < sk.mp) {
        if (sk && player.mp < sk.mp) showToast('마나 부족');
        return;
      }
      player.mp -= sk.mp;
      sk.cdLeft = sk.cd;
      const hit = sk.damage + gearPower().atk;

      const pushSkillFx = (
        x: number,
        y: number,
        life = displaySettings.skillFx.life,
        opts?: {worldFx?: boolean; r?: number},
      ) => {
        fx.push({
          x,
          y,
          life,
          max: life,
          color: sk.fxColor,
          r: opts?.r ?? sk.fxRadius,
          skillId: sk.id,
          facing: player.facing,
          worldFx: opts?.worldFx ?? true,
        });
      };

      const swingDur =
        (displaySettings as {attackSwing?: Record<string, number>}).attackSwing?.[sk.id] ?? 0.28;
      player.swingKind = sk.id;
      player.swingMax = swingDur;
      player.swingT = swingDur;

      if (sk.id === 'slash') {
        const offset = sk.offset ?? 36;
        const ax = player.x + Math.cos(player.facing) * offset;
        const ay = player.y + Math.sin(player.facing) * offset;
        damageMobsInCircle(ax, ay, sk.radius ?? 48, hit);
        pushSkillFx(ax, ay, 0.32, {r: sk.radius ?? 48});
      } else if (sk.id === 'spin') {
        damageMobsInCircle(player.x, player.y, sk.radius ?? 78, hit);
        pushSkillFx(player.x, player.y, 0.48, {r: sk.radius ?? 78});
      } else if (sk.id === 'bash') {
        const dash = sk.dashSpeed ?? 520;
        player.vx += Math.cos(player.facing) * dash;
        player.vy += Math.sin(player.facing) * dash;
        player.invuln = Math.max(player.invuln, sk.invuln ?? 0.35);
        const offset = sk.offset ?? 40;
        const ax = player.x + Math.cos(player.facing) * offset;
        const ay = player.y + Math.sin(player.facing) * offset;
        damageMobsInCircle(ax, ay, sk.radius ?? 55, hit);
        // impact at tip + trail ghosts behind
        pushSkillFx(ax, ay, 0.38, {r: sk.fxRadius ?? 50});
        for (let i = 1; i <= 3; i += 1) {
          const back = offset * 0.35 * i;
          const life = Math.max(0.12, 0.26 - i * 0.04);
          fx.push({
            x: player.x - Math.cos(player.facing) * back,
            y: player.y - Math.sin(player.facing) * back,
            life,
            max: life,
            color: sk.fxColor,
            skillId: 'bash-trail',
            facing: player.facing,
            worldFx: true,
          });
        }
      } else if (sk.id === 'bolt') {
        // Always fire 3 parallel-ish bolts (clearly separated)
        const spd = sk.projectileSpeed ?? 520;
        const count = 3;
        const spacing = sk.projectileSpacing ?? 34;
        const hitR = sk.projectileHitRadius ?? 48;
        const life = sk.projectileLife ?? 1.6;
        const dirX = Math.cos(player.facing);
        const dirY = Math.sin(player.facing);
        const sideX = -dirY;
        const sideY = dirX;
        const mid = (count - 1) / 2;
        for (let i = 0; i < count; i += 1) {
          const side = (i - mid) * spacing;
          // tiny fan so outer shots are obvious, still all hit a mid-range target
          const ang = player.facing + (i - mid) * 0.1;
          const vx = Math.cos(ang);
          const vy = Math.sin(ang);
          projectiles.push({
            x: player.x + dirX * 32 + sideX * side,
            y: player.y + dirY * 32 + sideY * side,
            vx: vx * spd,
            vy: vy * spd,
            life,
            dmg: hit,
            color: sk.fxColor,
            hitR,
          });
        }
        pushSkillFx(player.x + dirX * 24, player.y + dirY * 24, 0.18);
      } else if (sk.id === 'nova') {
        const r = sk.radius ?? 190;
        damageMobsInCircle(player.x, player.y, r, hit);
        pushSkillFx(player.x, player.y, 0.55, {r: sk.fxRadius ?? r, worldFx: true});
      } else if (sk.id === 'shield') {
        const absorb = sk.shieldHp ?? 100;
        player.shieldHp = absorb;
        player.shieldMax = absorb;
        pushSkillFx(player.x, player.y, 0.45);
        showToast(`보호막 +${absorb}`);
      }
    };

    const useItemSlot = (slot: number) => {
      if (!alive) return;
      // 0..2 skills (1..3), 3..4 items (4·5) → bag[0]=potion, bag[1]=mana (fixed)
      if (slot < 3) {
        useSkill(slot);
        return;
      }
      const item = inventory[slot - 3];
      if (!item || item.kind === 'empty' || item.qty <= 0) return;
      if (item.kind !== 'potion' && item.kind !== 'mana') {
        showToast('4·5번은 물약만 쓸 수 있어요');
        return;
      }

      if (item.kind === 'potion') {
        player.hp = Math.min(player.maxHp, player.hp + bal.items.potionHeal);
        showToast(`체력 회복 +${bal.items.potionHeal}`);
      } else {
        player.mp = Math.min(player.maxMp, player.mp + bal.items.manaRestore);
        showToast(`마나 회복 +${bal.items.manaRestore}`);
      }
      item.qty -= 1;
      if (item.qty <= 0) clearItem(item);
      syncBag();
    };

    const getNearbyMobs = () =>
      mobs
        .map((m) => ({m, d: Math.hypot(m.x - player.x, m.y - player.y)}))
        .filter((x) => x.d <= TARGET_RANGE)
        .sort((a, b) => {
          const angA = Math.atan2(a.m.y - player.y, a.m.x - player.x);
          const angB = Math.atan2(b.m.y - player.y, b.m.x - player.x);
          let da = angA - player.facing;
          let db = angB - player.facing;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          while (db > Math.PI) db -= Math.PI * 2;
          while (db < -Math.PI) db += Math.PI * 2;
          // closest to facing first, then by distance
          const fa = Math.abs(da);
          const fb = Math.abs(db);
          if (Math.abs(fa - fb) > 0.05) return fa - fb;
          return a.d - b.d;
        })
        .map((x) => x.m);

    const setMobTarget = (id: number | null, chase: boolean) => {
      targetMobId = id;
      chaseTarget = Boolean(id && chase);
      if (!id) return;
      const m = mobs.find((x) => x.id === id);
      if (m) {
        player.facing = Math.atan2(m.y - player.y, m.x - player.x);
        showToast('타겟 지정');
      }
    };

    const cycleTarget = (reverse = false) => {
      const list = getNearbyMobs();
      if (list.length === 0) {
        setMobTarget(null, false);
        showToast('근처 몹 없음');
        return;
      }
      let idx = list.findIndex((m) => m.id === targetMobId);
      if (idx < 0) idx = reverse ? 0 : -1;
      idx = reverse ? (idx - 1 + list.length) % list.length : (idx + 1) % list.length;
      setMobTarget(list[idx].id, true);
      camFollow = true;
    };

    const mobAtWorld = (wx: number, wy: number) => {
      let best: Mob | null = null;
      let bestD = Infinity;
      for (const m of mobs) {
        const limit = isFinalBoss(m)
          ? MOB_CLICK_R * 2.8
          : isBoss(m)
            ? MOB_CLICK_R * 2.0
            : isElite(m)
              ? MOB_CLICK_R * 1.25
              : MOB_CLICK_R;
        const d = Math.hypot(m.x - wx, m.y - wy);
        if (d <= limit && d < bestD) {
          bestD = d;
          best = m;
        }
      }
      return best;
    };

    const tryRoll = () => {
      if (!alive || player.rolling > 0) return;
      if (player.stamina < ROLL_COST) {
        showToast('스테미나 부족');
        return;
      }
      let dx = 0;
      let dy = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
      if (dx === 0 && dy === 0) {
        dx = Math.cos(player.facing);
        dy = Math.sin(player.facing);
      }
      const len = Math.hypot(dx, dy) || 1;
      const rollSpeed = jobBal.rollSpeed;
      player.vx = (dx / len) * rollSpeed;
      player.vy = (dy / len) * rollSpeed;
      player.rolling = jobBal.rollDuration;
      player.stamina -= ROLL_COST;
      player.invuln = Math.max(player.invuln, jobBal.rollInvuln);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      // Ctrl/Cmd+1~4 switches browser tabs — block while playing
      if ((e.ctrlKey || e.metaKey) && /^Digit[1-4]$/.test(code)) {
        e.preventDefault();
        return;
      }
      if (code === 'KeyR' && !alive) {
        window.location.reload();
        return;
      }
      if (
        code === 'KeyW' ||
        code === 'KeyA' ||
        code === 'KeyS' ||
        code === 'KeyD' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'Space' ||
        code === 'Tab'
      ) {
        e.preventDefault();
      }
      if (code === 'Tab') {
        cycleTarget(e.shiftKey);
        return;
      }
      keys.add(code);
      // WASD starts → cancel click-move / chase
      if (
        code === 'KeyW' ||
        code === 'KeyA' ||
        code === 'KeyS' ||
        code === 'KeyD' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight'
      ) {
        moveTarget = null;
        chaseTarget = false;
      }
      if (code === 'KeyI') {
        setInvExpanded((v) => !v);
        return;
      }
      if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') {
        tryRoll();
        return;
      }
      if (code.startsWith('Digit')) {
        const n = Number(code.slice(5));
        if (n >= 1 && n <= HOTBAR) useItemSlot(n - 1);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
    };

    const worldFromMini = (clientX: number, clientY: number) => {
      const rect = mini.getBoundingClientRect();
      const u = ((clientX - rect.left) / rect.width) * miniBox.w;
      const v = ((clientY - rect.top) / rect.height) * miniBox.h;
      return {u, v};
    };

    /** Viewport rect on full-world minimap — wider rectangle, slightly enlarged. */
    const getViewportMiniRect = () => {
      const trueVu = ((camX - screenW / 2) / WORLD) * miniBox.w;
      const trueVv = ((camY - screenH / 2) / WORLD) * miniBox.h;
      const trueVw = (screenW / WORLD) * miniBox.w;
      const trueVh = (screenH / WORLD) * miniBox.h;
      const aspect = Math.max(1.5, screenW / Math.max(1, screenH));
      const boost = 3.2;
      let vh = Math.max(16, trueVh * boost);
      let vw = Math.max(vh * aspect, trueVw * boost);
      const vu = trueVu + trueVw / 2 - vw / 2;
      const vv = trueVv + trueVh / 2 - vh / 2;
      return {vu, vv, vw, vh};
    };

    const onMiniDown = (e: PointerEvent) => {
      if (!miniBox.interactive) return;
      e.preventDefault();
      e.stopPropagation();
      const {u, v} = worldFromMini(e.clientX, e.clientY);
      const {vu, vv, vw, vh} = getViewportMiniRect();
      const pad = 8;
      const onRect =
        u >= vu - pad && u <= vu + vw + pad && v >= vv - pad && v <= vv + vh + pad;
      if (!onRect) return;
      miniBox.dragging = true;
      camFollow = false;
      miniBox.lastX = e.clientX;
      miniBox.lastY = e.clientY;
      mini.setPointerCapture(e.pointerId);
    };
    const onMiniMove = (e: PointerEvent) => {
      if (!miniBox.interactive || !miniBox.dragging) return;
      const rect = mini.getBoundingClientRect();
      const dxPx = ((e.clientX - miniBox.lastX) / rect.width) * miniBox.w;
      const dyPx = ((e.clientY - miniBox.lastY) / rect.height) * miniBox.h;
      miniBox.lastX = e.clientX;
      miniBox.lastY = e.clientY;
      const scale = WORLD / miniBox.w;
      camX += dxPx * scale;
      camY += dyPx * scale;
      clampCam();
    };
    const onMiniUp = () => {
      miniBox.dragging = false;
    };
    const onMiniDbl = () => {
      if (!miniBox.interactive) return;
      camFollow = true;
      showToast('카메라 추적 ON');
    };

    // hotbar hit boxes (CSS px, match canvas client coords)
    const hotbarHits: {i: number; x: number; y: number; w: number; h: number}[] = [];

    const isInGuardZone = (sx: number, sy: number, canvasH: number) => {
      const guardPad = 45;
      for (const h of hotbarHits) {
        if (
          sx >= h.x - guardPad && sx <= h.x + h.w + guardPad &&
          sy >= h.y - guardPad && sy <= h.y + h.h + guardPad
        ) return true;
      }
      const phone = canvasH <= 500 || (typeof window !== 'undefined' && window.innerWidth <= 500);
      const joySize = phone ? (window.innerWidth <= 400 ? 100 : 120) : 180;
      const joyLeft = phone ? (window.innerWidth <= 400 ? 8 : 10) : 18;
      const joyBottom = phone ? (window.innerWidth <= 400 ? 10 : 14) : 24;
      const joyGuard = 35;
      if (sx < joyLeft + joySize + joyGuard && sy > canvasH - joyBottom - joySize - joyGuard) return true;
      return false;
    };

    const onCanvasPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (!alive) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      for (const h of hotbarHits) {
        if (sx >= h.x && sx <= h.x + h.w && sy >= h.y && sy <= h.y + h.h) {
          useItemSlot(h.i);
          return;
        }
      }

      if (isInGuardZone(sx, sy, rect.height)) return;

      // Check mob click
      const worldX = camX - screenW / 2 + sx;
      const worldY = camY - screenH / 2 + sy;
      const hit = mobAtWorld(worldX, worldY);
      if (hit) {
        setMobTarget(hit.id, true);
        moveTarget = {x: hit.x, y: hit.y};
        camFollow = true;
        return;
      }

      // Start drag-to-move
      canvasDrag.active = true;
      canvasDrag.pointerId = e.pointerId;
      canvasDrag.startX = e.clientX;
      canvasDrag.startY = e.clientY;
      canvasDrag.dx = 0;
      canvasDrag.dy = 0;
      targetMobId = null;
      chaseTarget = false;
      moveTarget = null;
      canvas.setPointerCapture(e.pointerId);
      camFollow = true;
    };

    const onCanvasPointerMove = (e: PointerEvent) => {
      if (!canvasDrag.active || e.pointerId !== canvasDrag.pointerId) return;
      const rawDx = e.clientX - canvasDrag.startX;
      const rawDy = e.clientY - canvasDrag.startY;
      const dist = Math.hypot(rawDx, rawDy);
      if (dist < DRAG_DEAD) {
        canvasDrag.dx = 0;
        canvasDrag.dy = 0;
        return;
      }
      const effective = Math.min(dist, DRAG_MAX);
      const scale = effective / DRAG_MAX;
      canvasDrag.dx = (rawDx / dist) * scale;
      canvasDrag.dy = (rawDy / dist) * scale;
    };

    const onCanvasPointerUp = (e: PointerEvent) => {
      if (!canvasDrag.active || e.pointerId !== canvasDrag.pointerId) return;
      canvasDrag.active = false;
      canvasDrag.dx = 0;
      canvasDrag.dy = 0;
    };

    const onContextMenu = (e: Event) => {
      e.preventDefault();
    };

    const blockZoomGesture = (e: Event) => {
      e.preventDefault();
    };
    const blockCtrlWheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };

    const onBlur = () => clearKeys();
    const onVisibility = () => {
      if (document.hidden) clearKeys();
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    canvas.addEventListener('pointerdown', onCanvasPointerDown);
    canvas.addEventListener('pointermove', onCanvasPointerMove);
    canvas.addEventListener('pointerup', onCanvasPointerUp);
    canvas.addEventListener('pointercancel', onCanvasPointerUp);
    wrap.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('gesturestart', blockZoomGesture, {passive: false});
    document.addEventListener('gesturechange', blockZoomGesture, {passive: false});
    document.addEventListener('gestureend', blockZoomGesture, {passive: false});
    window.addEventListener('wheel', blockCtrlWheel, {passive: false});
    mini.addEventListener('pointerdown', onMiniDown);
    mini.addEventListener('pointermove', onMiniMove);
    mini.addEventListener('pointerup', onMiniUp);
    mini.addEventListener('pointercancel', onMiniUp);
    mini.addEventListener('dblclick', onMiniDbl);

    const drawMob = (c: CanvasRenderingContext2D, m: Mob) => {
      c.save();
      c.translate(m.x, m.y);
      if (m.hurt > 0) c.translate(rand(-2, 2), rand(-2, 2));

      const size = monsterDrawSize(m.tier);
      const attacking = m.attackT > 0;
      const chasing =
        m.aggro && !attacking;
      const returningHome =
        !m.aggro && !attacking && Math.hypot(m.x - m.homeX, m.y - m.homeY) > 8;
      const moving = chasing || returningHome;
      // 이동: walk/idle 교차, 공격: attack, 정지: idle
      const walkTick = Math.floor(performance.now() / (1000 / 8) + m.id);
      const pose = attacking
        ? 'attack'
        : moving
          ? walkTick % 2 === 0
            ? 'walk'
            : 'idle'
          : 'idle';
      const img = pickMonsterSprite(mobImages, m.kind, pose, m.facing);
      const bob = moving ? Math.abs(Math.sin(performance.now() / 90 + m.id)) * 3 : 0;
      const pulse = isAnyBoss(m)
        ? 1 +
          Math.sin(performance.now() / 180) *
            (isFinalBoss(m) ? 0.065 : 0.035)
        : 1;

      // soft ground shadow
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.beginPath();
      c.ellipse(0, size * 0.38, size * 0.32, size * 0.1, 0, 0, Math.PI * 2);
      c.fill();

      if (isElite(m)) {
        const aura = c.createRadialGradient(0, 0, size * 0.15, 0, 0, size * 0.55);
        aura.addColorStop(0, 'rgba(206, 147, 216, 0.35)');
        aura.addColorStop(1, 'rgba(206, 147, 216, 0)');
        c.fillStyle = aura;
        c.beginPath();
        c.arc(0, 0, size * 0.55, 0, Math.PI * 2);
        c.fill();
      } else if (isFinalBoss(m)) {
        const aura = c.createRadialGradient(0, 0, size * 0.2, 0, 0, size * 0.68);
        aura.addColorStop(0, 'rgba(225, 190, 231, 0.34)');
        aura.addColorStop(1, 'rgba(123, 31, 162, 0)');
        c.fillStyle = aura;
        c.beginPath();
        c.arc(0, 0, size * 0.66, 0, Math.PI * 2);
        c.fill();
      } else if (isBoss(m)) {
        const aura = c.createRadialGradient(0, 0, size * 0.2, 0, 0, size * 0.62);
        aura.addColorStop(0, 'rgba(255, 109, 0, 0.28)');
        aura.addColorStop(1, 'rgba(255, 109, 0, 0)');
        c.fillStyle = aura;
        c.beginPath();
        c.arc(0, 0, size * 0.6, 0, Math.PI * 2);
        c.fill();
      }

      c.save();
      c.translate(0, -bob);
      c.scale(pulse, pulse);
      c.imageSmoothingEnabled = true;

      if (img && img.complete && img.naturalWidth > 0) {
        c.drawImage(img, -size / 2, -size / 2, size, size);
      } else {
        // procedural fallback by tier
        c.fillStyle = isFinalBoss(m)
          ? '#4a148c'
          : isBoss(m)
            ? '#e65100'
            : isElite(m)
              ? '#8e24aa'
              : '#5d4037';
        c.beginPath();
        c.ellipse(0, 0, size * 0.35, size * 0.32, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();

      const barW =
        m.tier === 'final' ? 90 : m.tier === 'boss' ? 56 : m.tier === 'elite' ? 40 : 34;
      const barY = -(size * 0.52);
      const labelY = barY - 5;
      const name = m.title.replace(/^몬스터:\s*/, '');
      c.fillStyle =
        m.tier === 'final'
          ? 'rgba(186, 104, 255, 0.98)'
          : m.tier === 'boss'
            ? 'rgba(66, 165, 245, 0.98)'
            : m.tier === 'elite'
              ? 'rgba(255, 235, 59, 0.98)'
              : 'rgba(255, 255, 255, 0.95)';
      c.font = `bold ${isAnyBoss(m) ? 11 : 10}px "Fredoka", "Nunito", sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      c.strokeStyle = 'rgba(0,0,0,0.65)';
      c.lineWidth = 2.5;
      c.strokeText(name, 0, labelY);
      c.fillText(name, 0, labelY);
      c.textBaseline = 'alphabetic';

      c.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(c, -barW / 2 - 1, barY - 1, barW + 2, 7, 3);
      c.fill();
      c.fillStyle = '#2a2a2a';
      c.fillRect(-barW / 2, barY, barW, 5);
      const hpG = c.createLinearGradient(-barW / 2, 0, barW / 2, 0);
      if (isFinalBoss(m)) {
        hpG.addColorStop(0, '#4a148c');
        hpG.addColorStop(1, '#e1bee7');
      } else if (isBoss(m)) {
        hpG.addColorStop(0, '#ff6d00');
        hpG.addColorStop(1, '#ffab40');
      } else if (isElite(m)) {
        hpG.addColorStop(0, '#8e24aa');
        hpG.addColorStop(1, '#ce93d8');
      } else {
        hpG.addColorStop(0, '#e53935');
        hpG.addColorStop(1, '#ef9a9a');
      }
      c.fillStyle = hpG;
      c.fillRect(-barW / 2, barY, barW * (m.hp / m.maxHp), 5);
      c.restore();
    };

    function roundRect(
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
    ) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }

    const drawWorld = (viewW: number, viewH: number) => {
      const left = camX - viewW / 2;
      const top = camY - viewH / 2;
      ctx.save();
      ctx.translate(-left, -top);

      const tx0 = Math.floor(left / TILE) - 1;
      const ty0 = Math.floor(top / TILE) - 1;
      const tx1 = Math.ceil((left + viewW) / TILE) + 1;
      const ty1 = Math.ceil((top + viewH) / TILE) + 1;
      ctx.imageSmoothingEnabled = false;

      for (let ty = ty0; ty <= ty1; ty += 1) {
        for (let tx = tx0; tx <= tx1; tx += 1) {
          if (tx < 0 || ty < 0 || tx * TILE >= WORLD || ty * TILE >= WORLD) {
            continue;
          }
          const id = worldMap
            ? getTileId(worldMap, tx, ty)
            : DEFAULT_MAP_TILE;
          const prepared = tileImages[id];
          if (prepared) {
            ctx.drawImage(prepared, tx * TILE, ty * TILE, TILE, TILE);
            continue;
          }
          ctx.fillStyle = tileDef(id).fill;
          ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
        }
      }

      if (worldMap?.objects?.length) {
        for (const o of worldMap.objects) {
          const ox = (o.tx + 0.5) * TILE;
          const oy = (o.ty + 0.5) * TILE;
          if (
            ox < left - 80 ||
            ox > left + viewW + 80 ||
            oy < top - 80 ||
            oy > top + viewH + 80
          ) {
            continue;
          }
          const def = mapObjectDef(o.kind);
          const imgKey = o.frame ? `${o.kind}:${o.frame}` : o.kind;
          const img = objectImages[imgKey] ?? objectImages[o.kind];
          const sz = def.size;
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, ox - sz / 2, oy - sz / 2, sz, sz);
          } else {
            ctx.fillStyle = def.fill;
            ctx.beginPath();
            ctx.arc(ox, oy, sz * 0.28, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // world border
      ctx.strokeStyle = 'rgba(180, 220, 140, 0.2)';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, WORLD - 8, WORLD - 8);

      for (const m of mobs) {
        if (
          m.x > left - 40 &&
          m.x < left + viewW + 40 &&
          m.y > top - 40 &&
          m.y < top + viewH + 40
        ) {
          drawMob(ctx, m);
        }
      }

      // ground loot
      for (const d of groundDrops) {
        if (
          d.x < left - 40 ||
          d.x > left + viewW + 40 ||
          d.y < top - 40 ||
          d.y > top + viewH + 40
        ) {
          continue;
        }
        const bob = Math.sin(performance.now() / 220 + d.uid) * 3;
        const mine = canPickupItem(d.item, player.job);
        const alreadyOwned = ownsSameUniqueGear(inventory, equippedRef.current, d.item);
        // 다른 직업 장비는 이제 습득 가능 — 진입금지 마크는 "이미 보유" 케이스에만 표시
        const blocked = alreadyOwned;
        const ttlRatio = d.life / d.maxLife;
        ctx.globalAlpha = 1;
        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(d.x, d.y + 10, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        const gimg =
          d.item.kind === 'gear' && d.item.job && d.item.gearId && d.item.tier
            ? gearImages[gearImageKey(d.item.job, d.item.tier, d.item.gearId)]
            : consumableImages[d.item.kind] ?? null;
        const sz = displaySettings.groundItemSize ?? 36;
        if (gimg && gimg.complete) {
          ctx.imageSmoothingEnabled = displaySettings.character.imageSmoothing !== false;
          ctx.drawImage(gimg, d.x - sz / 2, d.y - sz / 2 + bob, sz, sz);
        } else {
          ctx.fillStyle = blocked || !mine ? wrongJobColor() : d.item.color;
          ctx.beginPath();
          ctx.arc(d.x, d.y + bob, 9, 0, Math.PI * 2);
          ctx.fill();
        }
        if (blocked) {
          drawForbidMark(ctx, d.x, d.y + bob, sz * 0.38);
        }
        // ground name (red if blocked/이미 보유, 다른 직업이면 옅은 경고색)
        if (showNameOnGround() && d.item.name) {
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(0,0,0,0.65)';
          ctx.strokeText(d.item.name, d.x, d.y - 14 + bob);
          ctx.fillStyle = blocked || !mine ? wrongJobColor() : '#fffde7';
          ctx.fillText(d.item.name, d.x, d.y - 14 + bob);
        }
        // ttl bar
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#222';
        ctx.fillRect(d.x - 12, d.y + 12, 24, 3);
        ctx.fillStyle = ttlRatio < 0.2 ? '#ff8a80' : '#ffe082';
        ctx.fillRect(d.x - 12, d.y + 12, 24 * ttlRatio, 3);
        ctx.globalAlpha = 1;
      }

      for (const p of projectiles) {
        const pr = 11;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pr * 2.2);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.35, p.color);
        g.addColorStop(1, 'rgba(0,150,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pr * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e1f5fe';
        ctx.beginPath();
        ctx.arc(p.x, p.y, pr * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pr * 0.9, 0, Math.PI * 2);
        ctx.stroke();
      }

      // damage numbers / non-skill rings only (under character)
      for (const f of fx) {
        if (f.skillId) continue;
        const a = f.life / f.max;
        ctx.globalAlpha = Math.max(0, a);
        if (f.r) {
          ctx.strokeStyle = f.color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r * (1.2 - a * 0.4), 0, Math.PI * 2);
          ctx.stroke();
        }
        if (f.text) {
          ctx.fillStyle = f.color;
          ctx.font = 'bold 16px Fredoka, Nunito, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(f.text, f.x, f.y - (1 - a) * 20);
        }
        ctx.globalAlpha = 1;
      }

      if (moveTarget && !chaseTarget) {
        const pulse = 0.65 + Math.sin(performance.now() / 180) * 0.35;
        ctx.strokeStyle = `rgba(255, 224, 130, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(moveTarget.x, moveTarget.y, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 224, 130, 0.35)';
        ctx.beginPath();
        ctx.arc(moveTarget.x, moveTarget.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      const targeted = targetMobId != null ? mobs.find((m) => m.id === targetMobId) : null;
      if (targeted) {
        const pulse = 0.55 + Math.sin(performance.now() / 140) * 0.45;
        ctx.strokeStyle = `rgba(255, 82, 82, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(targeted.x, targeted.y, 28, 0, Math.PI * 2);
        ctx.stroke();
        // corner brackets
        const s = 22;
        ctx.beginPath();
        ctx.moveTo(targeted.x - s, targeted.y - s + 10);
        ctx.lineTo(targeted.x - s, targeted.y - s);
        ctx.lineTo(targeted.x - s + 10, targeted.y - s);
        ctx.moveTo(targeted.x + s - 10, targeted.y - s);
        ctx.lineTo(targeted.x + s, targeted.y - s);
        ctx.lineTo(targeted.x + s, targeted.y - s + 10);
        ctx.moveTo(targeted.x + s, targeted.y + s - 10);
        ctx.lineTo(targeted.x + s, targeted.y + s);
        ctx.lineTo(targeted.x + s - 10, targeted.y + s);
        ctx.moveTo(targeted.x - s + 10, targeted.y + s);
        ctx.lineTo(targeted.x - s, targeted.y + s);
        ctx.lineTo(targeted.x - s, targeted.y + s - 10);
        ctx.stroke();
        // line from player
        ctx.strokeStyle = 'rgba(255, 138, 128, 0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(targeted.x, targeted.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (player.invuln > 0 && player.shieldHp <= 0) {
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(performance.now() / 40);
      }
      const moving =
        Math.hypot(player.vx, player.vy) > 35 ||
        keys.has('KeyW') ||
        keys.has('KeyA') ||
        keys.has('KeyS') ||
        keys.has('KeyD') ||
        joystickRef.current.active ||
        canvasDrag.active ||
        Boolean(moveTarget) ||
        chaseTarget;
      let action: ActionId = 'idle';
      let actionFrame = 0;
      const dir = facingToCardinal(player.facing);
      if (player.rolling > 0) action = 'roll';
      else if (player.swingT > 0) {
        const attackImg = jobImages?.actions.attack?.[dir] ?? null;
        if (attackImg?.complete && attackImg.naturalWidth > 0) {
          action = 'attack';
          const frameCount = walkSheetFrameCount(attackImg);
          if (frameCount > 1 && player.swingMax > 0) {
            const progress = 1 - player.swingT / player.swingMax;
            actionFrame = Math.min(frameCount - 1, Math.floor(progress * frameCount));
          }
        }
      } else if (moving) {
        // 기존 방식: walk/idle 교차로 1장짜리 걷기도 발이 움직이는 느낌
        const tick = Math.floor(
          performance.now() / (1000 / displaySettings.actions.walk.fps),
        );
        const walkImg = jobImages?.actions.walk?.[dir] ?? null;
        const frameCount =
          walkImg && walkImg.complete && walkImg.naturalWidth > 0
            ? walkSheetFrameCount(walkImg)
            : 1;
        if (frameCount > 1) {
          action = 'walk';
          actionFrame = tick;
        } else {
          action = tick % 2 === 0 ? 'walk' : 'idle';
        }
      }
      drawJobCharacter(
        ctx,
        jobImages,
        player.job,
        action,
        player.x,
        player.y,
        player.facing,
        player.rolling > 0,
        equippedRef.current,
        gearImages,
        player.swingT > 0 && player.swingKind
          ? {t: player.swingT / Math.max(0.001, player.swingMax), kind: player.swingKind}
          : null,
        actionFrame,
      );
      ctx.globalAlpha = 1;

      // Nickname + equipped gear tier dots above head
      {
        const dots: string[] = [];
        for (const s of EQUIP_SLOTS) {
          const it = equippedRef.current[s.id];
          if (!it?.tier) continue;
          dots.push(tierMeta(it.tier)?.color ?? it.color ?? '#fff');
          if (dots.length >= 8) break;
        }
        const dotsY = player.y - 65;
        const nameY = dots.length > 0 ? dotsY - 12 : player.y - 58;
        if (charName) {
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(0,0,0,0.7)';
          ctx.strokeText(charName, player.x, nameY);
          ctx.fillStyle = '#fffde7';
          ctx.fillText(charName, player.x, nameY);
        }
        if (dots.length > 0) {
          const gap = 7;
          const r = 2.4;
          const totalW = (dots.length - 1) * gap;
          const startX = player.x - totalW / 2;
          for (let i = 0; i < dots.length; i += 1) {
            const dx = startX + i * gap;
            ctx.beginPath();
            ctx.fillStyle = '#000';
            ctx.globalAlpha = 0.35;
            ctx.arc(dx, dotsY + 0.8, r + 1.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.fillStyle = dots[i];
            ctx.arc(dx, dotsY, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.55)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Absorb shield ring (above character, no blink)
      if (player.shieldHp > 0 && player.shieldMax > 0) {
        const ratio = player.shieldHp / player.shieldMax;
        const pulse = 0.85 + Math.sin(performance.now() / 220) * 0.15;
        const baseR = 56 + pulse * 5;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        // soft fill
        const glow = ctx.createRadialGradient(player.x, player.y, baseR * 0.2, player.x, player.y, baseR + 10);
        glow.addColorStop(0, `rgba(128, 222, 234, ${0.12 * ratio})`);
        glow.addColorStop(0.65, `rgba(77, 208, 225, ${0.2 * ratio})`);
        glow.addColorStop(1, 'rgba(0, 180, 220, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(player.x, player.y, baseR + 10, 0, Math.PI * 2);
        ctx.fill();
        // outer decorative ring
        ctx.strokeStyle = `rgba(224, 247, 250, ${0.85 * pulse})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(player.x, player.y, baseR + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(0, 188, 212, ${0.75 * pulse})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(player.x, player.y, baseR - 2, 0, Math.PI * 2);
        ctx.stroke();
        // remaining HP arc
        ctx.strokeStyle = `rgba(178, 235, 242, ${0.95})`;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(player.x, player.y, baseR + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
        ctx.stroke();
        // diamonds
        for (let i = 0; i < 6; i += 1) {
          const a = (i / 6) * Math.PI * 2 + performance.now() / 900;
          const dx = player.x + Math.cos(a) * (baseR + 1);
          const dy = player.y + Math.sin(a) * (baseR + 1);
          ctx.fillStyle = `rgba(255,255,255,${0.55 + 0.25 * ratio})`;
          ctx.beginPath();
          ctx.moveTo(dx, dy - 3);
          ctx.lineTo(dx + 2.5, dy);
          ctx.lineTo(dx, dy + 3);
          ctx.lineTo(dx - 2.5, dy);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Skill VFX above character (spin ring was hidden under the sprite)
      for (const f of fx) {
        if (!f.skillId) continue;
        const a = f.life / f.max;
        ctx.globalAlpha = Math.max(0, a);
        if (f.skillId === 'bash-trail') {
          drawDashTrail(ctx, f.x, f.y, f.facing ?? 0, Math.max(0.15, a));
        } else if (
          f.worldFx &&
          (f.skillId === 'slash' || f.skillId === 'spin' || f.skillId === 'bash' || f.skillId === 'nova')
        ) {
          drawSkillWorldFx(ctx, {
            skillId: f.skillId,
            x: f.x,
            y: f.y,
            progress: a,
            facing: f.facing,
            color: f.color,
            radius: f.r ?? 48,
          });
        } else if (f.skillId === 'shield-break') {
          ctx.strokeStyle = f.color;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(f.x, f.y, (f.r ?? 48) * (1.4 - a * 0.5), 0, Math.PI * 2);
          ctx.stroke();
        } else if (jobImages?.skills[f.skillId]) {
          drawSkillSprite(
            ctx,
            jobImages,
            f.skillId,
            f.x,
            f.y,
            Math.max(0.2, a),
            displaySettings.skillFx.size,
            f.facing,
          );
        }
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    };

    const drawMinimap = (viewW: number, viewH: number) => {
      // Full world map — grass base + wasteland patches
      mctx.fillStyle = '#2e4a2a';
      mctx.fillRect(0, 0, miniBox.w, miniBox.h);
      const step = 2;
      for (let v = 0; v < miniBox.h; v += step) {
        for (let u = 0; u < miniBox.w; u += step) {
          const tx = Math.floor(((u + 0.5) / miniBox.w) * (WORLD / TILE));
          const ty = Math.floor(((v + 0.5) / miniBox.h) * (WORLD / TILE));
          const id = worldMap
            ? getTileId(worldMap, tx, ty)
            : DEFAULT_MAP_TILE;
          mctx.fillStyle = tileDef(id).fill;
          mctx.fillRect(u, v, step, step);
        }
      }
      mctx.strokeStyle = 'rgba(255,255,255,0.07)';
      mctx.lineWidth = 1;
      for (let i = 1; i < 4; i += 1) {
        const p = (i / 4) * miniBox.w;
        mctx.beginPath();
        mctx.moveTo(p, 0);
        mctx.lineTo(p, miniBox.h);
        mctx.stroke();
        mctx.beginPath();
        mctx.moveTo(0, p);
        mctx.lineTo(miniBox.w, p);
        mctx.stroke();
      }
      for (const m of mobs) {
        const u = (m.x / WORLD) * miniBox.w;
        const v = (m.y / WORLD) * miniBox.h;
        if (isFinalBoss(m)) {
          // Purple skull mark for final boss
          mctx.save();
          mctx.translate(u, v);
          mctx.fillStyle = '#9c27b0';
          mctx.beginPath();
          mctx.ellipse(0, -1.2, 5.5, 5.2, 0, 0, Math.PI * 2);
          mctx.fill();
          mctx.beginPath();
          mctx.moveTo(-4, 2);
          mctx.lineTo(-3.5, 5.5);
          mctx.lineTo(-1.2, 4.2);
          mctx.lineTo(0, 5.5);
          mctx.lineTo(1.2, 4.2);
          mctx.lineTo(3.5, 5.5);
          mctx.lineTo(4, 2);
          mctx.closePath();
          mctx.fill();
          mctx.fillStyle = '#1a1a1a';
          mctx.beginPath();
          mctx.ellipse(-2.2, -1.5, 1.7, 1.9, 0, 0, Math.PI * 2);
          mctx.ellipse(2.2, -1.5, 1.7, 1.9, 0, 0, Math.PI * 2);
          mctx.fill();
          mctx.beginPath();
          mctx.moveTo(0, -0.2);
          mctx.lineTo(-1.3, 1.8);
          mctx.lineTo(1.3, 1.8);
          mctx.closePath();
          mctx.fill();
          mctx.restore();
        } else if (isBoss(m)) {
          mctx.fillStyle = '#ff6d00';
          mctx.fillRect(u - 4, v - 4, 8, 8);
          mctx.strokeStyle = '#ffe082';
          mctx.strokeRect(u - 4.5, v - 4.5, 9, 9);
        } else if (isElite(m)) {
          mctx.fillStyle = '#ce93d8';
          mctx.fillRect(u - 3.5, v - 3.5, 7, 7);
          mctx.strokeStyle = '#e1bee7';
          mctx.strokeRect(u - 4, v - 4, 8, 8);
        } else {
          mctx.fillStyle = m.id === targetMobId ? '#ff5252' : '#ef9a9a';
          const sz = m.id === targetMobId ? 5 : 3;
          mctx.fillRect(u - sz / 2, v - sz / 2, sz, sz);
        }
      }

      const {vu, vv, vw, vh} = getViewportMiniRect();
      mctx.fillStyle = 'rgba(255, 224, 130, 0.22)';
      mctx.fillRect(vu, vv, vw, vh);
      mctx.strokeStyle = '#ffe082';
      mctx.lineWidth = 2;
      mctx.strokeRect(vu, vv, vw, vh);

      const pu = (player.x / WORLD) * miniBox.w;
      const pv = (player.y / WORLD) * miniBox.h;
      mctx.fillStyle = '#fff59d';
      mctx.beginPath();
      mctx.arc(pu, pv, 4, 0, Math.PI * 2);
      mctx.fill();

      // map name (top-left)
      mctx.fillStyle = 'rgba(0,0,0,0.45)';
      mctx.fillRect(4, 4, 92, 16);
      mctx.fillStyle = '#ffe082';
      mctx.font = '10px sans-serif';
      mctx.textAlign = 'left';
      mctx.fillText(MAP_NAME, 8, 15);

      // position readout
      mctx.fillStyle = 'rgba(0,0,0,0.45)';
      mctx.fillRect(4, 22, 118, 14);
      mctx.fillStyle = '#eee';
      mctx.font = '9px sans-serif';
      mctx.fillText(
        `위치 ${Math.floor(player.x)}, ${Math.floor(player.y)}`,
        8,
        32,
      );

      mctx.strokeStyle = 'rgba(255,255,255,0.35)';
      mctx.lineWidth = 1;
      mctx.strokeRect(0.5, 0.5, miniBox.w - 1, miniBox.h - 1);
    };

    const drawHud = (viewW: number, viewH: number) => {
      /** Phone HUD: shrink HP panel + stack hotbar 4·5 above 1·2·3 to clear inv FAB. */
      const phone = viewW <= 500;
      const pad = phone ? 6 : 10;
      const panelX = phone ? 8 : 12;
      const panelY = phone ? 8 : 12;
      const barW = phone ? 116 : 196;
      const barH = phone ? 10 : 14;
      const barGap = phone ? 4 : 8;
      const labelW = phone ? 20 : 26;
      const contentX = panelX + pad;
      const contentY = panelY + pad;
      const labelFont = phone
        ? 'bold 9px "Fredoka", "Nunito", sans-serif'
        : 'bold 11px "Fredoka", "Nunito", sans-serif';
      const valueFont = phone ? 'bold 8px sans-serif' : 'bold 10px sans-serif';

      const rows: {label: string; v: number; max: number; c0: string; c1: string}[] = [
        {label: 'HP', v: player.hp, max: player.maxHp, c0: '#c62828', c1: '#ef5350'},
        {label: 'MP', v: player.mp, max: player.maxMp, c0: '#1565c0', c1: '#42a5f5'},
        {label: 'ST', v: player.stamina, max: player.maxStamina, c0: '#2e7d32', c1: '#66bb6a'},
      ];
      if (player.shieldHp > 0 && player.shieldMax > 0) {
        rows.push({
          label: 'SH',
          v: player.shieldHp,
          max: player.shieldMax,
          c0: '#00838f',
          c1: '#4dd0e1',
        });
      }

      const panelW = pad + labelW + barW + pad;
      const panelH =
        pad + rows.length * barH + Math.max(0, rows.length - 1) * barGap + pad;
      const panelR = phone ? 7 : 10;

      ctx.fillStyle = 'rgba(12, 10, 8, 0.55)';
      roundRect(ctx, panelX, panelY, panelW, panelH, panelR);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();

      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const ratio = row.max > 0 ? Math.max(0, Math.min(1, row.v / row.max)) : 0;
        const y = contentY + i * (barH + barGap);
        const bx = contentX + labelW;
        const barR = phone ? 5 : 7;

        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = labelFont;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(row.label, contentX, y + barH / 2);

        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        roundRect(ctx, bx, y, barW, barH, barR);
        ctx.fill();

        if (ratio > 0.001) {
          const grad = ctx.createLinearGradient(bx, 0, bx + barW, 0);
          grad.addColorStop(0, row.c0);
          grad.addColorStop(1, row.c1);
          ctx.fillStyle = grad;
          const fillW = Math.max(barH, barW * ratio);
          roundRect(ctx, bx, y, fillW, barH, barR);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          roundRect(ctx, bx + 2, y + 2, Math.max(0, fillW - 4), phone ? 3 : 4, 3);
          ctx.fill();
        }

        ctx.fillStyle = '#fffde7';
        ctx.font = valueFont;
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.ceil(row.v)}`, bx + barW - 5, y + barH / 2);
      }
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';

      // hotbar — phone: 4·5 on upper row, 1·2·3 bottom (match inv FAB margin)
      const edge = phone ? 8 : 14;
      const slot = phone ? 52 : viewW < 900 ? 64 : 58;
      const gap = phone ? 8 : 10;
      const slotR = phone ? 10 : 12;
      hotbarHits.length = 0;
      const iconSz = Math.min(displaySettings.hotbarIconSize ?? 32, slot - (phone ? 12 : 16));

      const slotPos: {i: number; x: number; y: number}[] = [];
      if (phone) {
        const bottomY = viewH - edge - slot;
        const topY = bottomY - gap - slot;
        const skillsW = 3 * slot + 2 * gap;
        const itemsW = 2 * slot + gap;
        const skillsX = Math.max(edge + 60 + gap, viewW - edge - skillsW);
        const itemsX = viewW - edge - itemsW;
        for (let i = 0; i < 3; i += 1) {
          slotPos.push({i, x: skillsX + i * (slot + gap), y: bottomY});
        }
        for (let i = 3; i < HOTBAR; i += 1) {
          slotPos.push({i, x: itemsX + (i - 3) * (slot + gap), y: topY});
        }
      } else {
        const totalW = HOTBAR * slot + (HOTBAR - 1) * gap;
        const hx = Math.max(16, viewW - edge - totalW);
        const hy = viewH - edge - slot;
        for (let i = 0; i < HOTBAR; i += 1) {
          slotPos.push({i, x: hx + i * (slot + gap), y: hy});
        }
      }

      for (const {i, x, y} of slotPos) {
        hotbarHits.push({i, x, y, w: slot, h: slot});
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        roundRect(ctx, x, y, slot, slot, slotR);
        ctx.fill();

        if (i < 3) {
          const sk = skills[i];
          if (sk) {
            const simg = jobImages?.skills[sk.id];
            if (simg && simg.complete && simg.naturalWidth > 0) {
              ctx.imageSmoothingEnabled = false;
              const ip = phone ? 8 : 10;
              ctx.globalAlpha = sk.cdLeft > 0 ? 0.45 : 1;
              ctx.drawImage(simg, x + ip, y + ip - 2, slot - ip * 2, slot - ip * 2 - 4);
              ctx.globalAlpha = 1;
            } else {
              ctx.fillStyle = sk.cdLeft > 0 ? '#9e9e9e' : '#fff';
              ctx.font = phone ? 'bold 10px sans-serif' : 'bold 12px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(sk.name, x + slot / 2, y + slot * 0.42);
            }
            if (sk.cdLeft > 0 && sk.cd > 0) {
              const ratio = Math.max(0, Math.min(1, sk.cdLeft / sk.cd));
              const inset = 2;
              const ix = x + inset;
              const iy = y + inset;
              const iw = slot - inset * 2;
              const ih = slot - inset * 2;
              const coverH = ih * ratio;
              ctx.save();
              roundRect(ctx, ix, iy, iw, ih, phone ? 8 : 10);
              ctx.clip();
              ctx.fillStyle = 'rgba(0,0,0,0.58)';
              ctx.fillRect(ix, iy, iw, coverH);
              ctx.restore();
            }
            ctx.fillStyle = '#ffe082';
            ctx.font = phone ? 'bold 9px sans-serif' : 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(sk.name, x + slot / 2, y + slot - (phone ? 6 : 8));
          }
        } else {
          const it = inventory[i - 3];
          if (it && it.kind !== 'empty') {
            const cimg =
              it.kind === 'gear' && it.job && it.gearId && it.tier
                ? gearImages[gearImageKey(it.job, it.tier, it.gearId)]
                : consumableImages[it.kind];
            if (cimg && cimg.complete) {
              ctx.imageSmoothingEnabled = displaySettings.character.imageSmoothing !== false;
              ctx.drawImage(
                cimg,
                x + (slot - iconSz) / 2,
                y + (slot - iconSz) / 2 - 2,
                iconSz,
                iconSz,
              );
            } else {
              ctx.fillStyle = it.color;
              const inset = phone ? 10 : 14;
              roundRect(ctx, x + inset, y + inset - 2, slot - inset * 2, slot - inset * 2, 8);
              ctx.fill();
            }
            ctx.fillStyle = '#fff';
            ctx.font = phone ? 'bold 11px sans-serif' : 'bold 13px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(String(it.qty), x + slot - 6, y + slot - 8);
          }
        }

        ctx.strokeStyle = i < 3 ? '#ffe082' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = i < 3 ? 2.5 : 1.5;
        roundRect(ctx, x + 0.5, y + 0.5, slot - 1, slot - 1, slotR);
        ctx.stroke();

        ctx.fillStyle = '#ffe082';
        ctx.font = phone ? 'bold 11px sans-serif' : 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(String(i + 1), x + 5, y + (phone ? 14 : 16));
      }

      if (toastT > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        const tw = ctx.measureText(toast).width + 28;
        ctx.fillRect(viewW / 2 - tw / 2, 86, tw, 34);
        ctx.fillStyle = '#fff';
        ctx.fillText(toast, viewW / 2, 108);
      }

      if (!alive) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, viewW, viewH);
      }
    };

    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (alive && !invExpandedRef.current) {
        // regen
        player.stamina = Math.min(player.maxStamina, player.stamina + (player.maxStamina / (MAX_ROLLS_EQUIV * 1.6)) * dt);
        player.mp = Math.min(player.maxMp, player.mp + bal.player.mpRegenPerSec * dt);
        applyGearVitals();
        player.hp = Math.min(player.maxHp, player.hp + bal.player.hpRegenPerSec * dt);

        player.rolling = Math.max(0, player.rolling - dt);
        player.invuln = Math.max(0, player.invuln - dt);
        player.atkCd = Math.max(0, player.atkCd - dt);
        player.swingT = Math.max(0, player.swingT - dt);
        if (player.swingT <= 0) player.swingKind = null;
        for (const sk of skills) sk.cdLeft = Math.max(0, sk.cdLeft - dt);
        toastT = Math.max(0, toastT - dt);
        wrongJobToastCd = Math.max(0, wrongJobToastCd - dt);

        // ground drops TTL + pickup
        groundDrops = groundDrops.filter((d) => {
          d.life -= dt;
          return d.life > 0;
        });
        tryPickupDrops();

        let mx = 0;
        let my = 0;
        if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;

        const joy = joystickRef.current;
        if (joy.active && (Math.abs(joy.dx) > 0.15 || Math.abs(joy.dy) > 0.15)) {
          mx += joy.dx;
          my += joy.dy;
          moveTarget = null;
          targetMobId = null;
          chaseTarget = false;
        }

        if (canvasDrag.active && (Math.abs(canvasDrag.dx) > 0.05 || Math.abs(canvasDrag.dy) > 0.05)) {
          mx += canvasDrag.dx;
          my += canvasDrag.dy;
          moveTarget = null;
        }

        // chase targeted mob / click-to-move when no WASD
        if (!mx && !my && player.rolling <= 0) {
          if (chaseTarget && targetMobId != null) {
            const tm = mobs.find((m) => m.id === targetMobId);
            if (!tm) {
              targetMobId = null;
              chaseTarget = false;
              moveTarget = null;
            } else {
              const cdx = tm.x - player.x;
              const cdy = tm.y - player.y;
              const dist = Math.hypot(cdx, cdy);
              if (dist > CHASE_STOP) {
                mx = cdx / dist;
                my = cdy / dist;
                moveTarget = {x: tm.x, y: tm.y};
              } else {
                moveTarget = null;
                player.facing = Math.atan2(cdy, cdx);
              }
            }
          } else if (moveTarget) {
            const cdx = moveTarget.x - player.x;
            const cdy = moveTarget.y - player.y;
            const dist = Math.hypot(cdx, cdy);
            if (dist < 10) {
              moveTarget = null;
              player.vx = 0;
              player.vy = 0;
            } else {
              mx = cdx / dist;
              my = cdy / dist;
            }
          }
        }

        // Sync joystick knob visual with combined movement direction
        {
          const knob = knobElRef.current;
          if (knob) {
            const mlen = Math.hypot(mx, my);
            if (mlen > 0.01) {
              const nmx = mx / mlen;
              const nmy = my / mlen;
              const intensity = Math.min(mlen, 1);
              const r = (knob.parentElement?.offsetWidth ?? 180) / 2;
              knob.style.left = `${r + nmx * intensity * r}px`;
              knob.style.top = `${r + nmy * intensity * r}px`;
            } else if (!joy.active && !canvasDrag.active) {
              const r0 = (knob.parentElement?.offsetWidth ?? 180) / 2;
              knob.style.left = `${r0}px`;
              knob.style.top = `${r0}px`;
            }
          }
        }

        if (player.rolling <= 0) {
          if (mx || my) {
            const len = Math.hypot(mx, my) || 1;
            mx /= len;
            my /= len;
            const targetFacing = Math.atan2(my, mx);
            let turn = targetFacing - player.facing;
            while (turn > Math.PI) turn -= Math.PI * 2;
            while (turn < -Math.PI) turn += Math.PI * 2;
            player.facing += turn * Math.min(1, 20 * dt);

            const tx = mx * player.speed;
            const ty = my * player.speed;
            // 빠르게 목표 속도에 도달 (미끄러짐 적고 반응성 좋게)
            const blend = 1 - Math.exp(-18 * dt);
            player.vx += (tx - player.vx) * blend;
            player.vy += (ty - player.vy) * blend;
          } else {
            // 손 떼면 짧게 감속 후 정지
            const stop = 1 - Math.exp(-22 * dt);
            player.vx += (0 - player.vx) * stop;
            player.vy += (0 - player.vy) * stop;
            if (Math.hypot(player.vx, player.vy) < 8) {
              player.vx = 0;
              player.vy = 0;
            }
          }
        } else {
          // 구르기 중에도 살짝 감속
          const rollDrag = 1 - Math.exp(-3.2 * dt);
          player.vx += (0 - player.vx) * rollDrag * 0.35;
          player.vy += (0 - player.vy) * rollDrag * 0.35;
        }

        player.x = Math.max(PLAYER_R, Math.min(WORLD - PLAYER_R, player.x + player.vx * dt));
        player.y = Math.max(PLAYER_R, Math.min(WORLD - PLAYER_R, player.y + player.vy * dt));

        // map prop collision (trees / rocks / crates …)
        if (worldMap?.objects?.length) {
          for (const o of worldMap.objects) {
            const def = mapObjectDef(o.kind);
            if (!def.blocking) continue;
            const ox = (o.tx + 0.5) * TILE;
            const oy = (o.ty + 0.5) * TILE;
            const rad = def.size * 0.28;
            const dx = player.x - ox;
            const dy = player.y - oy;
            const dist = Math.hypot(dx, dy) || 1;
            const minD = PLAYER_R + rad;
            if (dist < minD) {
              const push = (minD - dist) / dist;
              player.x += dx * push;
              player.y += dy * push;
              player.x = Math.max(PLAYER_R, Math.min(WORLD - PLAYER_R, player.x));
              player.y = Math.max(PLAYER_R, Math.min(WORLD - PLAYER_R, player.y));
            }
          }
        }

        if (camFollow) {
          camX += (player.x - camX) * Math.min(1, 10 * dt);
          camY += (player.y - camY) * Math.min(1, 10 * dt);
        }
        clampCam();

        // mob AI — aggro, chase with walk, swing: attack pose → walk gap → attack…
        const mobCombat = gameSettings.combat.monster;
        const ATTACK_ANIM = mobCombat.attackAnimSec ?? 0.55;
        const ATTACK_GAP = mobCombat.attackGapSec ?? 0.4;
        for (const m of mobs) {
          m.hurt = Math.max(0, m.hurt - dt);
          m.attackT = Math.max(0, m.attackT - dt);
          m.attackCd = Math.max(0, m.attackCd - dt);
          const dx = player.x - m.x;
          const dy = player.y - m.y;
          const d = Math.hypot(dx, dy) || 1;
          const ag = monsterAggro(m.tier);
          const aggroR = ag.aggro;
          const deaggroR = ag.deaggro;

          if (!m.aggro && d <= aggroR) {
            pullAggro(m);
          } else if (m.aggro && d > deaggroR) {
            m.aggro = false;
            m.attackT = 0;
          }

          if (m.aggro) {
            m.facing = Math.atan2(dy, dx);
            const inRange = inAttackRange(
              m.x,
              m.y,
              m.facing,
              player.x,
              player.y,
              m.ranged,
              'monster',
            );

            if (m.attackT > 0) {
              // attack pose — hold still
            } else if (inRange) {
              if (m.attackCd <= 0) {
                // start swing: attack sprite + damage, then walk gap via attackCd
                m.attackT = ATTACK_ANIM;
                m.attackCd = ATTACK_ANIM + ATTACK_GAP;
                const scaleDmg = 1 + mobLevelAt(gameTime) * MOB_SCALE_HP_DMG_PER_LEVEL;
                const stageMult = stageTouchDamageMult(stageRef.current);
                hurtPlayer(
                  Math.round(tierConfig(m.tier).touchDamage * scaleDmg * stageMult),
                );
              }
              // else recovery gap: attackT==0 → walk sprite while waiting
            } else {
              // chase with walk pose
              m.x += (dx / d) * m.speed * dt;
              m.y += (dy / d) * m.speed * dt;
            }
          } else {
            // idle: slowly return toward spawn home (walk)
            const hx = m.homeX - m.x;
            const hy = m.homeY - m.y;
            const hd = Math.hypot(hx, hy);
            if (hd > 8) {
              m.facing = Math.atan2(hy, hx);
              m.x += (hx / hd) * m.speed * 0.45 * dt;
              m.y += (hy / hd) * m.speed * 0.45 * dt;
            }
          }

          m.x = Math.max(margin, Math.min(WORLD - margin, m.x));
          m.y = Math.max(margin, Math.min(WORLD - margin, m.y));
        }

        // world respawns after cooldown
        gameTime += dt;
        while (pendingRespawns.length > 0 && pendingRespawns[0]!.at <= gameTime) {
          const row = pendingRespawns.shift()!;
          spawnOneOfTier(row.tier);
        }
        // safety: if underpopulated and nothing queued, schedule catch-up by tier
        for (const tier of ['normal', 'elite', 'boss', 'final'] as MonsterTier[]) {
          const want = tierConfig(tier).count;
          const aliveCount = mobs.filter((m) => m.tier === tier).length;
          const pending = pendingRespawns.filter((p) => p.tier === tier).length;
          const need = want - aliveCount - pending;
          for (let i = 0; i < need; i += 1) scheduleRespawn(tier);
        }

        projectiles = projectiles.filter((p) => {
          const ox = p.x;
          const oy = p.y;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          // mob body ~ half draw size + bolt hitR; swept segment prevents tunneling
          const hitR = p.hitR ?? 48;
          for (const m of mobs) {
            const body = monsterDrawSize(m.tier) * 0.45;
            const need = hitR + body;
            if (distPointToSeg(m.x, m.y, ox, oy, p.x, p.y) < need) {
              pullAggro(m);
              m.hp -= p.dmg;
              m.hurt = 0.2;
              fx.push({
                x: m.x,
                y: m.y - 18,
                life: 0.45,
                max: 0.45,
                text: `-${p.dmg}`,
                color: '#81d4fa',
              });
              if (m.hp <= 0) killMob(m);
              return false;
            }
          }
          return p.life > 0;
        });

        fx = fx.filter((f) => {
          f.life -= dt;
          return f.life > 0;
        });
      }

      const viewW = canvas.clientWidth;
      const viewH = canvas.clientHeight;
      screenW = viewW;
      screenH = viewH;
      ctx.clearRect(0, 0, viewW, viewH);
      drawWorld(viewW, viewH);
      drawHud(viewW, viewH);
      drawMinimap(viewW, viewH);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    showToast(`${charName} · ${jobLabel(player.job)}로 시작!`);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointerdown', onCanvasPointerDown);
      canvas.removeEventListener('pointermove', onCanvasPointerMove);
      canvas.removeEventListener('pointerup', onCanvasPointerUp);
      canvas.removeEventListener('pointercancel', onCanvasPointerUp);
      wrap.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('gesturestart', blockZoomGesture);
      document.removeEventListener('gesturechange', blockZoomGesture);
      document.removeEventListener('gestureend', blockZoomGesture);
      window.removeEventListener('wheel', blockCtrlWheel);
      mini.removeEventListener('pointerdown', onMiniDown);
      mini.removeEventListener('pointermove', onMiniMove);
      mini.removeEventListener('pointerup', onMiniUp);
      mini.removeEventListener('pointercancel', onMiniUp);
      mini.removeEventListener('dblclick', onMiniDbl);
    };
  }, [started, charName, startJob, assetsVersion]);

  if (!started) {
    return (
      <div className="todie todie--gate">
        <Link href="/" className="game-page__back todie__gate-home">
          🏠 홈으로
        </Link>
        <button
          type="button"
          className="todie__fresh todie__gate-fresh"
          onClick={() => confirmFreshStart()}
        >
          초기화
        </button>
        <div className="todie__gate-card">
          <h1>todie</h1>
          <p>
            {MAP_NAME}에 들어가기 전에 이름을 정하세요.
            <br />
            직업은 검사 또는 법사입니다.
            <br />
            {hasGearSave
              ? '저장된 장비가 있어요. 같은 직업으로 시작하면 이어집니다.'
              : '시작 장비는 나무작대기 · 복장은 팬티만!'}
          </p>
          <label className="todie__gate-label" htmlFor="todie-name">
            캐릭터 이름 (최대 {NAME_MAX}글자)
          </label>
          <input
            id="todie-name"
            className="todie__gate-input"
            value={draftName}
            maxLength={NAME_MAX}
            autoFocus
            placeholder="비우면 랜덤 3글자"
            disabled={loadingAssets}
            onChange={(e) => {
              setDraftName(e.target.value.slice(0, NAME_MAX));
              setNameError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void begin();
            }}
          />
          <p className="todie__gate-hint">
            {draftName.length}/{NAME_MAX} · 비어 있으면 가나다… 랜덤 3글자
          </p>
          <div className="todie__gate-jobs">
            {(['warrior', 'mage'] as const).map((job) => (
              <button
                key={job}
                type="button"
                className={`todie__gate-job${pickJobUi === job ? ' is-on' : ''}`}
                onClick={() => {
                  setPickJobUi(job);
                  const gear = readGearCookie();
                  setHasGearSave(Boolean(gear?.job === job && gearSaveHasEquipped(gear)));
                }}
                disabled={loadingAssets}
                aria-pressed={pickJobUi === job}
              >
                <img
                  className="todie__gate-job-sprite"
                  src={JOB_ART[job].actions.idle?.down ?? ''}
                  alt=""
                  draggable={false}
                />
                <span className="todie__gate-job-label">{jobLabel(job)}</span>
              </button>
            ))}
          </div>
          <p className="todie__gate-error">{nameError || (loadingAssets ? '이미지 로딩 중…' : '')}</p>
          <button
            type="button"
            className="todie__gate-start"
            disabled={loadingAssets}
            onClick={() => void begin()}
          >
            {loadingAssets ? '로딩 중…' : '모험 시작'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="todie" ref={wrapRef}>
      <canvas className="todie__canvas" ref={canvasRef} />
      <div className="todie__play-timer" aria-label="플레이 시간">
        ⏱ {formatPlayTime(playSeconds)}
      </div>
      <div className="todie__stage-badge" aria-label="현재 스테이지">
        {stageLabel}
      </div>
      {invExpanded && <div className="todie__paused-badge">일시정지</div>}
      <div className="todie__minimap-wrap">
        <div className="todie__top-actions">
          <button
            type="button"
            className="todie__mute"
            onClick={toggleBgmMute}
            aria-pressed={bgmMuted}
            aria-label={bgmMuted ? '소리 켜기' : '소리 끄기'}
            title={bgmMuted ? '소리 켜기' : '소리 끄기'}
          >
            {bgmMuted ? (
              <svg
                className="todie__mute-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" />
                <path d="m22 9-6 6" />
                <path d="m16 9 6 6" />
              </svg>
            ) : (
              <svg
                className="todie__mute-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                <path d="M18.5 5.5a9 9 0 0 1 0 13" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="todie__fresh"
            onClick={() => confirmFreshStart(wipeProgressRef)}
          >
            초기화
          </button>
          <button type="button" className="todie__exit" onClick={confirmExitToMain}>
            게임 종료
          </button>
        </div>
        <canvas className="todie__minimap" ref={miniRef} />
      </div>
      {showRestart && (
        <div className="todie__dead-overlay" onPointerDown={(e) => e.stopPropagation()}>
          <div className="todie__dead-card">
            <h2 className="todie__dead-title">YOU DIED</h2>
            <p className="todie__dead-hint">R 키로 다시 시작</p>
            <button type="button" className="todie__dead-restart" onClick={restartGame}>
              게임 다시시작
            </button>
          </div>
        </div>
      )}
      <VirtualJoystick joystickRef={joystickRef} knobElRef={knobElRef} />
      <InventoryDock
        bag={bagRef.current}
        equipped={equippedRef.current}
        job={startJob}
        charName={charName}
        images={assetsRef.current?.jobs[startJob] ?? null}
        gearImages={assetsRef.current?.gear ?? null}
        expanded={invExpanded}
        onToggleExpand={() => setInvExpanded((v) => !v)}
        onMutate={syncBag}
        onToast={(msg) => toastFnRef.current(msg)}
        onToggleEquip={(bagIndex) => {
          const msg = toggleEquipFromBag(
            bagRef.current,
            equippedRef.current,
            bagIndex,
            startJob,
          );
          if (msg) toastFnRef.current(msg);
          syncBag();
        }}
        onUnequip={(slot: GearSlot) => {
          const msg = unequipSlot(bagRef.current, equippedRef.current, slot);
          if (msg) toastFnRef.current(msg);
          syncBag();
        }}
        onExtract={() => {
          const bag = bagRef.current;
          const targets: number[] = [];
          for (let i = 0; i < bag.length; i += 1) {
            const it = bag[i];
            if (it.kind === 'gear' && isExtractableGear(it, startJob, bag, equippedRef.current)) {
              targets.push(i);
            }
          }
          let stones = 0;
          let count = 0;
          for (const idx of targets) {
            const res = extractGearToEnhanceStone(bag, idx, startJob, equippedRef.current);
            if (res) {
              stones += res.qty;
              count += 1;
            }
          }
          if (count > 0) {
            toastFnRef.current(`아이템 ${count}개 → 강화석 x${stones} 추출!`);
          } else {
            toastFnRef.current('추출할 수 있는 아이템이 없어요');
          }
          syncBag();
        }}
        onEnhance={(stoneIndex, target) => {
          const targetItem =
            target.source === 'equip'
              ? equippedRef.current[target.slot]
              : bagRef.current[target.index];
          if (!targetItem) {
            toastFnRef.current('강화 대상이 아니에요');
            return null;
          }
          const res = applyEnhanceStone(bagRef.current, stoneIndex, targetItem);
          if (!res) {
            toastFnRef.current('강화석이 아니에요');
            return null;
          }
          toastFnRef.current(res.message);
          syncBag();
          return res;
        }}
      />
    </div>
  );
}
