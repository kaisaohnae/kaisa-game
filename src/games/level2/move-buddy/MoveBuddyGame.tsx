'use client';

import {useCallback, useEffect, useState} from 'react';
import {KidsIcon} from '@/components/kids-icon';
import type {KidsIconId} from '@/assets/kids-icons';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import './move-buddy.css';

const COLS = 5;
const TREATS: KidsIconId[] = [
  'shape-star',
  'fruit-apple',
  'item-candy',
  'item-flower',
  'item-teddy',
];

type Spot = {col: number; icon: KidsIconId};

function makeSpot(salt: number, buddyCol: number): Spot {
  let t = salt + 1;
  const rand = () => {
    t = (t * 1664525 + 1013904223) >>> 0;
    return t / 0xffffffff;
  };
  let col = Math.floor(rand() * COLS);
  if (col === buddyCol) col = (col + 1 + Math.floor(rand() * (COLS - 1))) % COLS;
  return {
    col,
    icon: TREATS[Math.floor(rand() * TREATS.length)],
  };
}

export default function MoveBuddyGame() {
  const [buddy, setBuddy] = useState(2);
  const [spot, setSpot] = useState<Spot>(() => makeSpot(1, 2));
  const [score, setScore] = useState(0);
  const [celebrate, setCelebrate] = useState(false);

  const respawn = useCallback((fromCol: number) => {
    setSpot(makeSpot(Date.now() % 100000, fromCol));
  }, []);

  useEffect(() => {
    respawn(2);
  }, [respawn]);

  const move = (dir: -1 | 1) => {
    if (celebrate) return;
    const next = Math.max(0, Math.min(COLS - 1, buddy + dir));
    setBuddy(next);
    if (next === spot.col) {
      setCelebrate(true);
      setScore((n) => n + 1);
      window.setTimeout(() => {
        setCelebrate(false);
        respawn(next);
      }, 850);
    }
  };

  return (
    <div className="move-buddy">
      <SuccessBurst show={celebrate} />
      <ScoreHud score={score} />
      <p className="move-buddy__help">← → 눌러서 친구를 움직여요</p>

      <div className="move-buddy__field" aria-label="놀이판">
        <div className="move-buddy__row move-buddy__row--treats">
          {Array.from({length: COLS}, (_, i) => (
            <div key={`t-${i}`} className="move-buddy__cell">
              {spot.col === i ? (
                <span className="move-buddy__treat" aria-hidden="true">
                  <KidsIcon id={spot.icon} size="1em" />
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="move-buddy__row move-buddy__row--buddy">
          {Array.from({length: COLS}, (_, i) => (
            <div key={`b-${i}`} className="move-buddy__cell">
              {buddy === i ? (
                <span className="move-buddy__hero" aria-hidden="true">
                  <KidsIcon id="animal-bear" size="1em" />
                </span>
              ) : (
                <span className="move-buddy__pad" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="move-buddy__controls">
        <button
          type="button"
          className="move-buddy__btn"
          aria-label="왼쪽"
          onClick={() => move(-1)}
        >
          ←
        </button>
        <button
          type="button"
          className="move-buddy__btn"
          aria-label="오른쪽"
          onClick={() => move(1)}
        >
          →
        </button>
      </div>
    </div>
  );
}
