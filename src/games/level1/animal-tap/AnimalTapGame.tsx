'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import './animal-tap.css';

type Animal = {id: string; name: string; emoji: string};

const ANIMALS: Animal[] = [
  {id: 'cat', name: '고양이', emoji: '🐱'},
  {id: 'dog', name: '강아지', emoji: '🐶'},
  {id: 'rabbit', name: '토끼', emoji: '🐰'},
  {id: 'bear', name: '곰', emoji: '🐻'},
  {id: 'frog', name: '개구리', emoji: '🐸'},
  {id: 'chick', name: '병아리', emoji: '🐤'},
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

export default function AnimalTapGame() {
  const [ready, setReady] = useState(false);
  const [target, setTarget] = useState<Animal>(ANIMALS[0]);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('동물을 찾아 콕!');
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null);
  const [seed, setSeed] = useState(1);

  useEffect(() => {
    setTarget(pick());
    setSeed(Date.now() % 100000);
    setReady(true);
  }, []);

  const choices = useMemo(
    () => shuffle(ANIMALS, seed + target.id.length * 11),
    [seed, target.id],
  );

  const nextRound = useCallback((currentId: string) => {
    setTarget(pick(currentId));
    setSeed((n) => n + 1);
    setMessage('동물을 찾아 콕!');
  }, []);

  const onPick = (animal: Animal) => {
    if (!ready) return;
    if (animal.id === target.id) {
      setScore((n) => n + 1);
      setFlash('ok');
      setMessage('🎉');
      window.setTimeout(() => {
        setFlash(null);
        nextRound(animal.id);
      }, 900);
      return;
    }
    setFlash('no');
    setMessage('다시 찾아볼까?');
    window.setTimeout(() => setFlash(null), 450);
  };

  return (
    <div className={`animal-tap${flash ? ` animal-tap--${flash}` : ''}`}>
      <SuccessBurst show={flash === 'ok'} />
      <ScoreHud score={score} />
      <div className="animal-tap__prompt">
        <p className="animal-tap__message">{message}</p>
        <div className="animal-tap__sample" aria-hidden="true">
          {target.emoji}
        </div>
        <strong className="animal-tap__label">{target.name}</strong>
      </div>
      <div className="animal-tap__grid" role="group" aria-label="동물 고르기">
        {choices.map((animal) => (
          <button
            key={animal.id}
            type="button"
            className="animal-tap__btn"
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
