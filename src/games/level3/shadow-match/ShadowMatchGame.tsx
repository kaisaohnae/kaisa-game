'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import './shadow-match.css';

type Animal = {id: string; emoji: string; name: string};

const ANIMALS: Animal[] = [
  {id: 'dog', emoji: '🐶', name: '강아지'},
  {id: 'cat', emoji: '🐱', name: '고양이'},
  {id: 'rabbit', emoji: '🐰', name: '토끼'},
  {id: 'bear', emoji: '🐻', name: '곰'},
  {id: 'fox', emoji: '🦊', name: '여우'},
  {id: 'frog', emoji: '🐸', name: '개구리'},
];

function pick(excludeId?: string) {
  const pool = ANIMALS.filter((a) => a.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)];
}

function shuffle<T>(items: T[], salt: number) {
  const next = [...items];
  let t = salt + 1;
  const rand = () => {
    t = (t * 1664525 + 1013904223) >>> 0;
    return t / 0xffffffff;
  };
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export default function ShadowMatchGame() {
  const [ready, setReady] = useState(false);
  const [target, setTarget] = useState<Animal>(ANIMALS[0]);
  const [score, setScore] = useState(0);
  const [seed, setSeed] = useState(1);
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    setTarget(pick());
    setSeed(Date.now() % 100000);
    setReady(true);
  }, []);

  const choices = useMemo(() => {
    const others = shuffle(
      ANIMALS.filter((a) => a.id !== target.id),
      seed,
    ).slice(0, 3);
    return shuffle([target, ...others], seed + 9);
  }, [seed, target]);

  const nextRound = useCallback((currentId: string) => {
    setTarget(pick(currentId));
    setSeed((n) => n + 1);
  }, []);

  const onPick = (animal: Animal) => {
    if (!ready || celebrate || flash) return;
    if (animal.id !== target.id) {
      setFlash('no');
      window.setTimeout(() => setFlash(null), 450);
      return;
    }
    setCelebrate(true);
    setScore((n) => n + 1);
    window.setTimeout(() => {
      setCelebrate(false);
      nextRound(animal.id);
    }, 900);
  };

  return (
    <div className={`shadow-match${flash ? ` shadow-match--${flash}` : ''}`}>
      <SuccessBurst show={celebrate} />
      <ScoreHud score={score} />
      <p className="shadow-match__help">그림자 주인을 찾아요</p>

      <div className="shadow-match__shadow" aria-label={target.name}>
        <span aria-hidden="true">{target.emoji}</span>
      </div>

      <div className="shadow-match__grid" role="group" aria-label="동물 고르기">
        {choices.map((animal) => (
          <button
            key={animal.id}
            type="button"
            className="shadow-match__btn"
            aria-label={animal.name}
            onClick={() => onPick(animal)}
          >
            <span aria-hidden="true">{animal.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
