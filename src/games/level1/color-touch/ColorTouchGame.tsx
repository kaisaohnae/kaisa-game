'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import {choiceCount} from '@/games/shared/stage-scale';
import {useWrongShake} from '@/games/shared/useWrongShake';
import './color-touch.css';

type ColorItem = {
  id: string;
  label: string;
  value: string;
  face: string;
};

const COLORS: ColorItem[] = [
  {id: 'red', label: '\uBE68\uAC15', value: '#ff6b6b', face: '\u2764\uFE0F'},
  {id: 'orange', label: '\uC8FC\uD669', value: '#ff9f43', face: '\uD83E\uDDE1'},
  {id: 'yellow', label: '\uB178\uB791', value: '#ffd93d', face: '\uD83D\uDC9B'},
  {id: 'green', label: '\uCD08\uB85D', value: '#6bcb77', face: '\uD83D\uDC9A'},
  {id: 'blue', label: '\uD30C\uB791', value: '#4d96ff', face: '\uD83D\uDC99'},
  {id: 'purple', label: '\uBCF4\uB77C', value: '#c77dff', face: '\uD83D\uDC9C'},
  {id: 'pink', label: '\uBD84\uD64D', value: '#ff8fab', face: '\uD83D\uDC96'},
  {id: 'brown', label: '\uAC08\uC0C9', value: '#a1887f', face: '\uD83E\uDD0E'},
  {id: 'sky', label: '\uD558\uB298', value: '#81d4fa', face: '\uD83D\uDCA7'},
];

function pickTarget(excludeId?: string) {
  const pool = COLORS.filter((c) => c.id !== excludeId);
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

const PROMPT = '\uC774 \uC0C9\uAE54\uC744 \uCF5C! \uB20C\uB7EC\uBC14';
const RETRY = '\uD788\uD788, \uB2E4\uC2DC \uD574\uBCFC\uAE4C?';
const PICK = '\uC0C9\uAE54 \uACE0\uB974\uAE30';

export default function ColorTouchGame() {
  const [ready, setReady] = useState(false);
  const [target, setTarget] = useState<ColorItem>(COLORS[0]);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState(PROMPT);
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null);
  const [seed, setSeed] = useState(1);
  const {triggerWrong, shakeClass} = useWrongShake();

  useEffect(() => {
    setTarget(pickTarget());
    setSeed(Date.now() % 100000);
    setReady(true);
  }, []);

  const choices = useMemo(() => {
    const n = choiceCount(score, 6, 9);
    const others = shuffle(
      COLORS.filter((c) => c.id !== target.id),
      seed,
    ).slice(0, n - 1);
    return shuffle([target, ...others], seed + 17);
  }, [seed, target, score]);

  const nextRound = useCallback((currentId: string) => {
    setTarget(pickTarget(currentId));
    setSeed((n) => n + 1);
    setMessage(PROMPT);
  }, []);

  const onPick = (color: ColorItem) => {
    if (!ready || flash) return;

    if (color.id === target.id) {
      setScore((n) => n + 1);
      setFlash('ok');
      setMessage('\uD83C\uDF89');
      window.setTimeout(() => {
        setFlash(null);
        nextRound(color.id);
      }, 900);
      return;
    }

    setFlash('no');
    triggerWrong();
    setMessage(RETRY);
    window.setTimeout(() => setFlash(null), 450);
  };

  return (
    <div className={`color-touch${flash ? ` color-touch--${flash}` : ''}${shakeClass}`}>
      <SuccessBurst show={flash === 'ok'} />
      <ScoreHud score={score} />

      <div className="color-touch__prompt">
        <p className="color-touch__prompt-message color-touch__message">{message}</p>
        <div
          className="color-touch__sample"
          style={{background: target.value}}
          aria-label={target.label}
        >
          <span aria-hidden="true">{target.face}</span>
        </div>
        <strong className="color-touch__label">{target.label}</strong>
      </div>

      <div className="color-touch__grid" role="group" aria-label={PICK}>
        {choices.map((color) => (
          <button
            key={color.id}
            type="button"
            className="color-touch__btn"
            style={{background: color.value}}
            aria-label={color.label}
            onClick={() => onPick(color)}
          >
            <span aria-hidden="true">{color.face}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
