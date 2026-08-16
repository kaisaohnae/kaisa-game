'use client';

import {useCallback, useEffect, useState} from 'react';
import SuccessBurst from '@/games/shared/SuccessBurst';
import './balloon-pop.css';

type Balloon = {
  id: number;
  emoji: string;
  left: number;
  delay: number;
  size: number;
  color: string;
};

const EMOJIS = ['🎈', '💛', '💙', '💚', '🧡', '💜'];
const COLORS = ['#ff8a80', '#ffd54f', '#81d4fa', '#a5d6a7', '#ffcc80', '#ce93d8'];

function makeBalloons(count: number, salt: number): Balloon[] {
  let t = salt + 1;
  const rand = () => {
    t = (t * 1664525 + 1013904223) >>> 0;
    return t / 0xffffffff;
  };
  return Array.from({length: count}, (_, i) => ({
    id: salt * 100 + i,
    emoji: EMOJIS[Math.floor(rand() * EMOJIS.length)],
    left: 8 + rand() * 76,
    delay: rand() * 1.2,
    size: 52 + rand() * 36,
    color: COLORS[Math.floor(rand() * COLORS.length)],
  }));
}

export default function BalloonPopGame() {
  const [ready, setReady] = useState(false);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [celebrate, setCelebrate] = useState(false);

  const spawn = useCallback((r: number) => {
    const count = Math.min(4 + Math.floor(r / 2), 8);
    setBalloons(makeBalloons(count, Date.now() % 100000 + r));
  }, []);

  useEffect(() => {
    spawn(1);
    setReady(true);
  }, [spawn]);

  const pop = (id: number) => {
    if (!ready) return;
    setBalloons((prev) => {
      const next = prev.filter((b) => b.id !== id);
      if (next.length === 0) {
        setCelebrate(true);
        window.setTimeout(() => {
          setCelebrate(false);
          setRound((n) => {
            const nr = n + 1;
            spawn(nr);
            return nr;
          });
        }, 900);
      }
      return next;
    });
    setScore((n) => n + 1);
  };

  return (
    <div className="balloon-pop">
      <SuccessBurst show={celebrate} />
      <div className="balloon-pop__bar">
        <span>★ {score}</span>
        <span>라운드 {round}</span>
      </div>
      <p className="balloon-pop__help">풍선을 톡! 톡! 터뜨려요</p>
      <div className="balloon-pop__sky" aria-label="풍선 놀이">
        {balloons.map((b) => (
          <button
            key={b.id}
            type="button"
            className="balloon-pop__balloon"
            style={{
              left: `${b.left}%`,
              animationDelay: `${b.delay}s`,
              width: b.size,
              height: b.size,
              background: b.color,
            }}
            aria-label="풍선 터뜨리기"
            onClick={() => pop(b.id)}
          >
            <span aria-hidden="true">{b.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
