'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import useMemberStore from '@/store/use-member-store';
import {
  fetchHihiCharactersCatalog,
  hihiCharacterPreviewUrl,
  hihiFacingFromMove,
  hihiSheetFrameCount,
  loadHihiAvatarPack,
  pickHihiSprite,
  type HihiAvatarPack,
  type HihiCatalogCharacter,
} from '@/lib/hihi-characters';
import {
  clearHihiLocalProfile,
  emptyHihiLocalProfile,
  loadHihiLocalProfile,
  saveHihiLocalProfile,
  type HihiLocalProfile,
} from '@/lib/hihi-local-profile';
import {DEFAULT_HIHI_MAP, fetchHihiMapConfig, getTileId, tileDef, type HihiMapConfig} from '@/lib/hihi-map';
import {mapObjectDef} from '@/games/todie/content/tiles';
import {hihiApi} from './api';
import {ChatPanel} from './ChatPanel';
import './hihi.css';
import type {HihiCharacter, HihiChatMessage, HihiPresence, HihiRegion, Screen} from './types';

const SPEED = 220;
const GUEST_KEY = 'hihi_guest_member_id';
const HIHI_RETURN = '/games/hihi/';
const SPRITE_SIZE = 80;
const MBTI = [
  'ISTJ',
  'ISFJ',
  'INFJ',
  'INTJ',
  'ISTP',
  'ISFP',
  'INFP',
  'INTP',
  'ESTP',
  'ESFP',
  'ENFP',
  'ENTP',
  'ESTJ',
  'ESFJ',
  'ENFJ',
  'ENTJ',
];
const JOBS = ['직장인', '학생', '프리랜서', '창업', '의료', '교육', 'IT', '예체능', '기타'];
const DRINK = [
  {v: 'never', l: '안 마심'},
  {v: 'sometimes', l: '가끔'},
  {v: 'often', l: '자주'},
];
const SMOKE = [
  {v: 'never', l: '비흡연'},
  {v: 'sometimes', l: '가끔'},
  {v: 'often', l: '흡연'},
];
const BLOOD = ['A', 'B', 'O', 'AB'];
const SPAWN_MARGIN = 120;

function randomSpawn(worldSize: number) {
  const lo = SPAWN_MARGIN;
  const hi = Math.max(lo + 1, worldSize - SPAWN_MARGIN);
  return {
    x: lo + Math.random() * (hi - lo),
    y: lo + Math.random() * (hi - lo),
  };
}

