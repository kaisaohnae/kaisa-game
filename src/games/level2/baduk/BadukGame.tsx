'use client';

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import './baduk.css';

/** 표준 바둑판 19줄 */
const SIZE = 19;
/** 화점 (0-based): 4·10·16선 */
const HOSHI = [3, 9, 15] as const;
/** 중국식 덤에 가까운 실전 덤 */
const KOMI = 6.5;

type Stone = 0 | 1 | 2; // empty | black | white
type Point = {r: number; c: number};

function key(r: number, c: number) {
  return r * SIZE + c;
}

function neighbors(r: number, c: number): Point[] {
  const out: Point[] = [];
  if (r > 0) out.push({r: r - 1, c});
  if (r < SIZE - 1) out.push({r: r + 1, c});
  if (c > 0) out.push({r, c: c - 1});
  if (c < SIZE - 1) out.push({r, c: c + 1});
  return out;
}

function cloneBoard(board: Stone[]): Stone[] {
  return board.slice();
}

function emptyBoard(): Stone[] {
  return Array.from({length: SIZE * SIZE}, () => 0);
}

function groupAt(board: Stone[], r: number, c: number) {
  const color = board[key(r, c)]!;
  const stones: Point[] = [];
  const liberties = new Set<number>();
  if (!color) return {stones, liberties, color};

  const seen = new Set<number>();
  const stack: Point[] = [{r, c}];
  while (stack.length) {
    const p = stack.pop()!;
    const k = key(p.r, p.c);
    if (seen.has(k)) continue;
    seen.add(k);
    stones.push(p);
    for (const n of neighbors(p.r, p.c)) {
      const nk = key(n.r, n.c);
      const v = board[nk]!;
      if (v === 0) liberties.add(nk);
      else if (v === color && !seen.has(nk)) stack.push(n);
    }
  }
  return {stones, liberties, color};
}

function removeGroup(board: Stone[], stones: Point[]) {
  for (const s of stones) board[key(s.r, s.c)] = 0;
}

function boardHash(board: Stone[]) {
  return board.join('');
}

function tryPlace(
  board: Stone[],
  r: number,
  c: number,
  color: 1 | 2,
  koHash: string | null,
): {next: Stone[]; captured: number; ko: string | null} | null {
  const k = key(r, c);
  if (board[k] !== 0) return null;

  const next = cloneBoard(board);
  next[k] = color;
  const enemy = (color === 1 ? 2 : 1) as 1 | 2;
  let captured = 0;
  const capturedStones: Point[] = [];

  for (const n of neighbors(r, c)) {
    if (next[key(n.r, n.c)] !== enemy) continue;
    const g = groupAt(next, n.r, n.c);
    if (g.liberties.size === 0) {
      captured += g.stones.length;
      capturedStones.push(...g.stones);
      removeGroup(next, g.stones);
    }
  }

  const mine = groupAt(next, r, c);
  if (mine.liberties.size === 0 && captured === 0) return null;

  const hash = boardHash(next);
  if (koHash && hash === koHash) return null;

  let newKo: string | null = null;
  if (captured === 1 && capturedStones.length === 1) {
    newKo = boardHash(board);
  }

  return {next, captured, ko: newKo};
}

function scoreTerritory(board: Stone[]) {
  const seen = new Set<number>();
  let black = 0;
  let white = 0;
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const k = key(r, c);
      if (board[k] !== 0 || seen.has(k)) continue;
      const region: Point[] = [];
      const stack: Point[] = [{r, c}];
      let touchB = false;
      let touchW = false;
      while (stack.length) {
        const p = stack.pop()!;
        const pk = key(p.r, p.c);
        if (seen.has(pk)) continue;
        seen.add(pk);
        if (board[pk] === 0) {
          region.push(p);
          for (const n of neighbors(p.r, p.c)) {
            const nv = board[key(n.r, n.c)]!;
            if (nv === 0) stack.push(n);
            else if (nv === 1) touchB = true;
            else touchW = true;
          }
        }
      }
      if (touchB && !touchW) black += region.length;
      else if (touchW && !touchB) white += region.length;
    }
  }
  for (const v of board) {
    if (v === 1) black += 1;
    if (v === 2) white += 1;
  }
  return {black, white};
}

/** 보드 로컬 좌표 → 가장 가까운 교차점 (잘못 눌러도 스냅) */
function nearestPoint(localX: number, localY: number, boardPx: number): Point | null {
  if (boardPx <= 0) return null;
  // CSS --pad 와 동일: 바깥 여백 비율
  const padRatio = 0.028;
  const pad = boardPx * padRatio;
  const span = boardPx - pad * 2;
  if (span <= 0) return null;

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const c = clamp(Math.round(((localX - pad) / span) * (SIZE - 1)), 0, SIZE - 1);
  const r = clamp(Math.round(((localY - pad) / span) * (SIZE - 1)), 0, SIZE - 1);
  return {r, c};
}

function pointStyle(r: number, c: number): CSSProperties {
  const pct = (i: number) => `calc(var(--baduk-pad) + ${i} * var(--baduk-step))`;
  return {left: pct(c), top: pct(r)};
}

