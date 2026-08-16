'use client';

import {useCallback, useEffect, useState} from 'react';
import SuccessBurst from '@/games/shared/SuccessBurst';
import {loadRpg, saveRpg} from '@/games/shared/rpg-storage';
import './hero-quest.css';

const KEY = 'kaisa-rpg-hero-quest';

type HeroSave = {
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  atk: number;
  wins: number;
};

type Monster = {emoji: string; name: string; hp: number; maxHp: number; reward: number};

const DEFAULT: HeroSave = {
  level: 1,
  xp: 0,
  hp: 30,
  maxHp: 30,
  atk: 4,
  wins: 0,
};

const FOES = [
  {emoji: '🟢', name: '슬라임', hp: 12, reward: 6},
  {emoji: '🦇', name: '박쥐', hp: 16, reward: 8},
  {emoji: '🐺', name: '늑대', hp: 22, reward: 12},
  {emoji: '🐉', name: '아기용', hp: 30, reward: 18},
];

function makeMonster(level: number): Monster {
  const base = FOES[Math.min(FOES.length - 1, Math.floor((level - 1) / 2))];
  const maxHp = base.hp + level * 2;
  return {
    emoji: base.emoji,
    name: base.name,
    hp: maxHp,
    maxHp,
    reward: base.reward + level,
  };
}

function xpNeed(level: number) {
  return 12 + level * 10;
}

export default function HeroQuestGame() {
  const [hero, setHero] = useState<HeroSave>(DEFAULT);
  const [monster, setMonster] = useState<Monster>(() => makeMonster(1));
  const [ready, setReady] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [log, setLog] = useState('몬스터를 물리쳐요!');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = loadRpg(KEY, DEFAULT);
    setHero(saved);
    setMonster(makeMonster(saved.level));
    setReady(true);
  }, []);

  const persist = useCallback((next: HeroSave) => {
    setHero(next);
    saveRpg(KEY, next);
  }, []);

  const attack = () => {
    if (!ready || busy || hero.hp <= 0) return;
    setBusy(true);

    const dmg = hero.atk + Math.floor(Math.random() * 3);
    const mHp = Math.max(0, monster.hp - dmg);
    setLog(`${dmg} 데미지!`);
    setMonster((m) => ({...m, hp: mHp}));

    window.setTimeout(() => {
      if (mHp <= 0) {
        let {level, xp, atk, maxHp, hp, wins} = hero;
        xp += monster.reward;
        wins += 1;
        let leveled = false;
        while (xp >= xpNeed(level)) {
          xp -= xpNeed(level);
          level += 1;
          atk += 1;
          maxHp += 6;
          hp = maxHp;
          leveled = true;
        }
        const next = {level, xp, atk, maxHp, hp: Math.min(maxHp, hp + 4), wins};
        persist(next);
        setCelebrate(true);
        setLog(leveled ? `레벨 ${level} 업!` : `${monster.name} 처치!`);
        window.setTimeout(() => {
          setCelebrate(false);
          setMonster(makeMonster(next.level));
          setBusy(false);
        }, 900);
        return;
      }

      const hit = 2 + Math.floor(Math.random() * 3) + Math.floor(hero.level / 3);
      const newHp = Math.max(0, hero.hp - hit);
      const next = {...hero, hp: newHp};
      persist(next);
      setLog(`아야! ${hit} 맞았어요`);
      if (newHp <= 0) {
        setLog('기절… 회복 버튼을 눌러요');
      }
      setBusy(false);
    }, 280);
  };

  const heal = () => {
    if (!ready) return;
    const next = {...hero, hp: hero.maxHp};
    persist(next);
    setMonster(makeMonster(next.level));
    setLog('기운이 났어요!');
  };

  const need = xpNeed(hero.level);

  return (
    <div className="hero-quest">
      <SuccessBurst show={celebrate} />
      <div className="hero-quest__badge">
        🦸 Lv.{hero.level} · 승 {hero.wins}
      </div>
      <p className="hero-quest__log">{log}</p>

      <div className="hero-quest__arena">
        <div className="hero-quest__side">
          <span aria-hidden="true">🦸</span>
          <strong>HP {hero.hp}/{hero.maxHp}</strong>
          <span>ATK {hero.atk}</span>
        </div>
        <div className="hero-quest__vs">VS</div>
        <div className="hero-quest__side">
          <span aria-hidden="true">{monster.emoji}</span>
          <strong>{monster.name}</strong>
          <span>
            HP {monster.hp}/{monster.maxHp}
          </span>
        </div>
      </div>

      <div className="hero-quest__xp">
        XP
        <span className="hero-quest__bar">
          <i style={{width: `${Math.min(100, (hero.xp / need) * 100)}%`}} />
        </span>
      </div>

      <div className="hero-quest__actions">
        <button type="button" onClick={attack} disabled={busy || hero.hp <= 0}>
          ⚔️ 공격
        </button>
        <button type="button" onClick={heal}>
          ❤️ 회복
        </button>
      </div>
    </div>
  );
}
