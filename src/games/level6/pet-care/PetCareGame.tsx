'use client';

import {useCallback, useEffect, useState} from 'react';
import SuccessBurst from '@/games/shared/SuccessBurst';
import {loadRpg, saveRpg} from '@/games/shared/rpg-storage';
import './pet-care.css';

const KEY = 'kaisa-rpg-pet-care';

type PetSave = {
  name: string;
  level: number;
  xp: number;
  hunger: number;
  love: number;
};

const DEFAULT: PetSave = {
  name: '삐약이',
  level: 1,
  xp: 0,
  hunger: 70,
  love: 70,
};

function stageEmoji(level: number) {
  if (level >= 8) return '🦅';
  if (level >= 5) return '🐔';
  if (level >= 3) return '🐥';
  return '🐣';
}

function xpNeed(level: number) {
  return 10 + level * 8;
}

export default function PetCareGame() {
  const [pet, setPet] = useState<PetSave>(DEFAULT);
  const [ready, setReady] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [msg, setMsg] = useState('밥을 주거나 놀아줘요');

  useEffect(() => {
    setPet(loadRpg(KEY, DEFAULT));
    setReady(true);
  }, []);

  const persist = useCallback((next: PetSave) => {
    setPet(next);
    saveRpg(KEY, next);
  }, []);

  const gainXp = useCallback(
    (base: PetSave, amount: number) => {
      let {level, xp} = base;
      let leveled = false;
      xp += amount;
      while (xp >= xpNeed(level)) {
        xp -= xpNeed(level);
        level += 1;
        leveled = true;
      }
      const next = {...base, level, xp};
      if (leveled) {
        setCelebrate(true);
        setMsg(`레벨 ${level}! 우와아~`);
        window.setTimeout(() => setCelebrate(false), 900);
      }
      persist(next);
      return next;
    },
    [persist],
  );

  const feed = () => {
    if (!ready) return;
    const hunger = Math.min(100, pet.hunger + 18);
    setMsg('맛있다! 냠냠');
    gainXp({...pet, hunger}, 4);
  };

  const play = () => {
    if (!ready) return;
    const love = Math.min(100, pet.love + 18);
    const hunger = Math.max(10, pet.hunger - 6);
    setMsg('신난다! 히히');
    gainXp({...pet, love, hunger}, 5);
  };

  const rest = () => {
    if (!ready) return;
    const next = {
      ...pet,
      hunger: Math.min(100, pet.hunger + 8),
      love: Math.min(100, pet.love + 4),
    };
    setMsg('쿨쿨… 쉬는 중');
    persist(next);
  };

  const need = xpNeed(pet.level);
  const pct = Math.min(100, Math.round((pet.xp / need) * 100));

  return (
    <div className="pet-care">
      <SuccessBurst show={celebrate} />
      <div className="pet-care__badge">
        Lv.{pet.level} · {pet.name}
      </div>
      <p className="pet-care__msg">{msg}</p>

      <div className="pet-care__stage" aria-hidden="true">
        <span className="pet-care__emoji">{stageEmoji(pet.level)}</span>
      </div>

      <div className="pet-care__bars">
        <label>
          경험치
          <span className="pet-care__bar">
            <i style={{width: `${pct}%`}} />
          </span>
        </label>
        <label>
          배고픔
          <span className="pet-care__bar pet-care__bar--hunger">
            <i style={{width: `${pet.hunger}%`}} />
          </span>
        </label>
        <label>
          사랑
          <span className="pet-care__bar pet-care__bar--love">
            <i style={{width: `${pet.love}%`}} />
          </span>
        </label>
      </div>

      <div className="pet-care__actions">
        <button type="button" onClick={feed}>
          🍚 밥주기
        </button>
        <button type="button" onClick={play}>
          🎾 놀아주기
        </button>
        <button type="button" onClick={rest}>
          💤 쉬기
        </button>
      </div>
    </div>
  );
}
