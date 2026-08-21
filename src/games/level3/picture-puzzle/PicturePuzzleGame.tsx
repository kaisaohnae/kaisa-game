'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {KidsIcon} from '@/components/kids-icon';
import {ANIMAL_ICON_IDS, type KidsIconId} from '@/assets/kids-icons';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import StageTimer from '@/games/shared/StageTimer';
import StageTimeLog from '@/games/shared/StageTimeLog';
import {useStageTimer} from '@/games/shared/useStageTimer';
import './picture-puzzle.css';

type GridSize = 3 | 4;

const SLIDE_MS = 420;

function indexToRC(index: number, size: number) {
  return {row: Math.floor(index / size), col: index % size};
}

function getNeighbors(index: number, size: number) {
  const {row, col} = indexToRC(index, size);
  const neighbors: number[] = [];
  if (row > 0) neighbors.push(index - size);
  if (row < size - 1) neighbors.push(index + size);
  if (col > 0) neighbors.push(index - 1);
  if (col < size - 1) neighbors.push(index + 1);
  return neighbors;
}

function createSolved(size: GridSize) {
  return Array.from({length: size * size}, (_, i) => i);
}

function isSolved(board: number[]) {
  return board.every((value, index) => value === index);
}

function shuffleBoard(size: GridSize, salt: number) {
  let board = createSolved(size);
  let emptyIndex = size * size - 1;
  let lastMoved = -1;
  let t = salt + 1;
  const rand = () => {
    t = (t * 1664525 + 1013904223) >>> 0;
    return t / 0xffffffff;
  };

  const moves = size * size * 24;
  for (let i = 0; i < moves; i += 1) {
    const neighbors = getNeighbors(emptyIndex, size).filter((n) => n !== lastMoved);
    const pick = neighbors[Math.floor(rand() * neighbors.length)]!;
    board = board.map((value, idx) => {
      if (idx === emptyIndex) return board[pick]!;
      if (idx === pick) return board[emptyIndex]!;
      return value;
    });
    lastMoved = emptyIndex;
    emptyIndex = pick;
  }

  if (isSolved(board)) {
    const neighbors = getNeighbors(emptyIndex, size);
    const pick = neighbors[0]!;
    board = board.map((value, idx) => {
      if (idx === emptyIndex) return board[pick]!;
      if (idx === pick) return board[emptyIndex]!;
      return value;
    });
  }

  return board;
}

function gridForStage(stage: number): GridSize {
  return stage >= 3 ? 4 : 3;
}

function iconForStage(stage: number): KidsIconId {
  return ANIMAL_ICON_IDS[stage % ANIMAL_ICON_IDS.length]!;
}

function blankPiece(size: GridSize) {
  return size * size - 1;
}

type PuzzlePieceProps = {
  piece: number;
  slotIndex: number;
  size: GridSize;
  icon: KidsIconId;
  onTap?: () => void;
};

function PuzzleSlice({piece, size, icon}: {piece: number; size: GridSize; icon: KidsIconId}) {
  const {row, col} = indexToRC(piece, size);

  return (
    <span
      className="picture-puzzle__slice"
      style={{
        width: `${size * 100}%`,
        height: `${size * 100}%`,
        left: `${-col * 100}%`,
        top: `${-row * 100}%`,
      }}
      aria-hidden="true"
    >
      <KidsIcon id={icon} size="100%" />
    </span>
  );
}

function slotStyle(slotIndex: number, size: GridSize) {
  const {row, col} = indexToRC(slotIndex, size);
  const unit = 100 / size;
  return {
    left: `${col * unit}%`,
    top: `${row * unit}%`,
    width: `${unit}%`,
    height: `${unit}%`,
  };
}

function PuzzlePiece({piece, slotIndex, size, icon, onTap}: PuzzlePieceProps) {
  return (
    <button
      type="button"
      className="picture-puzzle__piece"
      style={slotStyle(slotIndex, size)}
      aria-label={`퍼즐 조각 ${piece + 1}`}
      onClick={onTap}
    >
      <PuzzleSlice piece={piece} size={size} icon={icon} />
    </button>
  );
}

