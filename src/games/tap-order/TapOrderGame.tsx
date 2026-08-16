'use client';

import {useCallback, useEffect, useState} from 'react';
import SuccessBurst from '@/games/shared/SuccessBurst';
import './tap-order.css';

type Animal = {id: string; emoji: string; name: string};

const POOL: Animal[] = [
  {id: 'dog', emoji: '🐶', name: '강아지'},
  {id: 'cat', emoji: '🐱', name: '고양이'},
  {id: 'bear', emoji: '🐻', name: '곰'},
  {id: 'rabbit', emoji: '🐰', name: '토끼'},
  {id: 'fox', emoji: '🦊', name: '여우'},
  {id: 'panda', emoji: '🐼', name: '팬더'},
];

function pickSequence(salt: number, length = 3): Animal[] {
  let t = salt + 1;
  const rand = () => {
    t = (t * 1664525 + 1013904223) >>> 0;
    return t / 0xffffffff;
  };
  const pool = [...POOL];
  const out: Animal[] = [];
  for (let i = 0; i < length; i += 1) {
    const j = Math.floor(rand() * pool.length);
    out.push(pool.splice(j, 1)[0]);
  }
  return out;
}

function shuffle<T>(items: T[], salt: number) {
  const next = [...items];
  let t = salt + 7;
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

export default function TapOrderGame() {
  const [sequence, setSequence] = useState<Animal[]>(() => pickSequence(1));
  const [choices, setChoices] = useState<Animal[]>(() => shuffle(POOL, 1));
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const nextRound = useCallback((salt: number) => {
    const seq = pickSequence(salt, 3);
    setSequence(seq);
    setChoices(shuffle(POOL, salt + 3));
    setStep(0);
  }, []);

  useEffect(() => {
    nextRound(Date.now() % 100000);
  }, [nextRound]);

  const onPick = (animal: Animal) => {
    if (flash || celebrate) return;
    const expected = sequence[step];
    if (!expected) return;

    if (animal.id !== expected.id) {
      setFlash('no');
      window.setTimeout(() => {
        setFlash(null);
        setStep(0);
      }, 500);
      return;
    }

    const nextStep = step + 1;
    if (nextStep >= sequence.length) {
      setCelebrate(true);
      setScore((n) => n + 1);
      window.setTimeout(() => {
        setCelebrate(false);
        nextRound(Date.now() % 100000);
      }, 900);
      return;
    }

    setFlash('ok');
    setStep(nextStep);
    window.setTimeout(() => setFlash(null), 350);
  };

  return (
    <div className={`tap-order${flash ? ` tap-order--${flash}` : ''}`}>
      <SuccessBurst show={celebrate} />
      <div className="tap-order__score">★ {score}</div>
      <p className="tap-order__help">순서대로 콕! 콕! 콕!</p>

      <div className="tap-order__seq" aria-label="순서">
        {sequence.map((a, i) => (
          <span
            key={`${a.id}-${i}`}
            className={`tap-order__chip${i < step ? ' tap-order__chip--done' : ''}${i === step ? ' tap-order__chip--now' : ''}`}
            aria-hidden="true"
          >
            {a.emoji}
          </span>
        ))}
      </div>

      <div className="tap-order__grid" role="group" aria-label="동물 고르기">
        {choices.map((animal) => (
          <button
            key={animal.id}
            type="button"
            className="tap-order__btn"
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
