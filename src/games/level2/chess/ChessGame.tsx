'use client';

import {useMemo, useState} from 'react';
import './chess.css';

const SIZE = 8;

type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type Side = 'white' | 'black';
type Piece = {side: Side; type: PieceType};
type Cell = Piece | null;
type Board = Cell[];
type Pos = {r: number; c: number};

type CastleRights = {
  whiteKing: boolean;
  whiteQueen: boolean;
  blackKing: boolean;
  blackQueen: boolean;
};

type Snapshot = {
  board: Board;
  turn: Side;
  castle: CastleRights;
  ep: Pos | null;
};

const UNICODE: Record<PieceType, {white: string; black: string}> = {
  king: {white: '♔', black: '♚'},
  queen: {white: '♕', black: '♛'},
  rook: {white: '♖', black: '♜'},
  bishop: {white: '♗', black: '♝'},
  knight: {white: '♘', black: '♞'},
  pawn: {white: '♙', black: '♟'},
};

function idx(r: number, c: number) {
  return r * SIZE + c;
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function cloneBoard(b: Board): Board {
  return b.map((cell) => (cell ? {...cell} : null));
}

function cloneCastle(c: CastleRights): CastleRights {
  return {...c};
}

function emptyBoard(): Board {
  return Array.from({length: SIZE * SIZE}, () => null);
}

function initialBoard(): Board {
  const b = emptyBoard();
  const back: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  for (let c = 0; c < SIZE; c += 1) {
    b[idx(0, c)] = {side: 'black', type: back[c]!};
    b[idx(1, c)] = {side: 'black', type: 'pawn'};
    b[idx(6, c)] = {side: 'white', type: 'pawn'};
    b[idx(7, c)] = {side: 'white', type: back[c]!};
  }
  return b;
}

function findKing(board: Board, side: Side): Pos | null {
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const p = board[idx(r, c)];
      if (p?.side === side && p.type === 'king') return {r, c};
    }
  }
  return null;
}

function isAttacked(board: Board, r: number, c: number, by: Side): boolean {
  // pawn attacks
  const pawnDir = by === 'white' ? -1 : 1;
  for (const dc of [-1, 1]) {
    const pr = r + pawnDir;
    const pc = c + dc;
    if (!inBounds(pr, pc)) continue;
    const p = board[idx(pr, pc)];
    if (p?.side === by && p.type === 'pawn') return true;
  }

  // knight
  for (const [dr, dc] of [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ] as const) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const p = board[idx(nr, nc)];
    if (p?.side === by && p.type === 'knight') return true;
  }

  // king
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const p = board[idx(nr, nc)];
      if (p?.side === by && p.type === 'king') return true;
    }
  }

  // sliding: rook/queen orthog, bishop/queen diag
  const rays: {dr: number; dc: number; types: PieceType[]}[] = [
    {dr: 1, dc: 0, types: ['rook', 'queen']},
    {dr: -1, dc: 0, types: ['rook', 'queen']},
    {dr: 0, dc: 1, types: ['rook', 'queen']},
    {dr: 0, dc: -1, types: ['rook', 'queen']},
    {dr: 1, dc: 1, types: ['bishop', 'queen']},
    {dr: 1, dc: -1, types: ['bishop', 'queen']},
    {dr: -1, dc: 1, types: ['bishop', 'queen']},
    {dr: -1, dc: -1, types: ['bishop', 'queen']},
  ];
  for (const ray of rays) {
    let nr = r + ray.dr;
    let nc = c + ray.dc;
    while (inBounds(nr, nc)) {
      const p = board[idx(nr, nc)];
      if (p) {
        if (p.side === by && ray.types.includes(p.type)) return true;
        break;
      }
      nr += ray.dr;
      nc += ray.dc;
    }
  }
  return false;
}

function inCheck(board: Board, side: Side) {
  const k = findKing(board, side);
  if (!k) return true;
  return isAttacked(board, k.r, k.c, side === 'white' ? 'black' : 'white');
}

