'use client';

import {useMemo, useState} from 'react';
import './janggi.css';

/** files 0–8, ranks 0–9 (한=위, 초=아래) */
const COLS = 9;
const ROWS = 10;

type Side = 'cho' | 'han';
type PieceType = 'king' | 'guard' | 'elephant' | 'horse' | 'chariot' | 'cannon' | 'soldier';
type Piece = {side: Side; type: PieceType};
type Cell = Piece | null;
type Board = Cell[];
type Pos = {r: number; c: number};

const LABELS: Record<PieceType, {cho: string; han: string}> = {
  king: {cho: '楚', han: '漢'},
  guard: {cho: '士', han: '士'},
  elephant: {cho: '象', han: '象'},
  horse: {cho: '馬', han: '馬'},
  chariot: {cho: '車', han: '車'},
  cannon: {cho: '包', han: '包'},
  soldier: {cho: '卒', han: '兵'},
};

function idx(r: number, c: number) {
  return r * COLS + c;
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function inPalace(r: number, c: number, side: Side) {
  if (c < 3 || c > 5) return false;
  return side === 'cho' ? r >= 7 && r <= 9 : r >= 0 && r <= 2;
}

function cloneBoard(b: Board): Board {
  return b.map((cell) => (cell ? {...cell} : null));
}

function emptyBoard(): Board {
  return Array.from({length: COLS * ROWS}, () => null);
}

function initialBoard(): Board {
  const b = emptyBoard();
  const put = (r: number, c: number, side: Side, type: PieceType) => {
    b[idx(r, c)] = {side, type};
  };

  // 한 (위)
  put(0, 0, 'han', 'chariot');
  put(0, 1, 'han', 'elephant');
  put(0, 2, 'han', 'horse');
  put(0, 3, 'han', 'guard');
  put(0, 4, 'han', 'king');
  put(0, 5, 'han', 'guard');
  put(0, 6, 'han', 'elephant');
  put(0, 7, 'han', 'horse');
  put(0, 8, 'han', 'chariot');
  put(2, 1, 'han', 'cannon');
  put(2, 7, 'han', 'cannon');
  for (const c of [0, 2, 4, 6, 8]) put(3, c, 'han', 'soldier');

  // 초 (아래)
  put(9, 0, 'cho', 'chariot');
  put(9, 1, 'cho', 'elephant');
  put(9, 2, 'cho', 'horse');
  put(9, 3, 'cho', 'guard');
  put(9, 4, 'cho', 'king');
  put(9, 5, 'cho', 'guard');
  put(9, 6, 'cho', 'elephant');
  put(9, 7, 'cho', 'horse');
  put(9, 8, 'cho', 'chariot');
  put(7, 1, 'cho', 'cannon');
  put(7, 7, 'cho', 'cannon');
  for (const c of [0, 2, 4, 6, 8]) put(6, c, 'cho', 'soldier');

  return b;
}

function findKing(board: Board, side: Side): Pos | null {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const p = board[idx(r, c)];
      if (p?.side === side && p.type === 'king') return {r, c};
    }
  }
  return null;
}

/** 궁끼리 같은 세로줄에 장애물 없이 마주보면 불법(면조) */
function facingKings(board: Board) {
  const a = findKing(board, 'cho');
  const b = findKing(board, 'han');
  if (!a || !b || a.c !== b.c) return false;
  const c = a.c;
  const lo = Math.min(a.r, b.r);
  const hi = Math.max(a.r, b.r);
  for (let r = lo + 1; r < hi; r += 1) {
    if (board[idx(r, c)]) return false;
  }
  return true;
}

function palaceDiagOk(r0: number, c0: number, r1: number, c1: number, side: Side) {
  if (!inPalace(r0, c0, side) || !inPalace(r1, c1, side)) return false;
  const dr = Math.abs(r1 - r0);
  const dc = Math.abs(c1 - c0);
  return dr === 1 && dc === 1;
}

