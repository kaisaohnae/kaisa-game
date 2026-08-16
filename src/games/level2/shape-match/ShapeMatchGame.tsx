'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import ScoreHud from '@/games/shared/ScoreHud';
import './shape-match.css';

type Shape = {id: string; name: string; emoji: string};

const SHAPES: Shape[] = [
  {id: 'circle', name: '동그라미', emoji: '🔵'},
  {id: 'square', name: '네모', emoji: '🟦'},
  {id: 'triangle', name: '세모', emoji: '🔺'},
  {id: 'star', name: '별', emoji: '⭐'},
  {id: 'heart', name: '하트', emoji: '❤️'},
  {id: 'diamond', name: '마름모', emoji: '💎'},
];

function pick(excludeId?: string) {
  const pool = SHAPES.filter((s) => s.id !== excludeId);
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

export default function ShapeMatchGame() {
  const [ready, setReady] = useState(false);
  const [target, setTarget] = useState<Shape>(SHAPES[0]);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('같은 모양을 찾아요');
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null);
  const [seed, setSeed] = useState(1);

  useEffect(() => {
    setTarget(pick());
    setSeed(Date.now() % 100000);
    setReady(true);
  }, []);

  const choices = useMemo(
    () => shuffle(SHAPES, seed + target.id.length * 13),
    [seed, target.id],
  );

  const nextRound = useCallback((currentId: string) => {
    setTarget(pick(currentId));
    setSeed((n) => n + 1);
    setMessage('같은 모양을 찾아요');
  }, []);

  const onPick = (shape: Shape) => {
    if (!ready) return;
    if (shape.id === target.id) {
      setScore((n) => n + 1);
      setFlash('ok');
      setMessage('와아~ 정답! ✨');
      window.setTimeout(() => {
        setFlash(null);
        nextRound(shape.id);
      }, 700);
      return;
    }
    setFlash('no');
    setMessage('비슷한 걸 다시 찾아봐');
    window.setTimeout(() => setFlash(null), 450);
  };

  return (
    <div className={`shape-match${flash ? ` shape-match--${flash}` : ''}`}>
      <ScoreHud score={score} />
      <div className="shape-match__prompt">
        <p className="shape-match__message">{message}</p>
        <div className="shape-match__sample" aria-hidden="true">
          {target.emoji}
        </div>
        <strong className="shape-match__label">{target.name}</strong>
      </div>
      <div className="shape-match__grid" role="group" aria-label="모양 고르기">
        {choices.map((shape) => (
          <button
            key={shape.id}
            type="button"
            className="shape-match__btn"
            aria-label={shape.name}
            onClick={() => onPick(shape)}
          >
            <span aria-hidden="true">{shape.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
