'use client';

import {useEffect, useRef, useState} from 'react';
import './todie.css';
import {
  balanceSettings,
  clearItem,
  displaySettings,
  draftToItem,
  dropSettings,
  emptyEquipment,
  gearImageKey,
  jobLabel,
  jobSpeed,
  mobDrawSize,
  mobSpriteKey,
  ownsSameUniqueGear,
  alreadyOwnedToast,
  pickSpawnKind,
  preloadAllTodieAssets,
  putItemInBag,
  rollLootDrop,
  showNameOnGround,
  skillsFromBalance,
  spawnSettings,
  starterGearItem,
  sumEquippedStats,
  toggleEquipFromBag,
  unequipSlot,
  wrongJobColor,
  type ActionId,
  type Equipment,
  type GearSlot,
  type Item,
  type JobId,
  type LoadedImages,
  type RuntimeSkill,
  type TodieAssetBundle,
} from './content';
import {drawJobCharacter, drawSkillSprite} from './render/drawCharacter';
import {InventoryDock} from './ui/InventoryDock';

const WORLD = spawnSettings.worldSize ?? 30_000;
const TILE = 80;
const PLAYER_R = 18;
const HOTBAR = 5;
const BAG_SIZE = 100;
const TARGET_RANGE = 1000;
const MOB_CLICK_R = 36;
const CHASE_STOP = 42;
const AGGRO_RANGE = spawnSettings.aggroRange ?? 2000;
const DEAGGRO_RANGE = spawnSettings.deaggroRange ?? 2000;
const RESPAWN_CD = spawnSettings.respawnCooldownSec ?? 30;
const BOSS_COUNT = spawnSettings.bossCount ?? 5;
const BOSS_RESPAWN_CD = spawnSettings.bossRespawnCooldownSec ?? 90;
const BOSS_DROP_COUNT = spawnSettings.bossDropCount ?? 10;
const BOSS_AGGRO = spawnSettings.bossAggroRange ?? 2800;
const BOSS_DEAGGRO = spawnSettings.bossDeaggroRange ?? 3200;
const ELITE_CHANCE = spawnSettings.eliteChance ?? 0.12;
const ELITE_DROP_COUNT = spawnSettings.eliteDropCount ?? 3;
const NAME_COOKIE = 'todie_char_name';
const MAP_NAME = '죽음의 황무지';
const NAME_MAX = 10;

const bal = balanceSettings;
const drops = dropSettings;
const spawn = spawnSettings;
const ROLL_COST = bal.player.rollCost;
const MAX_ROLLS_EQUIV = bal.player.staminaRegenRolls;
const GROUND_TTL = drops.groundTtlSec;
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

type MobKind = 'slime' | 'bat' | 'block' | 'boss';

type Mob = {
  id: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  speed: number;
  kind: MobKind;
  elite: boolean;
  hurt: number;
  /** Locked onto first aggroer until leash breaks */
  aggro: boolean;
};

type Fx = {
  x: number;
  y: number;
  life: number;
  max: number;
  text?: string;
  color: string;
  r?: number;
  skillId?: string;
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
};

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
  }));
}

function canPickupItem(item: Item, job: JobId) {
  return item.job == null || item.job === job;
}

function readNameCookie() {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:^|; )todie_char_name=([^;]*)/);
  return m ? decodeURIComponent(m[1]).slice(0, NAME_MAX) : '';
}