type GenOpts = {ep: Pos | null; castle: CastleRights};

function genPseudo(board: Board, r: number, c: number, opts: GenOpts): Pos[] {
  const piece = board[idx(r, c)];
  if (!piece) return [];
  const {side, type} = piece;
  const moves: Pos[] = [];
  const tryAdd = (nr: number, nc: number) => {
    if (!inBounds(nr, nc)) return false;
    const t = board[idx(nr, nc)];
    if (t && t.side === side) return false;
    moves.push({r: nr, c: nc});
    return !t;
  };

  if (type === 'pawn') {
    const dir = side === 'white' ? -1 : 1;
    const start = side === 'white' ? 6 : 1;
    const fr = r + dir;
    if (inBounds(fr, c) && !board[idx(fr, c)]) {
      moves.push({r: fr, c});
      const fr2 = r + dir * 2;
      if (r === start && inBounds(fr2, c) && !board[idx(fr2, c)]) {
        moves.push({r: fr2, c});
      }
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const t = board[idx(nr, nc)];
      if (t && t.side !== side) moves.push({r: nr, c: nc});
      else if (opts.ep && opts.ep.r === nr && opts.ep.c === nc) moves.push({r: nr, c: nc});
    }
  } else if (type === 'knight') {
    for (const [dr, dc] of [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ] as const) {
      tryAdd(r + dr, c + dc);
    }
  } else if (type === 'king') {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (!dr && !dc) continue;
        tryAdd(r + dr, c + dc);
      }
    }
    // castling
    if (side === 'white' && r === 7 && c === 4) {
      if (
        opts.castle.whiteKing &&
        !board[idx(7, 5)] &&
        !board[idx(7, 6)] &&
        board[idx(7, 7)]?.type === 'rook' &&
        board[idx(7, 7)]?.side === 'white'
      ) {
        moves.push({r: 7, c: 6});
      }
      if (
        opts.castle.whiteQueen &&
        !board[idx(7, 1)] &&
        !board[idx(7, 2)] &&
        !board[idx(7, 3)] &&
        board[idx(7, 0)]?.type === 'rook' &&
        board[idx(7, 0)]?.side === 'white'
      ) {
        moves.push({r: 7, c: 2});
      }
    }
    if (side === 'black' && r === 0 && c === 4) {
      if (
        opts.castle.blackKing &&
        !board[idx(0, 5)] &&
        !board[idx(0, 6)] &&
        board[idx(0, 7)]?.type === 'rook' &&
        board[idx(0, 7)]?.side === 'black'
      ) {
        moves.push({r: 0, c: 6});
      }
      if (
        opts.castle.blackQueen &&
        !board[idx(0, 1)] &&
        !board[idx(0, 2)] &&
        !board[idx(0, 3)] &&
        board[idx(0, 0)]?.type === 'rook' &&
        board[idx(0, 0)]?.side === 'black'
      ) {
        moves.push({r: 0, c: 2});
      }
    }
  } else {
    const dirs: [number, number][] =
      type === 'rook'
        ? [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]
        : type === 'bishop'
          ? [
              [1, 1],
              [1, -1],
              [-1, 1],
              [-1, -1],
            ]
          : [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
              [1, 1],
              [1, -1],
              [-1, 1],
              [-1, -1],
            ];
    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const t = board[idx(nr, nc)];
        if (t) {
          if (t.side !== side) moves.push({r: nr, c: nc});
          break;
        }
        moves.push({r: nr, c: nc});
        nr += dr;
        nc += dc;
      }
    }
  }

  return moves;
}

