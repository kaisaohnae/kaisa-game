'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import './hangul-study.css';

type Letter = {id: string; char: string; name: string};

const LETTERS: Letter[] = [
  {id: 'g', char: 'ㄱ', name: '기역'},
  {id: 'n', char: 'ㄴ', name: '니은'},
  {id: 'd', char: 'ㄷ', name: '디귿'},
  {id: 'r', char: 'ㄹ', name: '리을'},
  {id: 'm', char: 'ㅁ', name: '미음'},
  {id: 'b', char: 'ㅂ', name: '비읍'},
  {id: 's', char: 'ㅅ', name: '시옷'},
  {id: 'o', char: 'ㅇ', name: '이응'},
  {id: 'j', char: 'ㅈ', name: '지읒'},
  {id: 'a', char: 'ㅏ', name: '아'},
  {id: 'ya', char: 'ㅑ', name: '야'},
  {id: 'eo', char: 'ㅓ', name: '어'},
];

function pick(exclude?: string) {
  const pool = LETTERS.filter((l) => l.id !== exclude);
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

export default function HangulStudyGame() {
  const [target, setTarget] = useState<Letter>(LETTERS[0]);
  const [seed, setSeed] = useState(1);
  const [score, setScore] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [shake, setShake] = useState(false);

  const next = useCallback((exclude?: string) => {
    setTarget(pick(exclude));
    setSeed((n) => n + 1);
  }, []);

  useEffect(() => {
    next();
  }, [next]);

  const choices = useMemo(() => {
    const others = shuffle(
      LETTERS.filter((l) => l.id !== target.id),
      seed,
    ).slice(0, 3);
    return shuffle([target, ...others], seed + 5);
  }, [seed, target]);

  const onPick = (letter: Letter) => {
    if (celebrate) return;
    if (letter.id !== target.id) {
      setShake(true);
      window.setTimeout(() => setShake(false), 400);
      return;
    }
    setCelebrate(true);
    setScore((s) => s + 1);
    window.setTimeout(() => {
      setCelebrate(false);
      next(letter.id);
    }, 850);
  };

  return (
    <div className={`hangul-study${shake ? ' hangul-study--shake' : ''}`}>
      <SuccessBurst show={celebrate} />
      <ScoreHud score={score} />
      <p className="hangul-study__help">같은 글자를 찾아요</p>
      <div className="hangul-study__sample" aria-label={target.name}>
        {target.char}
      </div>
      <strong className="hangul-study__name">{target.name}</strong>
      <div className="hangul-study__grid" role="group">
        {choices.map((letter) => (
          <button
            key={letter.id}
            type="button"
            className="hangul-study__btn"
            aria-label={letter.name}
            onClick={() => onPick(letter)}
          >
            {letter.char}
          </button>
        ))}
      </div>
    </div>
  );
}
