'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {KidsIcon} from '@/components/kids-icon';
import type {KidsIconId} from '@/assets/kids-icons';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import {choiceCount} from '@/games/shared/stage-scale';
import {useWrongShake} from '@/games/shared/useWrongShake';
import './animal-tap.css';

type Animal = {id: KidsIconId; name: string};

const ANIMALS: Animal[] = [
  {id: 'animal-cat', name: '고양이'},
  {id: 'animal-dog', name: '강아지'},
  {id: 'animal-rabbit', name: '토끼'},
  {id: 'animal-bear', name: '곰'},
  {id: 'animal-frog', name: '개구리'},
  {id: 'animal-chick', name: '병아리'},
  {id: 'animal-fox', name: '여우'},
  {id: 'animal-panda', name: '팬더'},
  {id: 'animal-pig', name: '돼지'},
  {id: 'animal-monkey', name: '원숭이'},
  {id: 'animal-cow', name: '소'},
  {id: 'animal-lion', name: '사자'},
];

function pick(excludeId?: KidsIconId) {
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
  const {triggerWrong, shakeClass} = useWrongShake();

  useEffect(() => {
    setTarget(pick());
    setSeed(Date.now() % 100000);
    setReady(true);
  }, []);

  const choices = useMemo(() => {
    const n = choiceCount(score, 6, 12);
    const others = shuffle(
      ANIMALS.filter((a) => a.id !== target.id),
      seed,
    ).slice(0, n - 1);
    return shuffle([target, ...others], seed + 11);
  }, [seed, target, score]);

  const nextRound = useCallback((currentId: KidsIconId) => {
    setTarget(pick(currentId));
    setSeed((n) => n + 1);
    setMessage('동물을 찾아 콕!');
  }, []);

  const onPick = (animal: Animal) => {
    if (!ready || flash) return;
    if (animal.id === target.id) {
      setScore((n) => n + 1);
      setFlash('ok');
      setMessage('맞았어요!');
      window.setTimeout(() => {
        setFlash(null);
        nextRound(animal.id);
      }, 900);
      return;
    }
    setFlash('no');
    triggerWrong();
    setMessage('다시 찾아볼까?');
    window.setTimeout(() => setFlash(null), 450);
  };

  return (
    <div className={`animal-tap${flash ? ` animal-tap--${flash}` : ''}${shakeClass}`}>
      <SuccessBurst show={flash === 'ok'} />
      <ScoreHud score={score} />
      <div className="animal-tap__prompt">
        <p className="animal-tap__message">{message}</p>
        <div className="animal-tap__sample" aria-hidden="true">
          <KidsIcon id={target.id} size="1em" />
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
            <KidsIcon id={animal.id} size="1em" />
          </button>
        ))}
      </div>
    </div>
  );
}