function applyMove(
  board: Board,
  from: Pos,
  to: Pos,
  castle: CastleRights,
  ep: Pos | null,
): {board: Board; castle: CastleRights; ep: Pos | null} {
  const next = cloneBoard(board);
  const piece = next[idx(from.r, from.c)]!;
  const rights = cloneCastle(castle);
  let nextEp: Pos | null = null;

  // en passant capture
  if (piece.type === 'pawn' && ep && to.r === ep.r && to.c === ep.c && !next[idx(to.r, to.c)]) {
    const capR = piece.side === 'white' ? to.r + 1 : to.r - 1;
    next[idx(capR, to.c)] = null;
  }

  // castling rook move
  if (piece.type === 'king' && Math.abs(to.c - from.c) === 2) {
    const row = from.r;
    if (to.c === 6) {
      next[idx(row, 5)] = next[idx(row, 7)];
      next[idx(row, 7)] = null;
    } else if (to.c === 2) {
      next[idx(row, 3)] = next[idx(row, 0)];
      next[idx(row, 0)] = null;
    }
  }

  next[idx(to.r, to.c)] = piece;
  next[idx(from.r, from.c)] = null;

  // promotion
  if (piece.type === 'pawn' && (to.r === 0 || to.r === 7)) {
    next[idx(to.r, to.c)] = {side: piece.side, type: 'queen'};
  }

  // double pawn push → ep square
  if (piece.type === 'pawn' && Math.abs(to.r - from.r) === 2) {
    nextEp = {r: (from.r + to.r) / 2, c: from.c};
  }

  // update castling rights
  if (piece.type === 'king') {
    if (piece.side === 'white') {
      rights.whiteKing = false;
      rights.whiteQueen = false;
    } else {
      rights.blackKing = false;
      rights.blackQueen = false;
    }
  }
  if (piece.type === 'rook') {
    if (from.r === 7 && from.c === 0) rights.whiteQueen = false;
    if (from.r === 7 && from.c === 7) rights.whiteKing = false;
    if (from.r === 0 && from.c === 0) rights.blackQueen = false;
    if (from.r === 0 && from.c === 7) rights.blackKing = false;
  }
  if (to.r === 7 && to.c === 0) rights.whiteQueen = false;
  if (to.r === 7 && to.c === 7) rights.whiteKing = false;
  if (to.r === 0 && to.c === 0) rights.blackQueen = false;
  if (to.r === 0 && to.c === 7) rights.blackKing = false;

  return {board: next, castle: rights, ep: nextEp};
}

function isCastleLegal(board: Board, side: Side, toC: number): boolean {
  const row = side === 'white' ? 7 : 0;
  const enemy = side === 'white' ? 'black' : 'white';
  if (isAttacked(board, row, 4, enemy)) return false;
  if (toC === 6) {
    if (isAttacked(board, row, 5, enemy) || isAttacked(board, row, 6, enemy)) return false;
  } else if (toC === 2) {
    if (isAttacked(board, row, 3, enemy) || isAttacked(board, row, 2, enemy)) return false;
  }
  return true;
}

function legalMoves(board: Board, r: number, c: number, opts: GenOpts): Pos[] {
  const piece = board[idx(r, c)];
  if (!piece) return [];
  return genPseudo(board, r, c, opts).filter((to) => {
    if (piece.type === 'king' && Math.abs(to.c - c) === 2) {
      if (!isCastleLegal(board, piece.side, to.c)) return false;
    }
    const applied = applyMove(board, {r, c}, to, opts.castle, opts.ep);
    return !inCheck(applied.board, piece.side);
  });
}

function hasAnyLegal(board: Board, side: Side, opts: GenOpts) {
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[idx(r, c)]?.side !== side) continue;
      if (legalMoves(board, r, c, opts).length) return true;
    }
  }
  return false;
}

const FULL_CASTLE: CastleRights = {
  whiteKing: true,
  whiteQueen: true,
  blackKing: true,
  blackQueen: true,
};

