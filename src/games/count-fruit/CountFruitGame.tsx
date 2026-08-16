'use client';

import {useCallback, useEffect, useState} from 'react';
import './count-fruit.css';

const FRUITS = ['🍎', '🍌', '🍓', '🍊', '🍇', '🍉'];

function makeRound(salt: number) {
  let t = salt + 1;
  const rand = () => {
    t = (t * 1664525 + 1013904223) >>> 0;
    return t / 0xffffffff;
  };
  const count = 1 + Math.floor(rand() * 5); // 1~5
  const fruit = FRUITS[Math.floor(rand() * FRUITS.length)];
  const options = new Set<number>([count]);
  while (options.size < 3) {
    options.add(1 + Math.floor(rand() * 5));
  }
  return {
    count,
    fruit,
    options: [...options].sort(() => rand() - 0.5),
  };
}

export default function CountFruitGame() {
  const [ready, setReady] = useState(false);
  const [round, setRound] = useState(() => makeRound(1));
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('몇 개일까요?');
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null);

  useEffect(() => {
    setRound(makeRound(Date.now() % 100000));
    setReady(true);
  }, []);

  const next = useCallback(() => {
    setRound(makeRound(Date.now() % 100000));
    setMessage('몇 개일까요?');
  }, []);

  const onPick = (n: number) => {
    if (!ready) return;
    if (n === round.count) {
      setScore((s) => s + 1);
      setFlash('ok');
      setMessage('정답! 멋져요 🎉');
      window.setTimeout(() => {
        setFlash(null);
        next();
      }, 700);
      return;
    }
    setFlash('no');
    setMessage('다시 세어볼까?');
    window.setTimeout(() => setFlash(null), 450);
  };

  return (
    <div className={`count-fruit${flash ? ` count-fruit--${flash}` : ''}`}>
      <div className="count-fruit__score">★ {score}</div>
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
