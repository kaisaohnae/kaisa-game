'use client';

import {useCallback, useEffect, useRef, useState, type PointerEvent} from 'react';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import './drag-fruit.css';

type Fruit = {id: string; emoji: string; x: number; y: number};

const EMOJIS = ['🍎', '🍌', '🍇', '🍊', '🍓', '🍑'];

function makeFruits(salt: number): Fruit[] {
  let t = salt + 1;
  const rand = () => {
    t = (t * 1664525 + 1013904223) >>> 0;
    return t / 0xffffffff;
  };
  const count = 3 + Math.floor(rand() * 2);
  return Array.from({length: count}, (_, i) => ({
    id: `f-${salt}-${i}`,
    emoji: EMOJIS[Math.floor(rand() * EMOJIS.length)],
    x: 8 + rand() * 70,
    y: 8 + rand() * 42,
  }));
}

export default function DragFruitGame() {
  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [score, setScore] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{x: number; y: number; emoji: string} | null>(
    null,
  );
  const stageRef = useRef<HTMLDivElement>(null);
  const basketRef = useRef<HTMLDivElement>(null);
  const dragIdRef = useRef<string | null>(null);

  const startRound = useCallback((salt: number) => {
    setFruits(makeFruits(salt));
  }, []);

  useEffect(() => {
    startRound(Date.now() % 100000);
  }, [startRound]);

  const finishIfEmpty = useCallback((next: Fruit[]) => {
    if (next.length > 0) return;
    setCelebrate(true);
    window.setTimeout(() => {
      setCelebrate(false);
      setScore((n) => n + 1);
      startRound(Date.now() % 100000);
    }, 900);
  }, [startRound]);

  const dropAt = useCallback(
    (clientX: number, clientY: number) => {
      const id = dragIdRef.current;
      dragIdRef.current = null;
      setDragging(null);
      setGhost(null);
      if (!id || !basketRef.current) return;

      const rect = basketRef.current.getBoundingClientRect();
      const inBasket =
        clientX >= rect.left - 12 &&
        clientX <= rect.right + 12 &&
        clientY >= rect.top - 12 &&
        clientY <= rect.bottom + 12;

      if (!inBasket) return;

      setFruits((prev) => {
        const next = prev.filter((f) => f.id !== id);
        finishIfEmpty(next);
        return next;
      });
    },
    [finishIfEmpty],
  );

  const onPointerDown = (fruit: Fruit, e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragIdRef.current = fruit.id;
    setDragging(fruit.id);
    setGhost({x: e.clientX, y: e.clientY, emoji: fruit.emoji});
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragIdRef.current) return;
    setGhost((g) => (g ? {...g, x: e.clientX, y: e.clientY} : g));
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    dropAt(e.clientX, e.clientY);
  };

  return (
    <div className="drag-fruit">
      <SuccessBurst show={celebrate} />
      <ScoreHud score={score} />
      <p className="drag-fruit__help">과일을 바구니로 끌어다 넣어요</p>

      <div
        ref={stageRef}
        className="drag-fruit__stage"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {fruits.map((fruit) => (
          <button
            key={fruit.id}
            type="button"
            className={`drag-fruit__item${dragging === fruit.id ? ' drag-fruit__item--gone' : ''}`}
            style={{left: `${fruit.x}%`, top: `${fruit.y}%`}}
            aria-label="과일 옮기기"
            onPointerDown={(e) => onPointerDown(fruit, e)}
          >
            <span aria-hidden="true">{fruit.emoji}</span>
          </button>
        ))}

        <div ref={basketRef} className="drag-fruit__basket" aria-label="바구니">
          <span aria-hidden="true">🧺</span>
        </div>
      </div>

      {ghost ? (
        <div
          className="drag-fruit__ghost"
          style={{left: ghost.x, top: ghost.y}}
          aria-hidden="true"
        >
          {ghost.emoji}
        </div>
      ) : null}
    </div>
  );
}