export default function BadukGame() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [board, setBoard] = useState<Stone[]>(() => emptyBoard());
  const [turn, setTurn] = useState<1 | 2>(1);
  const [captures, setCaptures] = useState({black: 0, white: 0});
  const [koHash, setKoHash] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<Point | null>(null);
  const [passStreak, setPassStreak] = useState(0);
  const [message, setMessage] = useState('흑이 먼저 두어요');
  const [over, setOver] = useState(false);
  const [history, setHistory] = useState<
    {board: Stone[]; turn: 1 | 2; captures: {black: number; white: number}; ko: string | null}[]
  >([]);

  const starPoints = useMemo(() => {
    const set = new Set<number>();
    for (const r of HOSHI) for (const c of HOSHI) set.add(key(r, c));
    return set;
  }, []);

  const reset = () => {
    setBoard(emptyBoard());
    setTurn(1);
    setCaptures({black: 0, white: 0});
    setKoHash(null);
    setLastMove(null);
    setPassStreak(0);
    setMessage('흑이 먼저 두어요');
    setOver(false);
    setHistory([]);
  };

  const finish = useCallback((b: Stone[], cap: {black: number; white: number}) => {
    const t = scoreTerritory(b);
    const blackScore = t.black;
    const whiteScore = t.white + KOMI;
    const winner =
      blackScore > whiteScore ? '흑 승!' : whiteScore > blackScore ? '백 승!' : '무승부!';
    setMessage(
      `${winner}  흑 ${blackScore.toFixed(1)} · 백 ${whiteScore.toFixed(1)} (덤 ${KOMI})`,
    );
    setOver(true);
  }, []);

  const playAt = useCallback(
    (r: number, c: number) => {
      if (over) return;
      const result = tryPlace(board, r, c, turn, koHash);
      if (!result) {
        setMessage('둘 수 없는 곳이에요');
        return;
      }
      setHistory((h) => [...h, {board, turn, captures, ko: koHash}]);
      setBoard(result.next);
      setKoHash(result.ko);
      setLastMove({r, c});
      setPassStreak(0);
      const nextCap = {...captures};
      if (turn === 1) nextCap.black += result.captured;
      else nextCap.white += result.captured;
      setCaptures(nextCap);
      const nextTurn = turn === 1 ? 2 : 1;
      setTurn(nextTurn);
      setMessage(
        result.captured > 0
          ? `${turn === 1 ? '흑' : '백'}이 ${result.captured}개 따냈어요 · ${nextTurn === 1 ? '흑' : '백'} 차례`
          : `${nextTurn === 1 ? '흑' : '백'} 차례`,
      );
    },
    [board, captures, koHash, over, turn],
  );

  const onBoardPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (over) return;
    if (e.button !== undefined && e.button !== 0) return;
    const el = boardRef.current;
    if (!el) return;
    // clientWidth/Height·offset* = 테두리 제외 → CSS % 위치와 일치
    const size = el.clientWidth;
    const localX = e.nativeEvent.offsetX;
    const localY = e.nativeEvent.offsetY;
    const p = nearestPoint(localX, localY, size);
    if (!p) return;
    playAt(p.r, p.c);
  };

  const pass = () => {
    if (over) return;
    setHistory((h) => [...h, {board, turn, captures, ko: koHash}]);
    const streak = passStreak + 1;
    setPassStreak(streak);
    setKoHash(null);
    if (streak >= 2) {
      finish(board, captures);
      return;
    }
    const nextTurn = turn === 1 ? 2 : 1;
    setTurn(nextTurn);
    setMessage(`${turn === 1 ? '흑' : '백'} 패스 · ${nextTurn === 1 ? '흑' : '백'} 차례`);
  };

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setBoard(prev.board);
    setTurn(prev.turn);
    setCaptures(prev.captures);
    setKoHash(prev.ko);
    setLastMove(null);
    setPassStreak(0);
    setOver(false);
    setMessage(`${prev.turn === 1 ? '흑' : '백'} 차례`);
  };

  const lines = useMemo(() => Array.from({length: SIZE}, (_, i) => i), []);

  return (
    <div className="baduk">
      <p className="baduk__message">{message}</p>
      <div className="baduk__meta">
        <span className={`baduk__turn${turn === 1 ? ' is-black' : ' is-white'}`}>
          {over ? '종료' : turn === 1 ? '● 흑' : '○ 백'}
        </span>
        <span>흑 따냄 {captures.black}</span>
        <span>백 따냄 {captures.white}</span>
      </div>

      <div
        ref={boardRef}
        className="baduk__board"
        role="application"
        aria-label="바둑판 19줄"
        onPointerDown={onBoardPointer}
      >
        <div className="baduk__grid" aria-hidden>
          {lines.map((i) => (
            <span
              key={`h${i}`}
              className="baduk__line baduk__line--h"
              style={{top: `calc(var(--baduk-pad) + ${i} * var(--baduk-step))`}}
            />
          ))}
          {lines.map((i) => (
            <span
              key={`v${i}`}
              className="baduk__line baduk__line--v"
              style={{left: `calc(var(--baduk-pad) + ${i} * var(--baduk-step))`}}
            />
          ))}
          {Array.from(starPoints).map((k) => {
            const r = Math.floor(k / SIZE);
            const c = k % SIZE;
            return (
              <span key={`s${k}`} className="baduk__hoshi" style={pointStyle(r, c)} />
            );
          })}
        </div>

        <div className="baduk__stones" aria-hidden>
          {board.map((stone, i) => {
            if (!stone) return null;
            const r = Math.floor(i / SIZE);
            const c = i % SIZE;
            const isLast = lastMove?.r === r && lastMove?.c === c;
            return (
              <span
                key={i}
                className={`baduk__stone baduk__stone--${stone === 1 ? 'black' : 'white'}${isLast ? ' is-last' : ''}`}
                style={pointStyle(r, c)}
              />
            );
          })}
        </div>
      </div>

      <div className="baduk__actions">
        <button type="button" className="baduk__btn" onClick={pass} disabled={over}>
          패스
        </button>
        <button type="button" className="baduk__btn" onClick={undo} disabled={!history.length}>
          무르기
        </button>
        <button type="button" className="baduk__btn baduk__btn--primary" onClick={reset}>
          새 대국
        </button>
      </div>
    </div>
  );
}
