'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import {numberSpan} from '@/games/shared/stage-scale';
import {useWrongShake} from '@/games/shared/useWrongShake';
import './add-play.css';

type Q = {a: number; b: number; answer: number};

function makeQ(stage: number): Q {
  const max = numberSpan(stage, 5);
  const a = 1 + Math.floor(Math.random() * max);
  const b = 1 + Math.floor(Math.random() * max);
  return {a, b, answer: a + b};
}

function choicesFor(answer: number, salt: number, stage: number) {
  const set = new Set<number>([answer]);
  let t = salt + 1;
  const rand = () => {
    t = (t * 1664525 + 1013904223) >>> 0;
    return t / 0xffffffff;
  };
  const need = Math.min(5, 3 + Math.floor(stage / 3));
  while (set.size < need) {
    const n = Math.max(1, answer + Math.floor(rand() * 9) - 4);
    set.add(n);
  }
  const arr = [...set];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function AddPlayGame() {
  const [score, setScore] = useState(0);
  const [q, setQ] = useState<Q>(() => makeQ(0));
  const [seed, setSeed] = useState(1);
  const [celebrate, setCelebrate] = useState(false);
  const {triggerWrong, shakeClass} = useWrongShake();

  const next = useCallback((stage: number) => {
    setQ(makeQ(stage));
    setSeed((n) => n + 1);
  }, []);

  useEffect(() => {
    next(0);
  }, [next]);

  const choices = useMemo(
    () => choicesFor(q.answer, seed, score),
    [q.answer, seed, score],
  );

  const onPick = (n: number) => {
    if (celebrate) return;
    if (n !== q.answer) {
      triggerWrong();
      return;
    }
    setCelebrate(true);
    setScore((s) => {
      const ns = s + 1;
      window.setTimeout(() => {
        setCelebrate(false);
        next(ns);
      }, 850);
      return ns;
    });
  };

  return (
    <div className={`add-play${shakeClass}`}>
      <SuccessBurst show={celebrate} />
      <ScoreHud score={score} />
      <p className="add-play__help">더하기</p>
      <div className="add-play__sum" aria-label={`${q.a} 더하기 ${q.b}`}>
        <span>{q.a}</span>
        <span className="add-play__op">+</span>
        <span>{q.b}</span>
        <span className="add-play__op">=</span>
        <span className="add-play__q">?</span>
      </div>
      <div className="add-play__grid" role="group">
        {choices.map((n) => (
          <button
            key={n}
            type="button"
            className="add-play__btn"
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