export default function PicturePuzzleGame() {
  const [ready, setReady] = useState(false);
  const [score, setScore] = useState(0);
  const [gridSize, setGridSize] = useState<GridSize>(3);
  const [icon, setIcon] = useState<KidsIconId>(ANIMAL_ICON_IDS[0]!);
  const [board, setBoard] = useState<number[]>(() => shuffleBoard(3, 1));
  const [moves, setMoves] = useState(0);
  const [message, setMessage] = useState('빈 칸 옆 조각을 눌러요');
  const [celebrate, setCelebrate] = useState(false);
  const [sliding, setSliding] = useState(false);
  const {elapsed, reset: resetTimer, capture: captureTimer} = useStageTimer();
  const [stageTimes, setStageTimes] = useState<number[]>([]);
  const slideTimerRef = useRef<number | null>(null);

  const blank = blankPiece(gridSize);
  const emptyIndex = useMemo(() => board.indexOf(blank), [board, blank]);

  const clearSlideTimer = () => {
    if (slideTimerRef.current !== null) {
      window.clearTimeout(slideTimerRef.current);
      slideTimerRef.current = null;
    }
  };

  const startBoard = (stage: number, salt = Date.now() % 100000) => {
    clearSlideTimer();
    setSliding(false);
    const size = gridForStage(stage);
    setGridSize(size);
    setIcon(iconForStage(stage));
    setBoard(shuffleBoard(size, salt));
    setMoves(0);
    setCelebrate(false);
    setMessage('빈 칸 옆 조각을 눌러요');
    resetTimer();
  };

  useEffect(() => {
    startBoard(0);
    setReady(true);
    return () => clearSlideTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const onTileTap = (index: number) => {
    if (!ready || celebrate || sliding) return;
    if (board[index] === blank) return;
    if (!getNeighbors(emptyIndex, gridSize).includes(index)) return;

    const next = board.map((value, idx) => {
      if (idx === emptyIndex) return board[index]!;
      if (idx === index) return board[emptyIndex]!;
      return value;
    });

    setSliding(true);
    setBoard(next);
    setMoves((m) => m + 1);

    clearSlideTimer();
    slideTimerRef.current = window.setTimeout(() => {
      setSliding(false);
      slideTimerRef.current = null;

      if (!isSolved(next)) return;

      const clearSec = captureTimer();
      setStageTimes((prev) => [...prev, clearSec]);
      setCelebrate(true);
      setMessage(`완성! ${clearSec}초`);

      window.setTimeout(() => {
        setScore((s) => {
          const ns = s + 1;
          startBoard(ns);
          return ns;
        });
      }, 1200);
    }, SLIDE_MS);
  };

  return (
    <div className={`picture-puzzle${celebrate ? ' picture-puzzle--done' : ''}`}>
      <SuccessBurst show={celebrate} />
      <ScoreHud score={score} />
      <StageTimer seconds={elapsed} />

      <div className="picture-puzzle__bar">
        <span>움직임 {moves}</span>
        <button type="button" className="picture-puzzle__reset" onClick={() => startBoard(score)}>
          다시
        </button>
      </div>

      <p className="picture-puzzle__message">{message}</p>
      <StageTimeLog times={stageTimes} />

      <div className="picture-puzzle__layout">
        <div
          className={`picture-puzzle__board picture-puzzle__board--${gridSize}`}
          role="group"
          aria-label="그림 퍼즐"
        >
          <div className="picture-puzzle__playfield">
            {board.map((piece, slotIndex) => {
              if (piece !== blank) return null;
              return (
                <div
                  key={`empty-${slotIndex}`}
                  className="picture-puzzle__empty"
                  style={slotStyle(slotIndex, gridSize)}
                  aria-hidden="true"
                />
              );
            })}

            {board.map((piece, slotIndex) => {
              if (piece === blank) return null;
              return (
                <PuzzlePiece
                  key={piece}
                  piece={piece}
                  slotIndex={slotIndex}
                  size={gridSize}
                  icon={icon}
                  onTap={() => onTileTap(slotIndex)}
                />
              );
            })}
          </div>
        </div>

        <aside className="picture-puzzle__preview" aria-label="완성 그림 미리보기">
          <span className="picture-puzzle__preview-label">완성 그림</span>
          <div className="picture-puzzle__preview-frame">
            <KidsIcon id={icon} size="100%" />
          </div>
        </aside>
      </div>
    </div>
  );
}
