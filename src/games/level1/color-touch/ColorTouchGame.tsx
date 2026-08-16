'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import './color-touch.css';

type ColorItem = {
  id: string;
  label: string;
  value: string;
  face: string;
};

const COLORS: ColorItem[] = [
  {id: 'red', label: 'ë¹¨ê°•', value: '#ff6b6b', face: '?Ž'},
  {id: 'orange', label: 'ì£¼í™©', value: '#ff9f43', face: '?Š'},
  {id: 'yellow', label: '?¸ëž‘', value: '#ffd93d', face: '?ŒŸ'},
  {id: 'green', label: 'ì´ˆë¡', value: '#6bcb77', face: '?¸'},
  {id: 'blue', label: '?Œëž‘', value: '#4d96ff', face: '?’™'},
  {id: 'purple', label: 'ë³´ë¼', value: '#c77dff', face: '?‡'},
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

export default function ColorTouchGame() {
  const [ready, setReady] = useState(false);
  const [target, setTarget] = useState<ColorItem>(COLORS[0]);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('???‰ê¹”??ì½? ?ŒëŸ¬ë´?);
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null);
  const [seed, setSeed] = useState(1);

  useEffect(() => {
    setTarget(pickTarget());
    setSeed(Date.now() % 100000);
    setReady(true);
  }, []);

  const choices = useMemo(
    () => shuffle(COLORS, seed + target.id.length * 17),
    [seed, target.id],
  );

  const nextRound = useCallback((currentId: string) => {
    setTarget(pickTarget(currentId));
    setSeed((n) => n + 1);
    setMessage('???‰ê¹”??ì½? ?ŒëŸ¬ë´?);
  }, []);

  const onPick = (color: ColorItem) => {
    if (!ready) return;

    if (color.id === target.id) {
      setScore((n) => n + 1);
      setFlash('ok');
      setMessage('?Ž‰');
      window.setTimeout(() => {
        setFlash(null);
        nextRound(color.id);
      }, 900);
      return;
    }

    setFlash('no');
    setMessage('?ˆížˆ, ?¤ì‹œ ?´ë³¼ê¹?');
    window.setTimeout(() => setFlash(null), 450);
  };

  return (
    <div className={`color-touch${flash ? ` color-touch--${flash}` : ''}`}>
      <SuccessBurst show={flash === 'ok'} />
      <ScoreHud score={score} />

      <div className="color-touch__prompt">
        <p className="color-touch__message">{message}</p>
        <div
          className="color-touch__sample"
          style={{background: target.value}}
          aria-label={target.label}
        >
          <span aria-hidden="true">{target.face}</span>
        </div>
        <strong className="color-touch__label">{target.label}</strong>
      </div>

      <div className="color-touch__grid" role="group" aria-label="?‰ê¹” ê³ ë¥´ê¸?>
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
