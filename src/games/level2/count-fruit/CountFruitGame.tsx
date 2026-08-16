'use client';

import {useCallback, useEffect, useState} from 'react';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import {numberSpan} from '@/games/shared/stage-scale';
import {useWrongShake} from '@/games/shared/useWrongShake';
import './count-fruit.css';

const FRUITS = ['🍎', '🍌', '🍓', '🍊', '🍇', '🍉'];

function makeRound(salt: number, stage: number) {
  let t = salt + 1;
  const rand = () => {
    t = (t * 1664525 + 1013904223) >>> 0;
    return t / 0xffffffff;
  };
  const max = numberSpan(stage, 4);
  const count = 1 + Math.floor(rand() * max);
  const fruit = FRUITS[Math.floor(rand() * FRUITS.length)];
  const optionCount = Math.min(4, 3 + Math.floor(stage / 3));
  const options = new Set<number>([count]);
  while (options.size < optionCount) {
    options.add(1 + Math.floor(rand() * max));
  }
  return {
    count,
    fruit,
    options: [...options].sort(() => rand() - 0.5),
  };
}

export default function CountFruitGame() {
  const [ready, setReady] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(() => makeRound(1, 0));
  const [message, setMessage] = useState('몇 개일까요?');
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null);
  const {triggerWrong, shakeClass} = useWrongShake();

  useEffect(() => {
    setRound(makeRound(Date.now() % 100000, 0));
    setReady(true);
  }, []);

  const next = useCallback((stage: number) => {
    setRound(makeRound(Date.now() % 100000, stage));
    setMessage('몇 개일까요?');
  }, []);

  const onPick = (n: number) => {
    if (!ready || flash) return;
    if (n === round.count) {
      setScore((s) => {
        const ns = s + 1;
        setFlash('ok');
        setMessage('🎉');
        window.setTimeout(() => {
          setFlash(null);
          next(ns);
        }, 700);
        return ns;
      });
      return;
    }
    setFlash('no');
    triggerWrong();
    setMessage('다시 세어볼까?');
    window.setTimeout(() => setFlash(null), 450);
  };

  return (
    <div className={`count-fruit${flash ? ` count-fruit--${flash}` : ''}${shakeClass}`}>
      <SuccessBurst show={flash === 'ok'} />
      <ScoreHud score={score} />
      <p className="count-fruit__message">{message}</p>
      <div className="count-fruit__tray" aria-label={`${round.count}개의 과일`}>
        {Array.from({length: round.count}, (_, i) => (
          <span key={i} className="count-fruit__item" aria-hidden="true">
            {round.fruit}
          </span>
        ))}
      </div>
      <div className="count-fruit__options" role="group" aria-label="숫자 고르기">
        {round.options.map((n) => (
          <button
            key={n}
            type="button"
            className="count-fruit__btn"
            onClick={() => onPick(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