function ensureGuestId() {
  if (typeof window === 'undefined') return 'guest';
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = `guest_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  self: boolean,
  motionCode?: string | null,
  t = 0,
  speech?: string | null,
  sprite?: HTMLImageElement | null,
  actionFrame = 0,
  selected = false
) {
  const bounce = motionCode === 'wave' ? Math.sin(t * 12) * 4 : 0;
  const bodyY = y + bounce;

  ctx.save();
  ctx.translate(x, bodyY);

  if (selected && !self) {
    ctx.strokeStyle = 'rgba(125, 211, 199, 0.95)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 12, 26, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 143, 171, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -22, 36, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false;
    const size = SPRITE_SIZE;
    const ox = -size / 2;
    const oy = -size + 10;
    // soft ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 8, size * 0.28, size * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    const frames = hihiSheetFrameCount(sprite);
    if (frames > 1) {
      const frameW = sprite.naturalWidth / frames;
      const fi = ((actionFrame % frames) + frames) % frames;
      ctx.drawImage(sprite, fi * frameW, 0, frameW, sprite.naturalHeight, ox, oy, size, size);
    } else {
      ctx.drawImage(sprite, ox, oy, size, size);
    }
  } else {
    // no sprite — tiny placeholder (old stick-figure look removed)
    ctx.fillStyle = 'rgba(255, 246, 232, 0.2)';
    ctx.beginPath();
    ctx.arc(0, -20, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nickname (text only)
  {
    ctx.font = '600 13px Pretendard, "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const by = -SPRITE_SIZE - 2;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(12, 28, 36, 0.55)';
    ctx.strokeText(label, 0, by);
    ctx.fillStyle = self ? '#ff8fab' : '#fff6e8';
    ctx.fillText(label, 0, by);
  }

  // Speech bubble with tail
  if (speech) {
    const text = speech.length > 22 ? `${speech.slice(0, 22)}…` : speech;
    ctx.font = '500 12px Pretendard, "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const padX = 12;
    const tw = Math.min(168, ctx.measureText(text).width);
    const bw = tw + padX * 2;
    const bh = 28;
    const bx = -bw / 2;
    const by = -SPRITE_SIZE - 36;
    const tipTop = by + bh;
    const tipH = 7;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    drawRoundRect(ctx, bx + 1, by + 2, bw, bh, 12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6, tipTop + 1);
    ctx.lineTo(0, tipTop + tipH + 1);
    ctx.lineTo(6, tipTop + 1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fff8ef';
    drawRoundRect(ctx, bx, by, bw, bh, 12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6, tipTop);
    ctx.lineTo(0, tipTop + tipH);
    ctx.lineTo(6, tipTop);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 143, 171, 0.4)';
    ctx.lineWidth = 1.25;
    drawRoundRect(ctx, bx, by, bw, bh, 12);
    ctx.stroke();

    ctx.fillStyle = '#1a2b33';
    ctx.fillText(text, 0, by + bh / 2);
  }
  ctx.restore();
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
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    joystickRef.current.dx = dx;
    joystickRef.current.dy = dy;
    joystickRef.current.active = true;
    moveKnob(dx, dy);
  };

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (ptrId.current != null) return;
    ptrId.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const el = baseRef.current!;
    const rect = el.getBoundingClientRect();
    baseRect.current = {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      r: rect.width / 2,
    };
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
      className="hihi__joystick-zone"
      ref={baseRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onContextMenu={e => e.preventDefault()}
    >
      <div className="hihi__joystick-base" />
      <div className="hihi__joystick-knob" ref={knobElRef} style={{left: '50%', top: '50%'}} />
    </div>
  );
}

export default function HihiGame() {
  const member = useMemberStore(s => s.member);
  const hydrate = useMemberStore(s => s.hydrate);
  const hydrated = useMemberStore(s => s.hydrated);
  const memberId = member?.memberId || (typeof window !== 'undefined' ? ensureGuestId() : 'guest');
  const isRegisteredMember = !!member?.memberId;

  const [screen, setScreen] = useState<Screen>('boot');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [regions, setRegions] = useState<HihiRegion[]>([]);
  const [character, setCharacter] = useState<HihiCharacter | null>(null);
  const [region, setRegion] = useState<HihiRegion | null>(null);
  const [presence, setPresence] = useState<HihiPresence[]>([]);
  const [sideTab, setSideTab] = useState<'chat' | 'profile'>('chat');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspected, setInspected] = useState<HihiPresence | null>(null);
  const [whisperTarget, setWhisperTarget] = useState<HihiPresence | null>(null);
  const [chatUnread, setChatUnread] = useState(0);
  const speechRef = useRef<Map<string, {text: string; until: number}>>(new Map());
  const selectedIdRef = useRef<string | null>(null);

  const [form, setForm] = useState<HihiLocalProfile>(emptyHihiLocalProfile());
  const [nickStatus, setNickStatus] = useState<'idle' | 'checking' | 'ok' | 'taken' | 'short'>('idle');
  const [avatarOptions, setAvatarOptions] = useState<HihiCatalogCharacter[]>([]);
  const avatarPackRef = useRef<Map<string, HihiAvatarPack>>(new Map());
  const avatarMetaRef = useRef<Map<string, HihiCatalogCharacter>>(new Map());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const miniRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const joystickRef = useRef({dx: 0, dy: 0, active: false});
  const canvasDragRef = useRef({active: false, pointerId: -1, startX: 0, startY: 0, dx: 0, dy: 0, moved: false});
  const joyKnobRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HihiMapConfig>(DEFAULT_HIHI_MAP);
  const meRef = useRef({x: 4000, y: 4000, facing: 'south', motionCode: 'idle'});
  const presenceRef = useRef<HihiPresence[]>([]);
  const motionUntilRef = useRef(0);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        setError('');
        const [regs, avatars, mapCfg] = await Promise.all([
          hihiApi.regions(),
          fetchHihiCharactersCatalog(),
          fetchHihiMapConfig(),
        ]);
        if (cancelled) return;
        mapRef.current = mapCfg;
        const spawn = randomSpawn(mapCfg.worldSize);
        meRef.current = {
          ...meRef.current,
          x: spawn.x,
          y: spawn.y,
        };
        setRegions(regs);
        setAvatarOptions(avatars.characters.filter(c => c.enabled !== false && c.name));
        const meta = new Map<string, HihiCatalogCharacter>();
        for (const a of avatars.characters) {
          if (a.name) meta.set(a.name, a);
        }
        avatarMetaRef.current = meta;
        void Promise.all(
          avatars.characters
            .filter(c => c.enabled !== false && c.name)
            .map(async c => {
              const pack = await loadHihiAvatarPack(c);
              avatarPackRef.current.set(c.name, pack);
            })
        );

        const joinIfReady = async (ch: HihiCharacter) => {
          const room = regs[0] || {
            regionCode: 'hihi',
            regionName: mapCfg.name || 'hihi',
            description: '',
            worldSize: mapCfg.worldSize,
            tileSize: mapCfg.tileSize,
            spawnX: mapCfg.spawnX,
            spawnY: mapCfg.spawnY,
            maxPlayers: mapCfg.maxPlayers,
            onlineCount: 0,
          };
          meRef.current = {
            ...randomSpawn(mapCfg.worldSize),
            facing: 'south',
            motionCode: 'idle',
          };
          await hihiApi.heartbeat({
            memberId: ch.memberId,
            regionCode: room.regionCode,
            posX: meRef.current.x,
            posY: meRef.current.y,
            facing: meRef.current.facing,
            motionCode: 'idle',
            nickname: ch.nickname,
            avatarName: ch.avatarName,
            avatarTitle: ch.avatarTitle,
            profile: ch.profile,
          });
          if (cancelled) return;
          setCharacter(ch);
          setRegion(room);
          setWhisperTarget(null);
          setChatUnread(0);
          speechRef.current.clear();
          setScreen('world');
        };

        if (member?.memberId) {
          const remote = await hihiApi.getProfile(member.memberId);
          if (cancelled) return;
          if (remote) {
            const localLike: HihiLocalProfile = {
              nickname: remote.nickname,
              genderCode: remote.profile?.genderCode === 'M' ? 'M' : 'F',
              jobCode: remote.profile?.jobCode || '직장인',
              heightCm: remote.profile?.heightCm || 170,
              drinkCode: remote.profile?.drinkCode || 'sometimes',
              smokeCode: remote.profile?.smokeCode || 'never',
              mbti: remote.profile?.mbti || 'ENFP',
              bloodType: remote.profile?.bloodType || 'A',
              birthYear: remote.profile?.birthYear || 1995,
              personalityText: remote.profile?.personalityText || '',
              introText: remote.profile?.introText || '',
              avatarName: remote.avatarName || '',
              avatarTitle: remote.avatarTitle || '',
            };
            setForm(localLike);
            clearHihiLocalProfile();
            await joinIfReady({
              memberId: member.memberId,
              nickname: remote.nickname,
              posX: 4000,
              posY: 4000,
              facing: 'south',
              motionCode: 'idle',
              avatarName: remote.avatarName,
              avatarTitle: remote.avatarTitle,
              profile: {
                genderCode: localLike.genderCode,
                jobCode: localLike.jobCode,
                heightCm: localLike.heightCm,
                drinkCode: localLike.drinkCode,
                smokeCode: localLike.smokeCode,
                mbti: localLike.mbti,
                bloodType: localLike.bloodType,
                birthYear: localLike.birthYear,
                personalityText: localLike.personalityText,
                introText: localLike.introText,
              },
            });
            return;
          }

          // Member with no DB profile yet → claim guest local profile if present
          const local = loadHihiLocalProfile();
          if (local) {
            setForm(local);
            const nickCheck = await hihiApi.checkNickname(local.nickname, member.memberId);
            if (cancelled) return;
            if (!nickCheck.available) {
              setCharacter(null);
              setError('닉네임이 이미 사용 중이에요. 회원 프로필로 저장하려면 다른 닉네임으로 바꿔 주세요.');
              setNickStatus('taken');
              setScreen('edit');
              return;
            }
            await hihiApi.saveProfile({
              memberId: member.memberId,
              nickname: local.nickname,
              avatarName: local.avatarName,
              avatarTitle: local.avatarTitle,
              profile: {
                genderCode: local.genderCode,
                jobCode: local.jobCode,
                heightCm: local.heightCm,
                drinkCode: local.drinkCode,
                smokeCode: local.smokeCode,
                mbti: local.mbti,
                bloodType: local.bloodType,
                birthYear: local.birthYear,
                personalityText: local.personalityText,
                introText: local.introText,
              },
            });
            if (cancelled) return;
            clearHihiLocalProfile();
            await joinIfReady({
              memberId: member.memberId,
              nickname: local.nickname,
              posX: 4000,
              posY: 4000,
              facing: 'south',
              motionCode: 'idle',
              avatarName: local.avatarName,
              avatarTitle: local.avatarTitle,
              profile: {
                genderCode: local.genderCode,
                jobCode: local.jobCode,
                heightCm: local.heightCm,
                drinkCode: local.drinkCode,
                smokeCode: local.smokeCode,
                mbti: local.mbti,
                bloodType: local.bloodType,
                birthYear: local.birthYear,
                personalityText: local.personalityText,
                introText: local.introText,
              },
            });
            return;
          }

          setCharacter(null);
          setForm(emptyHihiLocalProfile());
          setScreen('create');
          return;
        }

        const local = loadHihiLocalProfile();
        if (local) {
          setForm(local);
          await joinIfReady({
            memberId,
            nickname: local.nickname,
            posX: 4000,
            posY: 4000,
            facing: 'south',
            motionCode: 'idle',
            avatarName: local.avatarName,
            avatarTitle: local.avatarTitle,
            profile: {
              genderCode: local.genderCode,
              jobCode: local.jobCode,
              heightCm: local.heightCm,
              drinkCode: local.drinkCode,
              smokeCode: local.smokeCode,
              mbti: local.mbti,
              bloodType: local.bloodType,
              birthYear: local.birthYear,
              personalityText: local.personalityText,
              introText: local.introText,
            },
          });
        } else {
          setScreen('create');
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '서버 연결 실패');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, member?.memberId, memberId]);

  const filteredAvatars = useMemo(() => {
    const g = form.genderCode;
    return avatarOptions.filter(a => {
      if (g === 'M') return a.gender === 'M' || a.title.startsWith('남자:');
      if (g === 'F') return a.gender === 'F' || a.title.startsWith('여자:');
      return true;
    });
  }, [avatarOptions, form.genderCode]);

  // Auto-pick first avatar when none selected / selection invalid for gender
  useEffect(() => {
    if (screen !== 'create' && screen !== 'edit') return;
    const valid = filteredAvatars.some(a => a.name === form.avatarName);
    if (valid) return;
    const first = filteredAvatars[0];
    if (!first) {
      if (form.avatarName) setForm(f => ({...f, avatarName: '', avatarTitle: ''}));
      return;
    }
    setForm(f => ({...f, avatarName: first.name, avatarTitle: first.title}));
  }, [screen, filteredAvatars, form.avatarName]);

  // Nickname uniqueness (DB) — members always; guests also so claim-on-register works
  useEffect(() => {
    if (screen !== 'create' && screen !== 'edit') return;
    const nick = form.nickname.trim();
    if (nick.length < 2) {
      setNickStatus(nick.length === 0 ? 'idle' : 'short');
      return;
    }
    let cancelled = false;
    setNickStatus('checking');
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await hihiApi.checkNickname(nick, member?.memberId || null);
          if (!cancelled) setNickStatus(res.available ? 'ok' : 'taken');
        } catch {
          if (!cancelled) setNickStatus('idle');
        }
      })();
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [form.nickname, screen, member?.memberId]);

  const ensureAvatarPack = useCallback((name?: string | null) => {
    if (!name) return null;
    const cache = avatarPackRef.current;
    let pack = cache.get(name);
    if (pack) return pack;
    const meta = avatarMetaRef.current.get(name);
    if (!meta) return null;
    // kick off load; return null this frame
    void loadHihiAvatarPack(meta).then(p => {
      avatarPackRef.current.set(name, p);
    });
    return null;
  }, []);

  const spriteFor = useCallback(
    (name: string | null | undefined, facing: string, moving: boolean, now: number) => {
      const pack = ensureAvatarPack(name);
      const action: 'idle' | 'walk' = moving ? 'walk' : 'idle';
      let img = pickHihiSprite(pack, action, facing);
      // Todie-style: flip walk/idle when strip has only 1 frame
      if (moving && img && hihiSheetFrameCount(img) <= 1) {
        const tick = Math.floor(now / (1000 / 8));
        img = pickHihiSprite(pack, tick % 2 === 0 ? 'walk' : 'idle', facing);
      }
      const frame =
        img && hihiSheetFrameCount(img) > 1
          ? Math.floor(now / (1000 / 8)) % hihiSheetFrameCount(img)
          : 0;
      return {img, frame};
    },
    [ensureAvatarPack]
  );

  const fillFormFromCharacter = (ch: HihiCharacter) => {
    const gender =
      ch.profile?.genderCode === 'M' || ch.profile?.genderCode === 'F' ? ch.profile.genderCode : 'F';
    const pool = avatarOptions.filter(a => {
      if (gender === 'M') return a.gender === 'M' || a.title.startsWith('남자:');
      return a.gender === 'F' || a.title.startsWith('여자:');
    });
    const current = pool.find(a => a.name === ch.avatarName) || pool[0];
    setForm({
      nickname: ch.nickname,
      genderCode: gender,
      jobCode: ch.profile?.jobCode || '직장인',
      heightCm: ch.profile?.heightCm || 170,
      drinkCode: ch.profile?.drinkCode || 'sometimes',
      smokeCode: ch.profile?.smokeCode || 'never',
      mbti: ch.profile?.mbti || 'ENFP',
      bloodType: ch.profile?.bloodType || 'A',
      birthYear: ch.profile?.birthYear || 1995,
      personalityText: ch.profile?.personalityText || '',
      introText: ch.profile?.introText || '',
      avatarName: current?.name || '',
      avatarTitle: current?.title || '',
    });
  };

  const openEditProfile = () => {
    if (!character) return;
    fillFormFromCharacter(character);
    setError('');
    setScreen('edit');
  };

  const toCharacter = (p: HihiLocalProfile): HihiCharacter => ({
    memberId,
    nickname: p.nickname.trim(),
    regionCode: region?.regionCode || null,
    posX: meRef.current.x,
    posY: meRef.current.y,
    facing: meRef.current.facing,
    motionCode: meRef.current.motionCode,
    avatarName: p.avatarName,
    avatarTitle: p.avatarTitle,
    profile: {
      genderCode: p.genderCode,
      jobCode: p.jobCode,
      heightCm: p.heightCm,
      drinkCode: p.drinkCode,
      smokeCode: p.smokeCode,
      mbti: p.mbti,
      bloodType: p.bloodType,
      birthYear: p.birthYear,
      personalityText: p.personalityText,
      introText: p.introText,
    },
  });

  const saveCharacter = async () => {
    try {
      setBusy(true);
      setError('');
      const nick = form.nickname.trim();
      if (nick.length < 2) throw new Error('닉네임은 2자 이상이어야 해요');
      const picked =
        filteredAvatars.find(a => a.name === form.avatarName) || filteredAvatars[0] || null;
      if (!picked) {
        throw new Error('선택할 캐릭터가 없습니다. 스튜디오에서 먼저 가져와 주세요.');
      }
      const next: HihiLocalProfile = {
        ...form,
        nickname: nick,
        avatarName: picked.name,
        avatarTitle: picked.title,
      };

      const nickCheck = await hihiApi.checkNickname(nick, member?.memberId || null);
      if (!nickCheck.available) {
        setNickStatus('taken');
        throw new Error('이미 사용 중인 닉네임입니다. 다른 닉네임을 골라 주세요.');
      }
      setNickStatus('ok');

      if (isRegisteredMember && member?.memberId) {
        await hihiApi.saveProfile({
          memberId: member.memberId,
          nickname: next.nickname,
          avatarName: next.avatarName,
          avatarTitle: next.avatarTitle,
          profile: {
            genderCode: next.genderCode,
            jobCode: next.jobCode,
            heightCm: next.heightCm,
            drinkCode: next.drinkCode,
            smokeCode: next.smokeCode,
            mbti: next.mbti,
            bloodType: next.bloodType,
            birthYear: next.birthYear,
            personalityText: next.personalityText,
            introText: next.introText,
          },
        });
        clearHihiLocalProfile();
      } else {
        saveHihiLocalProfile(next);
      }
      setForm(next);
      const ch = toCharacter(next);
      setCharacter(ch);
      try {
        await enterDefaultRoom(ch);
      } catch {
        /* error already surfaced */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setBusy(false);
    }
  };

  const goAuth = (kind: 'login' | 'register') => {
    // Keep guest profile so member session can claim it after auth
    const nick = form.nickname.trim();
    if (nick.length >= 2 || character) {
      const draft = character
        ? {
            nickname: character.nickname,
            genderCode: (character.profile?.genderCode === 'M' ? 'M' : 'F') as 'M' | 'F',
            jobCode: character.profile?.jobCode || form.jobCode,
            heightCm: character.profile?.heightCm || form.heightCm,
            drinkCode: character.profile?.drinkCode || form.drinkCode,
            smokeCode: character.profile?.smokeCode || form.smokeCode,
            mbti: character.profile?.mbti || form.mbti,
            bloodType: character.profile?.bloodType || form.bloodType,
            birthYear: character.profile?.birthYear || form.birthYear,
            personalityText: character.profile?.personalityText || form.personalityText,
            introText: character.profile?.introText || form.introText,
            avatarName: character.avatarName || form.avatarName,
            avatarTitle: character.avatarTitle || form.avatarTitle,
          }
        : {...form, nickname: nick || form.nickname};
      if (draft.nickname.trim().length >= 2) saveHihiLocalProfile(draft);
    }
    const q = encodeURIComponent(HIHI_RETURN);
    window.location.href = kind === 'login' ? `/login?returnUrl=${q}` : `/register?returnUrl=${q}`;
  };

  const defaultRoom = (): HihiRegion => {
    const map = mapRef.current;
    return (
      regions[0] || {
        regionCode: 'hihi',
        regionName: map.name || 'hihi',
        description: '',
        worldSize: map.worldSize,
        tileSize: map.tileSize,
        spawnX: map.spawnX,
        spawnY: map.spawnY,
        maxPlayers: map.maxPlayers,
        onlineCount: 0,
      }
    );
  };

  const enterWithCharacter = async (ch: HihiCharacter, r: HihiRegion) => {
    setBusy(true);
    setError('');
    try {
      meRef.current = {
        ...randomSpawn(r.worldSize || mapRef.current.worldSize),
        facing: 'south',
        motionCode: 'idle',
      };
      await hihiApi.heartbeat({
        memberId: ch.memberId || memberId,
        regionCode: r.regionCode,
        posX: meRef.current.x,
        posY: meRef.current.y,
        facing: meRef.current.facing,
        motionCode: 'idle',
        nickname: ch.nickname,
        avatarName: ch.avatarName,
        avatarTitle: ch.avatarTitle,
        profile: ch.profile,
      });
      setCharacter(ch);
      setRegion(r);
      setWhisperTarget(null);
      setChatUnread(0);
      speechRef.current.clear();
      setSelectedId(null);
      setInspected(null);
      setScreen('world');
    } catch (e) {
      setError(e instanceof Error ? e.message : '입장 실패');
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const enterDefaultRoom = async (ch?: HihiCharacter | null) => {
    const target = ch || character;
    if (!target) throw new Error('프로필을 먼저 만들어 주세요');
    await enterWithCharacter(target, defaultRoom());
  };

  const onChatMessages = useCallback((msgs: HihiChatMessage[]) => {
    const now = performance.now();
    for (const m of msgs.slice(-12)) {
      if (!m.memberId || m.messageType === 'system' || m.messageType === 'whisper') continue;
      speechRef.current.set(m.memberId, {text: m.message, until: now + 4200});
    }
  }, []);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (screen !== 'world' || !region) return;
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        keysRef.current[k] = down;
        e.preventDefault();
      }
      if (down && e.key === 'Tab') {
        e.preventDefault();
        const others = presenceRef.current.filter(p => p.memberId !== memberId);
        if (!others.length) {
          setSelectedId(null);
          return;
        }
        const cur = selectedIdRef.current;
        const idx = others.findIndex(p => p.memberId === cur);
        const next = others[(idx + 1) % others.length]!;
        setSelectedId(next.memberId);
      }
    };
    const down = (e: KeyboardEvent) => onKey(e, true);
    const up = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [screen, region, memberId]);

  // Drop selection if player left
  useEffect(() => {
    if (!selectedId) return;
    if (!presence.some(p => p.memberId === selectedId && p.memberId !== memberId)) {
      setSelectedId(null);
    }
  }, [presence, selectedId, memberId]);

  useEffect(() => {
    if (screen !== 'world' || !region || !character) return;
    let alive = true;
    const tick = async () => {
      try {
        const me = meRef.current;
        const list = await hihiApi.heartbeat({
          memberId,
          regionCode: region.regionCode,
          posX: me.x,
          posY: me.y,
          facing: me.facing,
          motionCode: me.motionCode,
          nickname: character.nickname,
          avatarName: character.avatarName,
          avatarTitle: character.avatarTitle,
          profile: character.profile,
        });
        if (!alive) return;
        presenceRef.current = list;
        setPresence(list);
      } catch {
        /* ignore transient */
      }
    };
    tick();
    const id = window.setInterval(tick, 1500);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [screen, region, memberId, character]);

  const openSelectedProfile = () => {
    const id = selectedIdRef.current;
    if (!id) return;
    const target = presenceRef.current.find(p => p.memberId === id) || null;
    if (!target) return;
    setInspected(target);
    setSideTab('profile');
  };

  useEffect(() => {
    if (screen !== 'world') return;
    const canvas = canvasRef.current;
    const mini = miniRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const mctx = mini?.getContext('2d') || null;

    let raf = 0;
    let last = performance.now();
    const DRAG_DEAD = 12;
    const DRAG_MAX = 120;
    const MINI_FULL = {w: 320, h: 320};
    const miniBox = {
      w: MINI_FULL.w,
      h: MINI_FULL.h,
      dragging: false,
      lastX: 0,
      lastY: 0,
      interactive: true,
    };
    const cam = {x: meRef.current.x, y: meRef.current.y, follow: true};

    const pickAtClient = (clientX: number, clientY: number) => {
      if (!character) return;
      const rect = canvas.getBoundingClientRect();
      const sx = ((clientX - rect.left) / rect.width) * canvas.width;
      const sy = ((clientY - rect.top) / rect.height) * canvas.height;
      const camX = cam.x - canvas.width / 2;
      const camY = cam.y - canvas.height / 2;
      const worldX = sx + camX;
      const worldY = sy + camY;
      const hit = presenceRef.current.find(p => {
        if (p.memberId === character.memberId) return false;
        const ddx = p.posX - worldX;
        const ddy = p.posY - worldY;
        return ddx * ddx + ddy * ddy < 48 * 48;
      });
      setSelectedId(hit?.memberId || null);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const drag = canvasDragRef.current;
      drag.active = true;
      drag.pointerId = e.pointerId;
      drag.startX = e.clientX;
      drag.startY = e.clientY;
      drag.dx = 0;
      drag.dy = 0;
      drag.moved = false;
      cam.follow = true;
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const drag = canvasDragRef.current;
      if (!drag.active || e.pointerId !== drag.pointerId) return;
      const rawDx = e.clientX - drag.startX;
      const rawDy = e.clientY - drag.startY;
      const dist = Math.hypot(rawDx, rawDy);
      if (dist < DRAG_DEAD) {
        drag.dx = 0;
        drag.dy = 0;
        return;
      }
      drag.moved = true;
      const effective = Math.min(dist, DRAG_MAX);
      const scale = effective / DRAG_MAX;
      drag.dx = (rawDx / dist) * scale;
      drag.dy = (rawDy / dist) * scale;
    };

    const onPointerUp = (e: PointerEvent) => {
      const drag = canvasDragRef.current;
      if (!drag.active || e.pointerId !== drag.pointerId) return;
      const wasTap = !drag.moved;
      const x = e.clientX;
      const y = e.clientY;
      drag.active = false;
      drag.pointerId = -1;
      drag.dx = 0;
      drag.dy = 0;
      drag.moved = false;
      if (wasTap) pickAtClient(x, y);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    const clampCam = (screenW: number, screenH: number, WORLD: number) => {
      const halfW = screenW / 2;
      const halfH = screenH / 2;
      if (WORLD <= screenW) cam.x = WORLD / 2;
      else cam.x = Math.max(halfW, Math.min(WORLD - halfW, cam.x));
      if (WORLD <= screenH) cam.y = WORLD / 2;
      else cam.y = Math.max(halfH, Math.min(WORLD - halfH, cam.y));
    };

    const getViewportMiniRect = (screenW: number, screenH: number, WORLD: number) => {
      const trueVu = ((cam.x - screenW / 2) / WORLD) * miniBox.w;
      const trueVv = ((cam.y - screenH / 2) / WORLD) * miniBox.h;
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

    const worldFromMini = (clientX: number, clientY: number) => {
      if (!mini) return {u: 0, v: 0};
      const rect = mini.getBoundingClientRect();
      const u = ((clientX - rect.left) / rect.width) * miniBox.w;
      const v = ((clientY - rect.top) / rect.height) * miniBox.h;
      return {u, v};
    };

    const applyMinimapLayout = (screenW: number) => {
      if (!mini) return;
      const compact = screenW < 1000;
      miniBox.w = compact ? Math.round(MINI_FULL.w / 2) : MINI_FULL.w;
      miniBox.h = compact ? Math.round(MINI_FULL.h / 2) : MINI_FULL.h;
      miniBox.interactive = !compact;
      if (compact) {
        miniBox.dragging = false;
        cam.follow = true;
      }
      mini.classList.toggle('is-compact', compact);
      mini.classList.toggle('is-disabled', compact);
      mini.style.pointerEvents = compact ? 'none' : 'auto';
      mini.style.cursor = compact ? 'default' : 'grab';
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      mini.width = Math.floor(miniBox.w * dpr);
      mini.height = Math.floor(miniBox.h * dpr);
      mini.style.width = `${miniBox.w}px`;
      mini.style.height = `${miniBox.h}px`;
      mctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMiniDown = (e: PointerEvent) => {
      if (!mini || !miniBox.interactive) return;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const map = mapRef.current;
      const WORLD = map.worldSize;
      const {u, v} = worldFromMini(e.clientX, e.clientY);
      const {vu, vv, vw, vh} = getViewportMiniRect(canvas.width, canvas.height, WORLD);
      const pad = 8;
      const onRect = u >= vu - pad && u <= vu + vw + pad && v >= vv - pad && v <= vv + vh + pad;
      if (!onRect) return;
      miniBox.dragging = true;
      cam.follow = false;
      miniBox.lastX = e.clientX;
      miniBox.lastY = e.clientY;
      mini.setPointerCapture(e.pointerId);
    };

    const onMiniMove = (e: PointerEvent) => {
      if (!mini || !miniBox.interactive || !miniBox.dragging) return;
      const map = mapRef.current;
      const WORLD = map.worldSize;
      const rect = mini.getBoundingClientRect();
      const dxPx = ((e.clientX - miniBox.lastX) / rect.width) * miniBox.w;
      const dyPx = ((e.clientY - miniBox.lastY) / rect.height) * miniBox.h;
      miniBox.lastX = e.clientX;
      miniBox.lastY = e.clientY;
      const scale = WORLD / miniBox.w;
      cam.x += dxPx * scale;
      cam.y += dyPx * scale;
      clampCam(canvas.width, canvas.height, WORLD);
    };

    const onMiniUp = () => {
      miniBox.dragging = false;
    };

    const onMiniDbl = () => {
      if (!miniBox.interactive) return;
      cam.follow = true;
    };

    mini?.addEventListener('pointerdown', onMiniDown);
    mini?.addEventListener('pointermove', onMiniMove);
    mini?.addEventListener('pointerup', onMiniUp);
    mini?.addEventListener('pointercancel', onMiniUp);
    mini?.addEventListener('dblclick', onMiniDbl);

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || 960;
      const h = parent?.clientHeight || 640;
      canvas.width = Math.floor(w);
      canvas.height = Math.floor(h);
      applyMinimapLayout(w);
      clampCam(w, h, mapRef.current.worldSize);
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const keys = keysRef.current;
      const joy = joystickRef.current;
      const drag = canvasDragRef.current;
      let dx = 0;
      let dy = 0;
      if (keys.w || keys.arrowup) dy -= 1;
      if (keys.s || keys.arrowdown) dy += 1;
      if (keys.a || keys.arrowleft) dx -= 1;
      if (keys.d || keys.arrowright) dx += 1;
      if (joy.active && (Math.abs(joy.dx) > 0.08 || Math.abs(joy.dy) > 0.08)) {
        dx += joy.dx;
        dy += joy.dy;
      }
      if (drag.active && (Math.abs(drag.dx) > 0.05 || Math.abs(drag.dy) > 0.05)) {
        dx += drag.dx;
        dy += drag.dy;
      }
      const map = mapRef.current;
      const WORLD = map.worldSize;
      const moving = Math.hypot(dx, dy) > 0.08;
      if (moving) {
        const len = Math.hypot(dx, dy) || 1;
        const ndx = dx / len;
        const ndy = dy / len;
        meRef.current.x = Math.max(40, Math.min(WORLD - 40, meRef.current.x + ndx * SPEED * dt));
        meRef.current.y = Math.max(40, Math.min(WORLD - 40, meRef.current.y + ndy * SPEED * dt));
        meRef.current.facing = hihiFacingFromMove(ndx, ndy);
        if (performance.now() > motionUntilRef.current) meRef.current.motionCode = 'walk';
        // Moving with controls re-engages follow, same feel as Todie canvas drag
        if (joy.active || keys.w || keys.a || keys.s || keys.d || keys.arrowup || keys.arrowdown || keys.arrowleft || keys.arrowright) {
          cam.follow = true;
        }
      } else if (performance.now() > motionUntilRef.current) {
        meRef.current.motionCode = 'idle';
      }

      if (cam.follow) {
        cam.x += (meRef.current.x - cam.x) * Math.min(1, 10 * dt);
        cam.y += (meRef.current.y - cam.y) * Math.min(1, 10 * dt);
      }
      clampCam(canvas.width, canvas.height, WORLD);
      const camX = cam.x - canvas.width / 2;
      const camY = cam.y - canvas.height / 2;
      const t = now / 1000;

      ctx.fillStyle = map.colors.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const tile = map.tileSize;
      const tileMap = map.tileMap;
      const prepared = map.tiles;
      const startCol = Math.floor(camX / tile) - 1;
      const startRow = Math.floor(camY / tile) - 1;
      const endCol = Math.ceil((camX + canvas.width) / tile) + 1;
      const endRow = Math.ceil((camY + canvas.height) / tile) + 1;
      ctx.imageSmoothingEnabled = false;
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          if (col < 0 || row < 0 || col * tile >= WORLD || row * tile >= WORLD) continue;
          const id = getTileId(tileMap, col, row);
          const sprite = prepared[id];
          const x = col * tile - camX;
          const y = row * tile - camY;
          if (sprite) {
            ctx.drawImage(sprite, x, y, tile, tile);
          } else {
            ctx.fillStyle = tileDef(id).fill;
            ctx.fillRect(x, y, tile, tile);
          }
        }
      }

      if (tileMap.objects?.length) {
        for (const o of tileMap.objects) {
          const ox = (o.tx + 0.5) * tile - camX;
          const oy = (o.ty + 0.5) * tile - camY;
          if (ox < -80 || ox > canvas.width + 80 || oy < -80 || oy > canvas.height + 80) continue;
          const imgKey = o.frame ? `${o.kind}:${o.frame}` : o.kind;
          const img = map.objects[imgKey] ?? map.objects[o.kind];
          const sz = mapObjectDef(o.kind).size;
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, ox - sz / 2, oy - sz / 2, sz, sz);
          } else {
            ctx.fillStyle = mapObjectDef(o.kind).fill;
            ctx.beginPath();
            ctx.arc(ox, oy, sz * 0.28, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.strokeStyle = map.colors.border;
      ctx.strokeRect(-camX, -camY, WORLD, WORLD);

      const others = presenceRef.current.filter(p => p.memberId !== character?.memberId);
      const speeches = speechRef.current;
      for (const [id, sp] of speeches) {
        if (sp.until < now) speeches.delete(id);
      }
      for (const p of others) {
        const pMoving = (p.motionCode || '') === 'walk';
        const {img, frame} = spriteFor(p.avatarName, p.facing || 'south', pMoving, now);
        drawAvatar(
          ctx,
          p.posX - camX,
          p.posY - camY,
          p.nickname,
          false,
          p.motionCode,
          t,
          speeches.get(p.memberId)?.text,
          img,
          frame,
          selectedIdRef.current === p.memberId
        );
      }

      {
        const {img, frame} = spriteFor(
          character?.avatarName,
          meRef.current.facing,
          meRef.current.motionCode === 'walk',
          now
        );
        drawAvatar(
          ctx,
          meRef.current.x - camX,
          meRef.current.y - camY,
          character?.nickname || 'me',
          true,
          meRef.current.motionCode,
          t,
          character ? speeches.get(character.memberId)?.text : null,
          img,
          frame
        );
      }

      if (mini && mctx) {
        const mw = miniBox.w;
        const mh = miniBox.h;
        mctx.fillStyle = map.colors.bg;
        mctx.fillRect(0, 0, mw, mh);
        const steps = 24;
        const step = mw / steps;
        const cols = Math.max(1, tileMap.cols);
        const rows = Math.max(1, tileMap.rows);
        for (let r = 0; r < steps; r++) {
          for (let c = 0; c < steps; c++) {
            const tx = Math.min(cols - 1, Math.floor((c + 0.5) * (cols / steps)));
            const ty = Math.min(rows - 1, Math.floor((r + 0.5) * (rows / steps)));
            mctx.fillStyle = tileDef(getTileId(tileMap, tx, ty)).fill;
            mctx.fillRect(c * step, r * step, step + 0.5, step + 0.5);
          }
        }
        const {vu, vv, vw, vh} = getViewportMiniRect(canvas.width, canvas.height, WORLD);
        mctx.fillStyle = 'rgba(255, 224, 130, 0.22)';
        mctx.fillRect(vu, vv, vw, vh);
        mctx.strokeStyle = map.minimap.viewColor;
        mctx.lineWidth = 2;
        mctx.strokeRect(vu, vv, vw, vh);

        for (const p of others) {
          const u = (p.posX / WORLD) * mw;
          const v = (p.posY / WORLD) * mh;
          mctx.fillStyle = map.minimap.otherColor;
          mctx.beginPath();
          mctx.arc(u, v, 3.2, 0, Math.PI * 2);
          mctx.fill();
        }
        {
          const u = (meRef.current.x / WORLD) * mw;
          const v = (meRef.current.y / WORLD) * mh;
          mctx.fillStyle = map.minimap.selfColor;
          mctx.beginPath();
          mctx.arc(u, v, 4, 0, Math.PI * 2);
          mctx.fill();
        }

        mctx.fillStyle = 'rgba(0,0,0,0.45)';
        mctx.fillRect(4, 4, 56, 16);
        mctx.fillStyle = map.minimap.viewColor;
        mctx.font = '600 10px Pretendard, sans-serif';
        mctx.textAlign = 'left';
        mctx.textBaseline = 'middle';
        mctx.fillText(map.minimap.label, 8, 12);
        mctx.strokeStyle = 'rgba(255,255,255,0.35)';
        mctx.lineWidth = 1;
        mctx.strokeRect(0.5, 0.5, mw - 1, mh - 1);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      mini?.removeEventListener('pointerdown', onMiniDown);
      mini?.removeEventListener('pointermove', onMiniMove);
      mini?.removeEventListener('pointerup', onMiniUp);
      mini?.removeEventListener('pointercancel', onMiniUp);
      mini?.removeEventListener('dblclick', onMiniDbl);
      canvasDragRef.current.active = false;
      canvasDragRef.current.dx = 0;
      canvasDragRef.current.dy = 0;
    };
  }, [screen, character, spriteFor]);

  const selectedNickname = selectedId
    ? presence.find(p => p.memberId === selectedId)?.nickname || null
    : null;

  if (screen === 'boot') {
    return (
      <div className="hihi">
        <div className="hihi__center">
          <h1>hihi</h1>
          <p>소개팅 오픈월드 로딩 중…</p>
          {error && <div className="hihi__error">{error}</div>}
          {busy && <div className="hihi__meta">connecting game-api…</div>}
        </div>
      </div>
    );
  }

  if (screen === 'create' || screen === 'edit') {
    const editing = screen === 'edit';
    return (
      <div className="hihi hihi--scroll">
        <div className="hihi__center hihi__center--plain" style={{width: 'min(760px, 96vw)'}}>
          <div className="hihi__form">
            {member && (
              <div className="hihi__meta">회원 · {member.memberName || member.email} · 프로필 DB 저장</div>
            )}
            <label className="hihi__field">
              닉네임
              <input
                value={form.nickname}
                maxLength={12}
                onChange={e => setForm(f => ({...f, nickname: e.target.value}))}
                placeholder="2~12자"
              />
            </label>

            <div className="hihi__field">
              <span className="hihi__field-label">성별</span>
              <div className="hihi__radio-row" role="radiogroup" aria-label="성별">
                {(
                  [
                    ['F', '여자'],
                    ['M', '남자'],
                  ] as const
                ).map(([code, label]) => (
                  <label key={code} className={`hihi__radio${form.genderCode === code ? ' is-on' : ''}`}>
                    <input
                      type="radio"
                      name="hihi-gender"
                      value={code}
                      checked={form.genderCode === code}
                      onChange={() =>
                        setForm(f => {
                          const pool = avatarOptions.filter(a => {
                            if (code === 'M') return a.gender === 'M' || a.title.startsWith('남자:');
                            return a.gender === 'F' || a.title.startsWith('여자:');
                          });
                          const first = pool[0];
                          return {
                            ...f,
                            genderCode: code,
                            avatarName: first?.name || '',
                            avatarTitle: first?.title || '',
                          };
                        })
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="hihi__form-grid">
              <label className="hihi__field">
                직업
                <select value={form.jobCode} onChange={e => setForm(f => ({...f, jobCode: e.target.value}))}>
                  {JOBS.map(j => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </label>
              <label className="hihi__field">
                키(cm)
                <input
                  type="number"
                  min={140}
                  max={220}
                  value={form.heightCm}
                  onChange={e => setForm(f => ({...f, heightCm: Number(e.target.value)}))}
                />
              </label>
              <label className="hihi__field">
                출생연도
                <input
                  type="number"
                  min={1960}
                  max={2010}
                  value={form.birthYear}
                  onChange={e => setForm(f => ({...f, birthYear: Number(e.target.value)}))}
                />
              </label>
              <label className="hihi__field">
                음주
                <select value={form.drinkCode} onChange={e => setForm(f => ({...f, drinkCode: e.target.value}))}>
                  {DRINK.map(d => (
                    <option key={d.v} value={d.v}>
                      {d.l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="hihi__field">
                흡연
                <select value={form.smokeCode} onChange={e => setForm(f => ({...f, smokeCode: e.target.value}))}>
                  {SMOKE.map(d => (
                    <option key={d.v} value={d.v}>
                      {d.l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="hihi__field">
                MBTI
                <select value={form.mbti} onChange={e => setForm(f => ({...f, mbti: e.target.value}))}>
                  {MBTI.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="hihi__field">
                혈액형
                <select value={form.bloodType} onChange={e => setForm(f => ({...f, bloodType: e.target.value}))}>
                  {BLOOD.map(b => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="hihi__field">
              <div className="hihi__field-head">
                <span className="hihi__field-label">캐릭터 선택</span>
                <span className="hihi__meta">{form.avatarTitle || '미선택'}</span>
              </div>
              <div className="hihi__avatar-grid">
                {filteredAvatars.map(a => {
                  const selected = form.avatarName === a.name;
                  return (
                    <button
                      key={a.name}
                      type="button"
                      className={`hihi__avatar-card${selected ? ' is-on is-primary' : ''}`}
                      onClick={() => setForm(f => ({...f, avatarName: a.name, avatarTitle: a.title}))}
                    >
                      <span className="hihi__avatar-pick">
                        <img src={hihiCharacterPreviewUrl(a)} alt="" draggable={false} />
                        <span>{a.title.replace(/^(남자|여자):\s*/, '')}</span>
                      </span>
                    </button>
                  );
                })}
                {!filteredAvatars.length && (
                  <div className="hihi__meta">스튜디오에서 hihi 캐릭터를 먼저 가져오세요.</div>
                )}
              </div>
            </div>

            <label className="hihi__field">
              성격 한 줄
              <input
                value={form.personalityText}
                onChange={e => setForm(f => ({...f, personalityText: e.target.value}))}
                placeholder="예: 조용하지만 먼저 말 걸어주면 잘 웃음"
              />
            </label>
            <label className="hihi__field">
              소개팅 소개글
              <textarea
                value={form.introText}
                onChange={e => setForm(f => ({...f, introText: e.target.value}))}
                placeholder="취미, 만나고 싶은 분위기 등"
              />
            </label>
            {error && <div className="hihi__error">{error}</div>}
            <div className="hihi__form-actions">
              <button
                className="hihi__btn"
                disabled={
                  busy ||
                  (!editing && form.nickname.trim().length < 2) ||
                  nickStatus === 'taken' ||
                  nickStatus === 'short' ||
                  nickStatus === 'checking'
                }
                onClick={saveCharacter}
              >
                {editing ? '프로필 저장' : '캐릭터 만들기'}
              </button>
              {editing && (
                <button
                  className="hihi__btn hihi__btn--ghost"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (character) void enterDefaultRoom(character);
                    else setScreen('create');
                  }}
                >
                  취소
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hihi">
      <div className="hihi__body">
        <div className="hihi__canvas-wrap">
          <canvas ref={canvasRef} className="hihi__canvas" />
          <div className="hihi__minimap-wrap">
            <canvas ref={miniRef} className="hihi__minimap" />
          </div>
          <VirtualJoystick joystickRef={joystickRef} knobElRef={joyKnobRef} />
          <div className="hihi__hud">
            <div className="hihi__chip">{character?.nickname}</div>
            <div className="hihi__chip">
              x {Math.round(meRef.current.x)} / y {Math.round(meRef.current.y)}
            </div>
            <div className="hihi__chip">online {presence.length}</div>
            {selectedId && (
              <button className="hihi__chip hihi__chip--action" type="button" onClick={openSelectedProfile}>
                {selectedNickname ? `정보 보기 · ${selectedNickname}` : '정보 보기'}
              </button>
            )}
          </div>
        </div>
        <aside className="hihi__side">
          <div className="hihi__side-head">
            <button className="hihi__btn hihi__btn--ghost hihi__leave" type="button" onClick={openEditProfile}>
              프로필 설정
            </button>
          </div>
          <div className="hihi__tabs">
            <button className={sideTab === 'chat' ? 'is-on' : ''} onClick={() => setSideTab('chat')}>
              채팅{chatUnread > 0 ? ` (${chatUnread})` : ''}
            </button>
            <button className={sideTab === 'profile' ? 'is-on' : ''} onClick={() => setSideTab('profile')}>
              프로필
            </button>
          </div>
          <div className="hihi__panel">
            {region && character && (
              <div style={{display: sideTab === 'chat' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0}}>
                <ChatPanel
                  memberId={memberId}
                  nickname={character.nickname}
                  regionCode={region.regionCode}
                  whisperTarget={whisperTarget}
                  onClearWhisper={() => setWhisperTarget(null)}
                  onMessagesChange={onChatMessages}
                  active={sideTab === 'chat'}
                  onUnread={setChatUnread}
                />
              </div>
            )}
            {sideTab === 'profile' && (
              <div className="hihi__profile-card">
                {inspected ? (
                  <>
                    <strong>{inspected.nickname}</strong>
                    <div className="hihi__meta">선택한 플레이어</div>
                    <div className="hihi__profile-row">
                      <span>직업</span>
                      <b>{inspected.profileBrief?.jobCode || '-'}</b>
                    </div>
                    <div className="hihi__profile-row">
                      <span>키</span>
                      <b>{inspected.profileBrief?.heightCm || '-'}cm</b>
                    </div>
                    <div className="hihi__profile-row">
                      <span>MBTI</span>
                      <b>{inspected.profileBrief?.mbti || '-'}</b>
                    </div>
                    <div className="hihi__profile-row">
                      <span>혈액형</span>
                      <b>{inspected.profileBrief?.bloodType || '-'}</b>
                    </div>
                    <div className="hihi__profile-row">
                      <span>음주</span>
                      <b>{inspected.profileBrief?.drinkCode || '-'}</b>
                    </div>
                    <div className="hihi__profile-row">
                      <span>흡연</span>
                      <b>{inspected.profileBrief?.smokeCode || '-'}</b>
                    </div>
                    <p>{inspected.profileBrief?.introText || '소개글 없음'}</p>
                    <button
                      className="hihi__btn"
                      type="button"
                      onClick={() => {
                        setWhisperTarget(inspected);
                        setSideTab('chat');
                      }}
                    >
                      귓속말 보내기
                    </button>
                    <button
                      className="hihi__btn hihi__btn--ghost"
                      type="button"
                      onClick={() => setInspected(null)}
                    >
                      내 프로필로
                    </button>
                  </>
                ) : (
                  <>
                    <strong>{character?.nickname}</strong>
                    <div className="hihi__profile-row">
                      <span>직업</span>
                      <b>{character?.profile?.jobCode || '-'}</b>
                    </div>
                    <div className="hihi__profile-row">
                      <span>키</span>
                      <b>{character?.profile?.heightCm || '-'}cm</b>
                    </div>
                    <div className="hihi__profile-row">
                      <span>MBTI</span>
                      <b>{character?.profile?.mbti || '-'}</b>
                    </div>
                    <div className="hihi__profile-row">
                      <span>혈액형</span>
                      <b>{character?.profile?.bloodType || '-'}</b>
                    </div>
                    <div className="hihi__profile-row">
                      <span>캐릭터</span>
                      <b>{character?.avatarTitle || '-'}</b>
                    </div>
                    <p>{character?.profile?.introText || '소개글 없음'}</p>
                    {member && <div className="hihi__meta">회원 계정에 저장된 프로필</div>}
                    <button className="hihi__btn hihi__btn--ghost" type="button" onClick={openEditProfile}>
                      프로필 설정
                    </button>
                    {selectedId && (
                      <button className="hihi__btn" type="button" onClick={openSelectedProfile}>
                        선택한 사람 정보 보기
                      </button>
                    )}
                    {!member && (
                      <div className="hihi__auth-text">
                        <button type="button" onClick={() => goAuth('register')}>
                          회원가입
                        </button>
                        <span>·</span>
                        <button type="button" onClick={() => goAuth('login')}>
                          로그인
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {error && <div className="hihi__error">{error}</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}