function writeNameCookie(name: string) {
  const v = encodeURIComponent(name.slice(0, NAME_MAX));
  document.cookie = `${NAME_COOKIE}=${v};path=/;max-age=31536000;SameSite=Lax`;
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

/** Tiny hash for procedural map tiles */
function tileSeed(tx: number, ty: number) {
  let n = tx * 374761393 + ty * 668265263;
  n = (n ^ (n >>> 13)) >>> 0;
  return (n % 1000) / 1000;
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

  useEffect(() => {
    const saved = readNameCookie();
    setDraftName(saved || randomCharName());
  }, []);

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

  const syncBag = () => setBagTick((t) => t + 1);

  const begin = async () => {
    const n = (draftName.trim() || randomCharName()).slice(0, NAME_MAX);
    if (loadingAssets) return;
    setDraftName(n);
    setLoadingAssets(true);
    setNameError('');
    try {
      const bundle = await preloadAllTodieAssets();
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
      };
      const stick = draftToItem(starterGearItem(pickJobUi));
      stick.id = 'start-stick';
      bag[2] = stick;
      bagRef.current = bag;
      const eq = emptyEquipment();
      // auto-equip wooden stick
      eq.weapon = {...stick, qty: 1};
      clearItem(bag[2]);
      equippedRef.current = eq;
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
    };

    const skills: RuntimeSkill[] = skillsFromBalance(job);
    const inventory = bagRef.current;
    const jobImages: LoadedImages | null = assetsRef.current?.jobs[job] ?? null;
    const gearImages: Record<string, HTMLImageElement> = assetsRef.current?.gear ?? {};
    const consumableImages: Record<string, HTMLImageElement> =
      assetsRef.current?.consumables ?? {};
    const mobImages: Record<string, HTMLImageElement> = assetsRef.current?.mobs ?? {};

    let mobs: Mob[] = [];
    let fx: Fx[] = [];
    let groundDrops: GroundDrop[] = [];
    let nextDropUid = 1;
    let wrongJobToastCd = 0;
    let projectiles: {x: number; y: number; vx: number; vy: number; life: number; dmg: number; color: string}[] = [];
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
    let pendingRespawns: number[] = [];
    let pendingBossRespawns: number[] = [];
    let moveTarget: {x: number; y: number} | null = null;
    let targetMobId: number | null = null;
    let chaseTarget = false;
    let screenW = 800;
    let screenH = 600;

    /** Use KeyboardEvent.code so IME/layout can't stick WASD */
    const keys = new Set<string>();
    const MINI_FULL = {w: 280, h: 250};
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

    const margin = spawn.worldMargin ?? 80;

    const makeMobAt = (x: number, y: number, kind?: MobKind): Mob => {
      const k = kind ?? pickSpawnKind();
      const mb = bal.mobs[k] as {hp: number; speed: number; touchDamage: number};
      const eliteCfg = (bal.mobs as {elite?: {hpMult?: number; speedMult?: number}})
        .elite;
      const elite = k !== 'boss' && Math.random() < ELITE_CHANCE;
      const hpMult = elite ? (eliteCfg?.hpMult ?? 2.4) : 1;
      const spdMult = elite ? (eliteCfg?.speedMult ?? 1.15) : 1;
      const maxHp = Math.round(mb.hp * hpMult);
      return {
        id: nextMobId++,
        x,
        y,
        homeX: x,
        homeY: y,
        hp: maxHp,
        maxHp,
        speed: mb.speed * spdMult,
        kind: k,
        elite,
        hurt: 0,
        aggro: false,
      };
    };

    /** Scatter mobs across the full world map. */
    const spawnMobsWorld = (count: number) => {
      for (let i = 0; i < count; i += 1) {
        const x = rand(margin, WORLD - margin);
        const y = rand(margin, WORLD - margin);
        mobs.push(makeMobAt(x, y));
      }
    };

    const spawnBossesWorld = (count: number) => {
      for (let i = 0; i < count; i += 1) {
        const x = rand(margin, WORLD - margin);
        const y = rand(margin, WORLD - margin);
        mobs.push(makeMobAt(x, y, 'boss'));
      }
    };

    const scheduleRespawn = () => {
      pendingRespawns.push(gameTime + RESPAWN_CD);
    };

    const scheduleBossRespawn = () => {
      pendingBossRespawns.push(gameTime + BOSS_RESPAWN_CD);
    };

    const pullAggro = (m: Mob) => {
      // First aggroer locks; do not retarget until deaggro
      if (!m.aggro) m.aggro = true;
    };

    spawnMobsWorld(spawn.initialCount);
    spawnBossesWorld(BOSS_COUNT);

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

    const hurtPlayer = (dmg: number) => {
      if (player.invuln > 0 || player.rolling > 0) return;
      const def = gearPower().def;
      const taken = Math.max(1, Math.round(dmg - def * 0.35));
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
        showToast('쓰러졌다… R로 재시작');
      }
    };

    const spawnGroundDrop = (x: number, y: number, item: Item) => {
      const ang = Math.random() * Math.PI * 2;
      const dist = rand(18, 42);
      groundDrops.push({
        uid: nextDropUid++,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        item,
        life: GROUND_TTL,
        maxLife: GROUND_TTL,
      });
    };

    const killMob = (m: Mob) => {
      const dropN =
        m.kind === 'boss' ? BOSS_DROP_COUNT : m.elite ? ELITE_DROP_COUNT : 1;
      let lastName = '';
      for (let i = 0; i < dropN; i += 1) {
        const loot = draftToItem(rollLootDrop());
        lastName = loot.name;
        spawnGroundDrop(m.x, m.y, loot);
      }
      killCount += 1;
      const bossLabel =
        m.kind === 'boss'
          ? ((bal.mobs.boss as {label?: string}).label ?? '보스')
          : '';
      const eliteLabel =
        ((bal.mobs as {elite?: {label?: string}}).elite?.label ?? '정예');
      fx.push({
        x: m.x,
        y: m.y,
        life: 1.1,
        max: 1.1,
        text:
          m.kind === 'boss'
            ? `${bossLabel} 처치! x${dropN}`
            : m.elite
              ? `${eliteLabel} 처치! x${dropN}`
              : `+${lastName}`,
        color: m.kind === 'boss' ? '#ff6d00' : m.elite ? '#ce93d8' : '#fff59d',
      });
      showToast(
        m.kind === 'boss'
          ? `${bossLabel} 처치 · 아이템 ${dropN}개!`
          : m.elite
            ? `${eliteLabel} 처치 · 아이템 ${dropN}개!`
            : `${lastName} 드랍!`,
      );
      mobs = mobs.filter((x) => x.id !== m.id);
      if (m.kind === 'boss') scheduleBossRespawn();
      else scheduleRespawn();
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
        if (!canPickupItem(d.item, player.job)) {
          if (wrongJobToastCd <= 0 && d.item.job) {
            showToast(`${d.item.name} · 집을 수 없음`);
            wrongJobToastCd = drops.wrongJobToastCooldown;
          }
          keep.push(d);
          continue;
        }
        if (ownsSameUniqueGear(inventory, equippedRef.current, d.item)) {
          if (wrongJobToastCd <= 0) {
            showToast(alreadyOwnedToast());
            wrongJobToastCd = drops.wrongJobToastCooldown;
          }
          keep.push(d);
          continue;
        }
        if (!putItemInBag(inventory, d.item)) {
          showToast('가방이 가득 찼어요');
          keep.push(d);
          continue;
        }
        syncBag();
        fx.push({
          x: d.x,
          y: d.y - 12,
          life: 0.6,
          max: 0.6,
          text: `+${d.item.name}`,
          color: d.item.color,
        });
        showToast(`${d.item.name} 획득!`);
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

      const pushSkillFx = (x: number, y: number, life = displaySettings.skillFx.life) => {
        fx.push({
          x,
          y,
          life,
          max: life,
          color: sk.fxColor,
          r: sk.fxRadius,
          skillId: sk.id,
        });
      };

      if (sk.id === 'slash') {
        const offset = sk.offset ?? 36;
        const ax = player.x + Math.cos(player.facing) * offset;
        const ay = player.y + Math.sin(player.facing) * offset;
        damageMobsInCircle(ax, ay, sk.radius ?? 48, hit);
        pushSkillFx(ax, ay, 0.25);
      } else if (sk.id === 'spin') {
        damageMobsInCircle(player.x, player.y, sk.radius ?? 78, hit);
        pushSkillFx(player.x, player.y, 0.35);
      } else if (sk.id === 'bash') {
        const dash = sk.dashSpeed ?? 520;
        player.vx += Math.cos(player.facing) * dash;
        player.vy += Math.sin(player.facing) * dash;
        player.invuln = Math.max(player.invuln, sk.invuln ?? 0.35);
        const offset = sk.offset ?? 40;
        damageMobsInCircle(
          player.x + Math.cos(player.facing) * offset,
          player.y + Math.sin(player.facing) * offset,
          sk.radius ?? 55,
          hit,
        );
        pushSkillFx(
          player.x + Math.cos(player.facing) * offset,
          player.y + Math.sin(player.facing) * offset,
          0.3,
        );
      } else if (sk.id === 'bolt') {
        const spd = sk.projectileSpeed ?? 520;
        projectiles.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(player.facing) * spd,
          vy: Math.sin(player.facing) * spd,
          life: sk.projectileLife ?? 1.4,
          dmg: hit,
          color: sk.fxColor,
        });
        pushSkillFx(player.x, player.y, 0.2);
      } else if (sk.id === 'nova') {
        damageMobsInCircle(player.x, player.y, sk.radius ?? 110, hit);
        pushSkillFx(player.x, player.y, 0.4);
      } else if (sk.id === 'shield') {
        player.invuln = Math.max(player.invuln, sk.invuln ?? 2.2);
        pushSkillFx(player.x, player.y, 0.5);
        showToast('보호막!');
      }
    };

    const useItemSlot = (slot: number) => {
      if (!alive) return;
      // 0..2 skills (1..3), 3..4 items (4..5) → bag[0..1]
      if (slot < 3) {
        useSkill(slot);
        return;
      }
      const item = inventory[slot - 3];
      if (!item || item.kind === 'empty' || item.qty <= 0) return;

      if (item.kind === 'potion') {
        player.hp = Math.min(player.maxHp, player.hp + bal.items.potionHeal);
        showToast(`체력 회복 +${bal.items.potionHeal}`);
      } else if (item.kind === 'mana') {
        player.mp = Math.min(player.maxMp, player.mp + bal.items.manaRestore);
        showToast(`마나 회복 +${bal.items.manaRestore}`);
      } else if (item.kind === 'scroll') {
        player.hp = Math.min(player.maxHp, player.hp + bal.items.scrollHeal);
        player.mp = Math.min(player.maxMp, player.mp + bal.items.scrollMana);
        showToast('스크롤 사용!');
      } else if (item.kind === 'gear') {
        const msg = toggleEquipFromBag(inventory, equippedRef.current, slot - 3, player.job);
        if (msg) showToast(msg);
        syncBag();
        return;
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
        const limit = m.kind === 'boss' ? MOB_CLICK_R * 1.8 : MOB_CLICK_R;
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
        showToast('인벤은 우측 하단 · 우클릭으로 장착');
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

    const onCanvasPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (!alive) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const worldX = camX - screenW / 2 + sx;
      const worldY = camY - screenH / 2 + sy;
      const hit = mobAtWorld(worldX, worldY);
      if (hit) {
        setMobTarget(hit.id, true);
        moveTarget = {x: hit.x, y: hit.y};
        camFollow = true;
        return;
      }
      targetMobId = null;
      chaseTarget = false;
      moveTarget = {
        x: Math.max(PLAYER_R, Math.min(WORLD - PLAYER_R, worldX)),
        y: Math.max(PLAYER_R, Math.min(WORLD - PLAYER_R, worldY)),
      };
      camFollow = true;
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

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    canvas.addEventListener('pointerdown', onCanvasPointerDown);
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

      const shadow = (rx: number, ry: number, alpha = 0.28) => {
        c.fillStyle = `rgba(0,0,0,${alpha})`;
        c.beginPath();
        c.ellipse(0, 16, rx, ry, 0, 0, Math.PI * 2);
        c.fill();
      };

      if (m.kind === 'boss') {
        const pulse = 1 + Math.sin(performance.now() / 180) * 0.04;
        c.scale(pulse, pulse);
        shadow(34, 10, 0.35);
        const body = c.createRadialGradient(-10, -18, 6, 0, 0, 40);
        body.addColorStop(0, '#ff8a50');
        body.addColorStop(0.45, '#e65100');
        body.addColorStop(1, '#7f1d00');
        c.fillStyle = body;
        c.strokeStyle = '#ffab40';
        c.lineWidth = 3;
        roundRect(c, -30, -32, 60, 54, 16);
        c.fill();
        c.stroke();
        const helm = c.createLinearGradient(0, -44, 0, -24);
        helm.addColorStop(0, '#ffe082');
        helm.addColorStop(1, '#ef6c00');
        c.fillStyle = helm;
        roundRect(c, -18, -42, 36, 16, 6);
        c.fill();
        c.fillStyle = '#fff8e1';
        roundRect(c, -15, -16, 12, 14, 4);
        c.fill();
        roundRect(c, 3, -16, 12, 14, 4);
        c.fill();
        c.fillStyle = '#b71c1c';
        roundRect(c, -11, -10, 5, 6, 2);
        c.fill();
        roundRect(c, 7, -10, 5, 6, 2);
        c.fill();
        c.fillStyle = 'rgba(255, 224, 130, 0.95)';
        c.font = 'bold 12px "Fredoka", "Nunito", sans-serif';
        c.textAlign = 'center';
        c.fillText('BOSS', 0, 30);
      } else if (m.kind === 'slime') {
        shadow(18, 6);
        const g = c.createRadialGradient(-6, -10, 4, 0, 2, 24);
        g.addColorStop(0, '#c8e6c9');
        g.addColorStop(0.4, '#66bb6a');
        g.addColorStop(1, '#1b5e20');
        c.fillStyle = g;
        c.beginPath();
        c.ellipse(0, 0, 18, 15, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.45)';
        c.beginPath();
        c.ellipse(-6, -6, 5, 4, -0.3, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#fff';
        roundRect(c, -9, -5, 7, 8, 3);
        c.fill();
        roundRect(c, 2, -5, 7, 8, 3);
        c.fill();
        c.fillStyle = '#1b1b1b';
        roundRect(c, -7, -2, 3, 4, 1);
        c.fill();
        roundRect(c, 4, -2, 3, 4, 1);
        c.fill();
      } else if (m.kind === 'bat') {
        shadow(20, 5, 0.22);
        const wing = c.createRadialGradient(0, 0, 2, 0, 0, 26);
        wing.addColorStop(0, '#b39ddb');
        wing.addColorStop(1, '#4527a0');
        c.fillStyle = wing;
        c.beginPath();
        c.moveTo(-24, 2);
        c.quadraticCurveTo(-16, -16, -4, -6);
        c.lineTo(0, 0);
        c.lineTo(4, -6);
        c.quadraticCurveTo(16, -16, 24, 2);
        c.quadraticCurveTo(10, 10, 0, 6);
        c.quadraticCurveTo(-10, 10, -24, 2);
        c.closePath();
        c.fill();
        const head = c.createRadialGradient(-2, -4, 2, 0, 0, 12);
        head.addColorStop(0, '#d1c4e9');
        head.addColorStop(1, '#5e35b1');
        c.fillStyle = head;
        roundRect(c, -9, -10, 18, 16, 7);
        c.fill();
        c.fillStyle = '#fff';
        roundRect(c, -6, -5, 4, 4, 2);
        c.fill();
        roundRect(c, 2, -5, 4, 4, 2);
        c.fill();
        c.fillStyle = '#311b92';
        c.fillRect(-5, -3, 2, 2);
        c.fillRect(3, -3, 2, 2);
      } else {
        shadow(16, 5);
        const stone = c.createLinearGradient(-16, -16, 16, 16);
        stone.addColorStop(0, '#d7ccc8');
        stone.addColorStop(0.45, '#8d6e63');
        stone.addColorStop(1, '#3e2723');
        c.fillStyle = stone;
        c.strokeStyle = '#4e342e';
        c.lineWidth = 2.5;
        roundRect(c, -16, -16, 32, 32, 8);
        c.fill();
        c.stroke();
        c.fillStyle = 'rgba(255, 236, 179, 0.85)';
        roundRect(c, -7, -7, 6, 6, 2);
        c.fill();
        roundRect(c, 2, 1, 6, 6, 2);
        c.fill();
        c.fillStyle = '#3e2723';
        c.fillRect(-5, -5, 2, 2);
        c.fillRect(4, 3, 2, 2);
      }
      // hp bar
      const barW = m.kind === 'boss' ? 52 : 34;
      const barY = m.kind === 'boss' ? -48 : -28;
      c.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(c, -barW / 2 - 1, barY - 1, barW + 2, 7, 3);
      c.fill();
      c.fillStyle = '#2a2a2a';
      c.fillRect(-barW / 2, barY, barW, 5);
      const hpG = c.createLinearGradient(-barW / 2, 0, barW / 2, 0);
      if (m.kind === 'boss') {
        hpG.addColorStop(0, '#ff6d00');
        hpG.addColorStop(1, '#ffab40');
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

      for (let ty = ty0; ty <= ty1; ty += 1) {
        for (let tx = tx0; tx <= tx1; tx += 1) {
          if (tx < 0 || ty < 0 || tx * TILE >= WORLD || ty * TILE >= WORLD) continue;
          const s = tileSeed(tx, ty);
          const base = (tx + ty) % 2 === 0 ? '#2e7d4f' : '#34855a';
          ctx.fillStyle = s > 0.92 ? '#3d8f62' : s > 0.8 ? '#2a6b45' : base;
          ctx.fillRect(tx * TILE, ty * TILE, TILE + 1, TILE + 1);
          if (s > 0.96) {
            ctx.fillStyle = '#81c784';
            ctx.fillRect(tx * TILE + 28, ty * TILE + 24, 18, 18);
          } else if (s < 0.04) {
            ctx.fillStyle = '#6d4c41';
            ctx.fillRect(tx * TILE + 30, ty * TILE + 30, 14, 14);
          }
        }
      }

      // world border hint
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
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
        const ttlRatio = d.life / d.maxLife;
        ctx.globalAlpha = mine ? 1 : 0.7;
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
          if (!mine) {
            ctx.fillStyle = 'rgba(255, 82, 82, 0.35)';
            ctx.fillRect(d.x - sz / 2, d.y - sz / 2 + bob, sz, sz);
          }
        } else {
          ctx.fillStyle = mine ? d.item.color : wrongJobColor();
          ctx.fillRect(d.x - 8, d.y - 8 + bob, 16, 16);
          ctx.strokeStyle = '#fff';
          ctx.strokeRect(d.x - 8.5, d.y - 8.5 + bob, 17, 17);
        }
        // tier ring (skipped / dimmed when wrong job — name color carries the signal)
        if (mine) {
          if (d.item.tier === 'hero') {
            ctx.strokeStyle = '#e65100';
            ctx.lineWidth = 2;
            ctx.strokeRect(d.x - sz / 2 - 1, d.y - sz / 2 + bob - 1, sz + 2, sz + 2);
          } else if (d.item.tier === 'unique') {
            ctx.strokeStyle = '#ffd54f';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(d.x - sz / 2 - 1, d.y - sz / 2 + bob - 1, sz + 2, sz + 2);
          } else if (d.item.tier === 'ascend') {
            ctx.strokeStyle = '#42a5f5';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(d.x - sz / 2 - 1, d.y - sz / 2 + bob - 1, sz + 2, sz + 2);
          }
        } else {
          ctx.strokeStyle = wrongJobColor();
          ctx.lineWidth = 2;
          ctx.strokeRect(d.x - sz / 2 - 1, d.y - sz / 2 + bob - 1, sz + 2, sz + 2);
        }
        // ground name (red if wrong job)
        if (showNameOnGround() && d.item.name) {
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(0,0,0,0.65)';
          ctx.strokeText(d.item.name, d.x, d.y - 14 + bob);
          ctx.fillStyle = mine ? '#fffde7' : wrongJobColor();
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
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const f of fx) {
        const a = f.life / f.max;
        ctx.globalAlpha = Math.max(0, a);
        if (f.skillId) {
          drawSkillSprite(ctx, jobImages, f.skillId, f.x, f.y, Math.max(0.2, a));
        } else if (f.r) {
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

      if (player.invuln > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.sin(performance.now() / 40);
      const moving =
        Math.hypot(player.vx, player.vy) > 35 ||
        keys.has('KeyW') ||
        keys.has('KeyA') ||
        keys.has('KeyS') ||
        keys.has('KeyD') ||
        Boolean(moveTarget) ||
        chaseTarget;
      let action: ActionId = 'idle';
      if (player.rolling > 0) action = 'roll';
      else if (moving) {
        const frame = Math.floor(performance.now() / (1000 / displaySettings.actions.walk.fps));
        action = frame % 2 === 0 ? 'walk' : 'idle';
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
      );
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    const drawMinimap = (viewW: number, viewH: number) => {
      // Full world map — yellow rect shows where the screen is on the map
      mctx.fillStyle = '#1b4332';
      mctx.fillRect(0, 0, miniBox.w, miniBox.h);
      mctx.strokeStyle = 'rgba(255,255,255,0.08)';
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
        if (m.kind === 'boss') {
          mctx.fillStyle = '#ff6d00';
          mctx.fillRect(u - 4, v - 4, 8, 8);
          mctx.strokeStyle = '#ffe082';
          mctx.strokeRect(u - 4.5, v - 4.5, 9, 9);
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
      // bars
      const barX = 16;
      let barY = 16;
      const barW = 220;
      const drawBar = (label: string, v: number, max: number, color: string) => {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(barX, barY, barW, 18);
        ctx.fillStyle = color;
        ctx.fillRect(barX, barY, barW * (v / max), 18);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.strokeRect(barX, barY, barW, 18);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${label} ${Math.ceil(v)}/${max}`, barX + 8, barY + 13);
        barY += 24;
      };
      drawBar('HP', player.hp, player.maxHp, '#e53935');
      drawBar('MP', player.mp, player.maxMp, '#1e88e5');
      drawBar('ST', player.stamina, player.maxStamina, '#43a047');

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(barX, barY, 220, 44);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`${charName} · ${jobLabel(player.job)}`, barX + 8, barY + 18);
      ctx.font = '11px sans-serif';
      ctx.fillText(`처치 ${killCount} · I 인벤 · Tab 타겟 · Space 구르기`, barX + 8, barY + 34);

      // hotbar — prefer left shift away from inv; lift only if still no room
      const slot = 52;
      const gap = 6;
      const total = HOTBAR * slot + (HOTBAR - 1) * gap;
      const invW = Math.min(560, viewW - 24);
      const invH =
        viewW <= 900
          ? Math.min(330, viewH * 0.42)
          : Math.min(390, Math.max(180, viewH - 100));
      const invLeft = viewW - 12 - invW;
      const padLeft = 16;
      const gapToInv = 14;
      const maxRight = invLeft - gapToInv;
      const centerX = (viewW - total) / 2;
      let hx = centerX;
      let hy = viewH - 70;
      if (hx + total > maxRight) {
        hx = Math.max(padLeft, maxRight - total);
      }
      if (hx + total > maxRight) {
        // inventory too wide (e.g. full-bleed) — raise above it, then recenter
        hy = Math.max(96, viewH - invH - 12 - slot - 16);
        hx = centerX;
      }
      const iconSz = displaySettings.hotbarIconSize ?? 32;
      for (let i = 0; i < HOTBAR; i += 1) {
        const x = hx + i * (slot + gap);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(x, hy, slot, slot);
        ctx.strokeStyle = i < 3 ? '#ffe082' : 'rgba(255,255,255,0.25)';
        ctx.lineWidth = i < 3 ? 2 : 1;
        ctx.strokeRect(x + 0.5, hy + 0.5, slot - 1, slot - 1);

        if (i < 3) {
          const sk = skills[i];
          ctx.fillStyle = sk.cdLeft > 0 ? '#777' : '#fff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(sk.name, x + slot / 2, hy + 22);
          ctx.font = '10px sans-serif';
          ctx.fillText(`MP${sk.mp}`, x + slot / 2, hy + 36);
          if (sk.cdLeft > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(x, hy, slot, slot * (sk.cdLeft / sk.cd));
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
                hy + (slot - iconSz) / 2 - 2,
                iconSz,
                iconSz,
              );
            } else {
              ctx.fillStyle = it.color;
              roundRect(ctx, x + 12, hy + 10, 28, 28, 6);
              ctx.fill();
            }
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(String(it.qty), x + slot - 6, hy + slot - 8);
          }
        }
        ctx.fillStyle = '#ffe082';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(String(i + 1), x + 4, hy + 12);
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
        ctx.fillStyle = '#ff8a80';
        ctx.font = 'bold 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('YOU DIED', viewW / 2, viewH / 2 - 10);
        ctx.fillStyle = '#fff';
        ctx.font = '18px sans-serif';
        ctx.fillText('R 키로 다시 시작', viewW / 2, viewH / 2 + 28);
      }
    };

    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (alive) {
        // regen
        player.stamina = Math.min(player.maxStamina, player.stamina + (player.maxStamina / (MAX_ROLLS_EQUIV * 1.6)) * dt);
        player.mp = Math.min(player.maxMp, player.mp + bal.player.mpRegenPerSec * dt);
        applyGearVitals();
        player.hp = Math.min(player.maxHp, player.hp + bal.player.hpRegenPerSec * dt);

        player.rolling = Math.max(0, player.rolling - dt);
        player.invuln = Math.max(0, player.invuln - dt);
        player.atkCd = Math.max(0, player.atkCd - dt);
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

        if (camFollow) {
          camX += (player.x - camX) * Math.min(1, 10 * dt);
          camY += (player.y - camY) * Math.min(1, 10 * dt);
        }
        clampCam();

        // mob AI — aggro within range, chase first puller, deaggro past leash
        for (const m of mobs) {
          m.hurt = Math.max(0, m.hurt - dt);
          const dx = player.x - m.x;
          const dy = player.y - m.y;
          const d = Math.hypot(dx, dy) || 1;
          const aggroR = m.kind === 'boss' ? BOSS_AGGRO : AGGRO_RANGE;
          const deaggroR = m.kind === 'boss' ? BOSS_DEAGGRO : DEAGGRO_RANGE;
          const hitR = m.kind === 'boss' ? 44 : 28;

          if (!m.aggro && d <= aggroR) {
            pullAggro(m);
          } else if (m.aggro && d > deaggroR) {
            m.aggro = false;
          }

          if (m.aggro) {
            m.x += (dx / d) * m.speed * dt;
            m.y += (dy / d) * m.speed * dt;
            if (d < hitR) hurtPlayer(bal.mobs[m.kind].touchDamage);
          } else {
            // idle: slowly return toward spawn home
            const hx = m.homeX - m.x;
            const hy = m.homeY - m.y;
            const hd = Math.hypot(hx, hy);
            if (hd > 8) {
              m.x += (hx / hd) * m.speed * 0.45 * dt;
              m.y += (hy / hd) * m.speed * 0.45 * dt;
            }
          }

          m.x = Math.max(margin, Math.min(WORLD - margin, m.x));
          m.y = Math.max(margin, Math.min(WORLD - margin, m.y));
        }

        // world respawns after cooldown
        gameTime += dt;
        while (pendingRespawns.length > 0 && pendingRespawns[0] <= gameTime) {
          pendingRespawns.shift();
          spawnMobsWorld(1);
        }
        while (pendingBossRespawns.length > 0 && pendingBossRespawns[0] <= gameTime) {
          pendingBossRespawns.shift();
          spawnBossesWorld(1);
        }
        // safety: if underpopulated and nothing queued, schedule catch-up (normal only)
        const normalAlive = mobs.filter((m) => m.kind !== 'boss').length;
        const need =
          (spawn.minAlive ?? 0) - normalAlive - pendingRespawns.length;
        for (let i = 0; i < need; i += 1) scheduleRespawn();
        const bossesAlive = mobs.filter((m) => m.kind === 'boss').length;
        const bossNeed = BOSS_COUNT - bossesAlive - pendingBossRespawns.length;
        for (let i = 0; i < bossNeed; i += 1) scheduleBossRespawn();

        projectiles = projectiles.filter((p) => {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          for (const m of mobs) {
            if (Math.hypot(m.x - p.x, m.y - p.y) < 22) {
              pullAggro(m);
              m.hp -= p.dmg;
              m.hurt = 0.2;
              fx.push({x: m.x, y: m.y - 18, life: 0.45, max: 0.45, text: `-${p.dmg}`, color: '#81d4fa'});
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
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointerdown', onCanvasPointerDown);
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
        <button type="button" className="todie__exit" onClick={confirmExitToMain}>
          게임 종료
        </button>
        <div className="todie__gate-card">
          <h1>todie</h1>
          <p>
            {MAP_NAME}에 들어가기 전에 이름을 정하세요.
            <br />
            직업은 검사 또는 법사입니다.
            <br />
            시작 장비는 나무작대기 · 복장은 팬티만!
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
            <button
              type="button"
              className={`todie__gate-job${pickJobUi === 'warrior' ? ' is-on' : ''}`}
              onClick={() => setPickJobUi('warrior')}
              disabled={loadingAssets}
            >
              검사
            </button>
            <button
              type="button"
              className={`todie__gate-job${pickJobUi === 'mage' ? ' is-on' : ''}`}
              onClick={() => setPickJobUi('mage')}
              disabled={loadingAssets}
            >
              법사
            </button>
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
      <div className="todie__minimap-wrap">
        <button type="button" className="todie__exit" onClick={confirmExitToMain}>
          게임 종료
        </button>
        <canvas className="todie__minimap" ref={miniRef} />
      </div>
      <InventoryDock
        bag={bagRef.current}
        equipped={equippedRef.current}
        job={startJob}
        charName={charName}
        images={assetsRef.current?.jobs[startJob] ?? null}
        gearImages={assetsRef.current?.gear ?? null}
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
      />
    </div>
  );
}
