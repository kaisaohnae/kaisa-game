'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {FRUIT_ICON_IDS, type KidsIconId} from '@/assets/kids-icons';
import FruitMathBoard from '@/games/shared/FruitMathBoard';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import {numberSpan} from '@/games/shared/stage-scale';
import {useWrongShake} from '@/games/shared/useWrongShake';
import './sub-play.css';

type Q = {a: number; b: number; answer: number; fruit: KidsIconId};

function pickFruit(): KidsIconId {
  return FRUIT_ICON_IDS[Math.floor(Math.random() * FRUIT_ICON_IDS.length)];
}

/** Keep totals countable on screen */
function makeQ(stage: number): Q {
  const max = Math.min(6, numberSpan(stage, 4));
  const a = 2 + Math.floor(Math.random() * max);
  const b = 1 + Math.floor(Math.random() * Math.min(a - 1, Math.max(1, Math.floor(a / 2) + 1)));
  return {a, b, answer: a - b, fruit: pickFruit()};
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
    const n = Math.max(0, answer + Math.floor(rand() * 9) - 4);
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
    <div className={`sub-play${shakeClass}`}>
      <SuccessBurst show={celebrate} />
      <ScoreHud score={score} />
      <p className="sub-play__help">과일이 빠져요!</p>

      <FruitMathBoard mode="sub" a={q.a} b={q.b} fruit={q.fruit} roundKey={seed} />

      <div className="sub-play__sum" aria-label={`${q.a} 빼기 ${q.b}`}>
        <span>{q.a}</span>
        <span className="sub-play__op">−</span>
        <span>{q.b}</span>
        <span className="sub-play__op">=</span>
        <span className="sub-play__q">?</span>
      </div>

      <div className="sub-play__grid" role="group" aria-label="정답 고르기">
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