function genMoves(board: Board, r: number, c: number): Pos[] {
  const piece = board[idx(r, c)];
  if (!piece) return [];
  const {side, type} = piece;
  const moves: Pos[] = [];
  const tryAdd = (nr: number, nc: number) => {
    if (!inBounds(nr, nc)) return;
    const t = board[idx(nr, nc)];
    if (t && t.side === side) return;
    moves.push({r: nr, c: nc});
  };

  if (type === 'king' || type === 'guard') {
    const steps = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    for (const [dr, dc] of steps) {
      const nr = r + dr!;
      const nc = c + dc!;
      if (!inPalace(nr, nc, side)) continue;
      if (Math.abs(dr!) + Math.abs(dc!) === 2) {
        // diagonal only on palace X lines — allow all palace diagonals of 1 for kids simplicity
        if (!palaceDiagOk(r, c, nr, nc, side)) continue;
      }
      tryAdd(nr, nc);
    }
  } else if (type === 'soldier') {
    const forward = side === 'cho' ? -1 : 1;
    tryAdd(r + forward, c);
    tryAdd(r, c - 1);
    tryAdd(r, c + 1);
  } else if (type === 'chariot') {
    for (const [dr, dc] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const t = board[idx(nr, nc)];
        if (!t) {
          moves.push({r: nr, c: nc});
        } else {
          if (t.side !== side) moves.push({r: nr, c: nc});
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
    // palace diagonals for chariot if on diagonal line — skip for simplicity
  } else if (type === 'cannon') {
    for (const [dr, dc] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      let nr = r + dr;
      let nc = c + dc;
      let jumped: Piece | null = null;
      while (inBounds(nr, nc)) {
        const t = board[idx(nr, nc)];
        if (!jumped) {
          if (t) {
            if (t.type === 'cannon') break;
            jumped = t;
          }
        } else {
          if (!t) {
            moves.push({r: nr, c: nc});
          } else {
            if (t.side !== side && t.type !== 'cannon') moves.push({r: nr, c: nc});
            break;
          }
        }
        nr += dr;
        nc += dc;
      }
    }
  } else if (type === 'horse') {
    const hops: [number, number, number, number][] = [
      [-1, 0, -1, -1],
      [-1, 0, -1, 1],
      [1, 0, 1, -1],
      [1, 0, 1, 1],
      [0, -1, -1, -1],
      [0, -1, 1, -1],
      [0, 1, -1, 1],
      [0, 1, 1, 1],
    ];
    for (const [br, bc, dr, dc] of hops) {
      const blockR = r + br;
      const blockC = c + bc;
      if (!inBounds(blockR, blockC) || board[idx(blockR, blockC)]) continue;
      tryAdd(r + br + dr, c + bc + dc);
    }
  } else if (type === 'elephant') {
    const elephantMoves: {dr: number; dc: number; blocks: [number, number][]}[] = [
      {dr: -3, dc: -2, blocks: [[-1, 0], [-2, -1]]},
      {dr: -3, dc: 2, blocks: [[-1, 0], [-2, 1]]},
      {dr: 3, dc: -2, blocks: [[1, 0], [2, -1]]},
      {dr: 3, dc: 2, blocks: [[1, 0], [2, 1]]},
      {dr: -2, dc: -3, blocks: [[0, -1], [-1, -2]]},
      {dr: -2, dc: 3, blocks: [[0, 1], [-1, 2]]},
      {dr: 2, dc: -3, blocks: [[0, -1], [1, -2]]},
      {dr: 2, dc: 3, blocks: [[0, 1], [1, 2]]},
    ];
    for (const m of elephantMoves) {
      let blocked = false;
      for (const [br, bc] of m.blocks) {
        const nr = r + br;
        const nc = c + bc;
        if (!inBounds(nr, nc) || board[idx(nr, nc)]) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      tryAdd(r + m.dr, c + m.dc);
    }
  }

  return moves;
}

function legalMoves(board: Board, r: number, c: number): Pos[] {
  const piece = board[idx(r, c)];
  if (!piece) return [];
  return genMoves(board, r, c).filter((m) => {
    const next = cloneBoard(board);
    next[idx(m.r, m.c)] = piece;
    next[idx(r, c)] = null;
    if (!findKing(next, piece.side)) return false;
    if (facingKings(next)) return false;
    return true;
  });
}

export default function JanggiGame() {
  const [board, setBoard] = useState<Board>(() => initialBoard());
  const [turn, setTurn] = useState<Side>('cho');
  const [selected, setSelected] = useState<Pos | null>(null);
  const [message, setMessage] = useState('초(楚) 차례');
  const [over, setOver] = useState(false);
  const [history, setHistory] = useState<{board: Board; turn: Side}[]>([]);

  const highlights = useMemo(() => {
    if (!selected || over) return new Set<string>();
    return new Set(legalMoves(board, selected.r, selected.c).map((p) => `${p.r},${p.c}`));
  }, [board, selected, over]);

  const reset = () => {
    setBoard(initialBoard());
    setTurn('cho');
    setSelected(null);
    setMessage('초(楚) 차례');
    setOver(false);
    setHistory([]);
  };

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setBoard(prev.board);
    setTurn(prev.turn);
    setSelected(null);
    setOver(false);
    setMessage(prev.turn === 'cho' ? '초(楚) 차례' : '한(漢) 차례');
  };

  const onCell = (r: number, c: number) => {
    if (over) return;
    const cell = board[idx(r, c)];

    if (selected) {
      const can = highlights.has(`${r},${c}`);
      if (can) {
        const piece = board[idx(selected.r, selected.c)]!;
        const next = cloneBoard(board);
        const target = next[idx(r, c)];
        next[idx(r, c)] = piece;
        next[idx(selected.r, selected.c)] = null;
        setHistory((h) => [...h, {board, turn}]);
        setBoard(next);
        setSelected(null);

        if (target?.type === 'king') {
          setOver(true);
          setMessage(turn === 'cho' ? '초 승! 한을 잡았어요' : '한 승! 초를 잡았어요');
          return;
        }

        const nextTurn: Side = turn === 'cho' ? 'han' : 'cho';
        setTurn(nextTurn);
        setMessage(nextTurn === 'cho' ? '초(楚) 차례' : '한(漢) 차례');
        return;
      }
      if (cell?.side === turn) {
        setSelected({r, c});
        return;
      }
      setSelected(null);
      return;
    }

    if (cell?.side === turn) setSelected({r, c});
  };

  return (
    <div className="janggi">
      <p className="janggi__message">{message}</p>
      <div className="janggi__meta">
        <span className={turn === 'cho' ? 'is-cho' : ''}>초 · 녹</span>
        <span className={turn === 'han' ? 'is-han' : ''}>한 · 적</span>
      </div>

      <div className="janggi__board" role="grid" aria-label="장기판">
        {Array.from({length: ROWS * COLS}, (_, i) => {
          const r = Math.floor(i / COLS);
          const c = i % COLS;
          const cell = board[i];
          const selectedHere = selected?.r === r && selected?.c === c;
          const hi = highlights.has(`${r},${c}`);
          const palace =
            c >= 3 && c <= 5 && ((r >= 0 && r <= 2) || (r >= 7 && r <= 9));
          return (
            <button
              key={i}
              type="button"
              className={[
                'janggi__cell',
                palace ? 'is-palace' : '',
                selectedHere ? 'is-selected' : '',
                hi ? 'is-move' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onCell(r, c)}
              aria-label={`${r + 1}행 ${c + 1}열`}
            >
              {cell ? (
                <span
                  className={`janggi__piece janggi__piece--${cell.side}${cell.type === 'king' ? ' is-king' : ''}`}
                >
                  {LABELS[cell.type][cell.side]}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="janggi__actions">
        <button type="button" className="janggi__btn" onClick={undo} disabled={!history.length}>
          무르기
        </button>
        <button type="button" className="janggi__btn janggi__btn--primary" onClick={reset}>
          새 대국
        </button>
      </div>
    </div>
  );
}
