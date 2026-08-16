'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import './sub-play.css';

type Q = {a: number; b: number; answer: number};

function makeQ(): Q {
  const a = 3 + Math.floor(Math.random() * 7);
  const b = 1 + Math.floor(Math.random() * Math.min(a, 5));
  return {a, b, answer: a - b};
}

function choicesFor(answer: number, salt: number) {
  const set = new Set<number>([answer]);
  let t = salt + 1;
  const rand = () => {
    t = (t * 1664525 + 1013904223) >>> 0;
    return t / 0xffffffff;
  };
  while (set.size < 4) {
    const n = Math.max(0, answer + Math.floor(rand() * 7) - 3);
    set.add(n);
  }
  const arr = [...set];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function SubPlayGame() {
  const [q, setQ] = useState<Q>(() => makeQ());
  const [seed, setSeed] = useState(1);
  const [score, setScore] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [shake, setShake] = useState(false);

  const next = useCallback(() => {
    setQ(makeQ());
    setSeed((n) => n + 1);
  }, []);

  useEffect(() => {
    next();
  }, [next]);

  const choices = useMemo(() => choicesFor(q.answer, seed), [q.answer, seed]);

  const onPick = (n: number) => {
    if (celebrate) return;
    if (n !== q.answer) {
      setShake(true);
      window.setTimeout(() => setShake(false), 400);
      return;
    }
    setCelebrate(true);
    setScore((s) => s + 1);
    window.setTimeout(() => {
      setCelebrate(false);
      next();
    }, 850);
  };

  return (
    <div className={`sub-play${shake ? ' sub-play--shake' : ''}`}>
      <SuccessBurst show={celebrate} />
      <ScoreHud score={score} />
      <p className="sub-play__help">빼기</p>
      <div className="sub-play__sum" aria-label={`${q.a} 빼기 ${q.b}`}>
        <span>{q.a}</span>
        <span className="sub-play__op">−</span>
        <span>{q.b}</span>
        <span className="sub-play__op">=</span>
        <span className="sub-play__q">?</span>
      </div>
      <div className="sub-play__grid" role="group">
        {choices.map((n) => (
          <button
            key={n}
            type="button"
            className="sub-play__btn"
            aria-label={`${n}`}
            onClick={() => onPick(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
