'use client';

import {useCallback, useEffect, useState} from 'react';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import {useWrongShake} from '@/games/shared/useWrongShake';
import './maze-pad.css';

type Cell = {r: number; c: number};

const ROWS = 4;
const COLS = 5;

/** 벽 = 1, 길 = 0 */
const MAZES: number[][][] = [
  [
    [0, 0, 1, 0, 0],
    [1, 0, 1, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 1, 1, 0, 0],
  ],
  [
    [0, 1, 0, 0, 0],
    [0, 1, 0, 1, 0],
    [0, 0, 0, 1, 0],
    [1, 1, 0, 0, 0],
  ],
  [
    [0, 0, 0, 1, 0],
    [1, 1, 0, 1, 0],
    [0, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
  ],
];

function startOf(maze: number[][]): Cell {
  return {r: 0, c: 0};
}

function goalOf(maze: number[][]): Cell {
  return {r: ROWS - 1, c: COLS - 1};
}

export default function MazePadGame() {
  const [mazeIndex, setMazeIndex] = useState(0);
  const [pos, setPos] = useState<Cell>({r: 0, c: 0});
  const [score, setScore] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const {triggerWrong, shakeClass} = useWrongShake();

  const maze = MAZES[mazeIndex % MAZES.length];
  const goal = goalOf(maze);

  const resetTo = useCallback((index: number) => {
    const next = MAZES[index % MAZES.length];
    setMazeIndex(index);
    setPos(startOf(next));
  }, []);

  useEffect(() => {
    resetTo(0);
  }, [resetTo]);

  const tryMove = (dr: number, dc: number) => {
    if (celebrate) return;
    const nr = pos.r + dr;
    const nc = pos.c + dc;
    if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS || maze[nr][nc] === 1) {
      triggerWrong();
      return;
    }

    const next = {r: nr, c: nc};
    setPos(next);

    if (next.r === goal.r && next.c === goal.c) {
      setCelebrate(true);
      setScore((n) => n + 1);
      window.setTimeout(() => {
        setCelebrate(false);
        resetTo(mazeIndex + 1);
      }, 900);
    }
  };

  return (
    <div className={`maze-pad${shakeClass}`}>
      <SuccessBurst show={celebrate} />
      <ScoreHud score={score} />
      <p className="maze-pad__help">길을 따라 별로 가요</p>

      <div className="maze-pad__board" role="grid" aria-label="미로">
        {maze.map((row, r) =>
          row.map((cell, c) => {
            const isWall = cell === 1;
            const isHero = pos.r === r && pos.c === c;
            const isGoal = goal.r === r && goal.c === c;
            return (
              <div
                key={`${r}-${c}`}
                className={`maze-pad__cell${isWall ? ' maze-pad__cell--wall' : ''}`}
                role="gridcell"
              >
                {isHero ? (
                  <span aria-hidden="true">🐻</span>
                ) : isGoal ? (
                  <span aria-hidden="true">⭐</span>
                ) : null}
              </div>
            );
          }),
        )}
      </div>

      <div className="maze-pad__controls" aria-label="방향키">
        <button
          type="button"
          className="maze-pad__btn"
          aria-label="위"
          onClick={() => tryMove(-1, 0)}
        >
          ↑
        </button>
        <button
          type="button"
          className="maze-pad__btn"
          aria-label="왼쪽"
          onClick={() => tryMove(0, -1)}
        >
          ←
        </button>
        <button
          type="button"
          className="maze-pad__btn"
          aria-label="오른쪽"
          onClick={() => tryMove(0, 1)}
        >
          →
        </button>
        <button
          type="button"
          className="maze-pad__btn"
          aria-label="아래"
          onClick={() => tryMove(1, 0)}
        >
          ↓
        </button>
      </div>
    </div>
  );
}