export default function ChessGame() {
  const [board, setBoard] = useState<Board>(() => initialBoard());
  const [turn, setTurn] = useState<Side>('white');
  const [castle, setCastle] = useState<CastleRights>(() => ({...FULL_CASTLE}));
  const [ep, setEp] = useState<Pos | null>(null);
  const [selected, setSelected] = useState<Pos | null>(null);
  const [message, setMessage] = useState('백 차례');
  const [over, setOver] = useState(false);
  const [history, setHistory] = useState<Snapshot[]>([]);

  const opts = useMemo(() => ({ep, castle}), [ep, castle]);

  const highlights = useMemo(() => {
    if (!selected || over) return new Set<string>();
    return new Set(legalMoves(board, selected.r, selected.c, opts).map((p) => `${p.r},${p.c}`));
  }, [board, selected, over, opts]);

  const reset = () => {
    setBoard(initialBoard());
    setTurn('white');
    setCastle({...FULL_CASTLE});
    setEp(null);
    setSelected(null);
    setMessage('백 차례');
    setOver(false);
    setHistory([]);
  };

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setBoard(prev.board);
    setTurn(prev.turn);
    setCastle(prev.castle);
    setEp(prev.ep);
    setSelected(null);
    setOver(false);
    setMessage(prev.turn === 'white' ? '백 차례' : '흑 차례');
  };

  const onCell = (r: number, c: number) => {
    if (over) return;
    const cell = board[idx(r, c)];

    if (selected) {
      const can = highlights.has(`${r},${c}`);
      if (can) {
        const snap: Snapshot = {
          board,
          turn,
          castle: cloneCastle(castle),
          ep,
        };
        const applied = applyMove(board, selected, {r, c}, castle, ep);
        setHistory((h) => [...h, snap]);
        setBoard(applied.board);
        setCastle(applied.castle);
        setEp(applied.ep);
        setSelected(null);

        const nextTurn: Side = turn === 'white' ? 'black' : 'white';
        const nextOpts = {ep: applied.ep, castle: applied.castle};
        const checked = inCheck(applied.board, nextTurn);
        const any = hasAnyLegal(applied.board, nextTurn, nextOpts);

        if (!any) {
          setOver(true);
          if (checked) {
            setMessage(turn === 'white' ? '백 승! 체크메이트' : '흑 승! 체크메이트');
          } else {
            setMessage('무승부 · 스테일메이트');
          }
          return;
        }

        setTurn(nextTurn);
        setMessage(
          checked
            ? `${nextTurn === 'white' ? '백' : '흑'} 체크!`
            : `${nextTurn === 'white' ? '백' : '흑'} 차례`,
        );
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
    <div className="chess">
      <p className="chess__message">{message}</p>
      <div className="chess__meta">
        <span className={turn === 'white' ? 'is-white' : ''}>백</span>
        <span className={turn === 'black' ? 'is-black' : ''}>흑</span>
      </div>

      <div className="chess__board" role="grid" aria-label="체스판 8칸">
        {Array.from({length: SIZE * SIZE}, (_, i) => {
          const r = Math.floor(i / SIZE);
          const c = i % SIZE;
          const cell = board[i];
          const dark = (r + c) % 2 === 1;
          const selectedHere = selected?.r === r && selected?.c === c;
          const hi = highlights.has(`${r},${c}`);
          const capture = hi && !!cell;
          return (
            <button
              key={i}
              type="button"
              className={[
                'chess__cell',
                dark ? 'is-dark' : 'is-light',
                selectedHere ? 'is-selected' : '',
                hi ? (capture ? 'is-capture' : 'is-move') : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onCell(r, c)}
              aria-label={`${8 - r}행 ${c + 1}열`}
            >
              {cell ? (
                <span className={`chess__piece chess__piece--${cell.side}`}>
                  {UNICODE[cell.type][cell.side]}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="chess__actions">
        <button type="button" className="chess__btn" onClick={undo} disabled={!history.length}>
          무르기
        </button>
        <button type="button" className="chess__btn chess__btn--primary" onClick={reset}>
          새 대국
        </button>
      </div>
    </div>
  );
}
