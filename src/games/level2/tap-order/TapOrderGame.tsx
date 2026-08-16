'use client';

import {useCallback, useEffect, useState} from 'react';
import {KidsIcon} from '@/components/kids-icon';
import type {KidsIconId} from '@/assets/kids-icons';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import {sequenceLength} from '@/games/shared/stage-scale';
import {useWrongShake} from '@/games/shared/useWrongShake';
import './tap-order.css';

type Animal = {id: KidsIconId; name: string};

const POOL: Animal[] = [
  {id: 'animal-dog', name: '강아지'},
  {id: 'animal-cat', name: '고양이'},
  {id: 'animal-bear', name: '곰'},
  {id: 'animal-rabbit', name: '토끼'},
  {id: 'animal-fox', name: '여우'},
  {id: 'animal-panda', name: '팬더'},
  {id: 'animal-pig', name: '돼지'},
  {id: 'animal-monkey', name: '원숭이'},
  {id: 'animal-lion', name: '사자'},
  {id: 'animal-tiger', name: '호랑이'},
  {id: 'animal-cow', name: '소'},
  {id: 'animal-chick', name: '병아리'},
];

function pickSequence(salt: number, length: number): Animal[] {
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
  const [sequence, setSequence] = useState<Animal[]>(() => pickSequence(1, 3));
  const [choices, setChoices] = useState<Animal[]>(() => shuffle(POOL, 1));
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const {triggerWrong, shakeClass} = useWrongShake();

  const nextRound = useCallback((salt: number, stage: number) => {
    const len = sequenceLength(stage, 3, 5);
    const seq = pickSequence(salt, len);
    setSequence(seq);
    setChoices(shuffle(POOL, salt + 3));
    setStep(0);
  }, []);

  useEffect(() => {
    nextRound(Date.now() % 100000, 0);
  }, [nextRound]);

  const onPick = (animal: Animal) => {
    if (flash || celebrate) return;
    const expected = sequence[step];
    if (!expected) return;

    if (animal.id !== expected.id) {
      setFlash('no');
      triggerWrong();
      window.setTimeout(() => {
        setFlash(null);
        setStep(0);
      }, 500);
      return;
    }

    const nextStep = step + 1;
    if (nextStep >= sequence.length) {
      setCelebrate(true);
      setScore((n) => {
        const ns = n + 1;
        window.setTimeout(() => {
          setCelebrate(false);
          nextRound(Date.now() % 100000, ns);
        }, 900);
        return ns;
      });
      return;
    }

    setFlash('ok');
    setStep(nextStep);
    window.setTimeout(() => setFlash(null), 350);
  };

  return (
    <div className={`tap-order${flash ? ` tap-order--${flash}` : ''}${shakeClass}`}>
      <SuccessBurst show={celebrate} />
      <ScoreHud score={score} />
      <p className="tap-order__help">순서대로 콕! 콕! 콕!</p>

      <div className="tap-order__seq" aria-label="순서">
        {sequence.map((a, i) => (
          <span
            key={`${a.id}-${i}`}
            className={`tap-order__chip${i < step ? ' tap-order__chip--done' : ''}${i === step ? ' tap-order__chip--now' : ''}`}
            aria-hidden="true"
          >
            <KidsIcon id={a.id} size="1em" />
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
            <KidsIcon id={animal.id} size="1em" />
          </button>
        ))}
      </div>
    </div>
  );
}
