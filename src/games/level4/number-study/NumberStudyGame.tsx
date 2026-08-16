'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import './number-study.css';

const NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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

export default function NumberStudyGame() {
  const [target, setTarget] = useState(1);
  const [seed, setSeed] = useState(1);
  const [score, setScore] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [shake, setShake] = useState(false);

  const next = useCallback((exclude?: number) => {
    const pool = NUMS.filter((n) => n !== exclude);
    setTarget(pool[Math.floor(Math.random() * pool.length)]);
    setSeed((n) => n + 1);
  }, []);

  useEffect(() => {
    next();
  }, [next]);

  const choices = useMemo(() => {
    const others = shuffle(
      NUMS.filter((n) => n !== target),
      seed,
    ).slice(0, 3);
    return shuffle([target, ...others], seed + 3);
  }, [seed, target]);

  const onPick = (n: number) => {
    if (celebrate) return;
    if (n !== target) {
      setShake(true);
      window.setTimeout(() => setShake(false), 400);
      return;
    }
    setCelebrate(true);
    setScore((s) => s + 1);
    window.setTimeout(() => {
      setCelebrate(false);
      next(n);
    }, 850);
  };

  return (
    <div className={`number-study${shake ? ' number-study--shake' : ''}`}>
      <SuccessBurst show={celebrate} />
      <ScoreHud score={score} />
      <p className="number-study__help">이 숫자를 찾아요</p>
      <div className="number-study__sample" aria-label={`숫자 ${target}`}>
        {target}
      </div>
      <div className="number-study__grid" role="group">
        {choices.map((n) => (
          <button
            key={n}
            type="button"
            className="number-study__btn"
            aria-label={`숫자 ${n}`}
            onClick={() => onPick(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
