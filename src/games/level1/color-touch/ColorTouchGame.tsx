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
  {id: 'red', label: '빨강', value: '#ff6b6b', face: '❤️'},
  {id: 'orange', label: '주황', value: '#ff9f43', face: '🧡'},
  {id: 'yellow', label: '노랑', value: '#ffd93d', face: '💛'},
  {id: 'green', label: '초록', value: '#6bcb77', face: '💚'},
  {id: 'blue', label: '파랑', value: '#4d96ff', face: '💙'},
  {id: 'purple', label: '보라', value: '#c77dff', face: '💜'},
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
  const [message, setMessage] = useState('이 색깔을 콜! 눌러바');
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
    setMessage('이 색깔을 콜! 눌러바');
  }, []);

  const onPick = (color: ColorItem) => {
    if (!ready) return;

    if (color.id === target.id) {
      setScore((n) => n + 1);
      setFlash('ok');
      setMessage('🎉');
      window.setTimeout(() => {
        setFlash(null);
        nextRound(color.id);
      }, 900);
      return;
    }

    setFlash('no');
    setMessage('히히, 다시 해볼까?');
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

      <div className="color-touch__grid" role="group" aria-label="색깔 고르기">
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
