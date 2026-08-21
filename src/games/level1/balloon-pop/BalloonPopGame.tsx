'use client';

import {useCallback, useEffect, useRef, useState, type PointerEvent} from 'react';
import {KidsIcon} from '@/components/kids-icon';
import type {KidsIconId} from '@/assets/kids-icons';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import {useWrongShake} from '@/games/shared/useWrongShake';
import './balloon-pop.css';

type Balloon = {
  id: number;
  icon: KidsIconId;
  left: number;
  delay: number;
  size: number;
  color: string;
  duration: number;
};

const ICONS: KidsIconId[] = [
  'item-balloon',
  'color-red',
  'color-yellow',
  'color-blue',
  'color-green',
  'color-orange',
];
const COLORS = ['#ff8a80', '#ffd54f', '#81d4fa', '#a5d6a7', '#ffcc80', '#ce93d8'];

/** 1단계 기준 풍선이 위로 다 올라가는 데 걸리는 시간(초) */
const BASE_RISE_SECONDS = 6;
/** 단계가 오를수록 빨라지되, 이 배수보다 더 빨라지진 않음 */
const MIN_SPEED_FACTOR = 0.35;

function makeBalloons(count: number, salt: number, round: number): Balloon[] {
  let t = salt + 1;
  const rand = () => {
    t = (t * 1664525 + 1013904223) >>> 0;
    return t / 0xffffffff;
  };
  // 단계가 오를수록 평균적으로 더 빨리 올라가고(지속시간↓), 풍선마다 랜덤한 편차를 둠
  const roundFactor = Math.max(MIN_SPEED_FACTOR, 1 - (round - 1) * 0.08);
  return Array.from({length: count}, (_, i) => {
    const jitter = 0.7 + rand() * 0.6; // 0.7~1.3배 랜덤
    const duration = Number((BASE_RISE_SECONDS * roundFactor * jitter).toFixed(2));
    return {
      id: salt * 100 + i,
      icon: ICONS[Math.floor(rand() * ICONS.length)],
      left: 8 + rand() * 76,
      delay: rand() * 1.2,
      size: 72 + rand() * 48,
      color: COLORS[Math.floor(rand() * COLORS.length)],
      duration,
    };
  });
}

export default function BalloonPopGame() {
  const [ready, setReady] = useState(false);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [round, setRound] = useState(1);
  const [celebrate, setCelebrate] = useState(false);
  const [failing, setFailing] = useState(false);
  const [message, setMessage] = useState('풍선을 톡! 톡! 터뜨려요');
  const {triggerWrong, shakeClass} = useWrongShake();
  const poppingRef = useRef<Set<number>>(new Set());

  const spawn = useCallback((r: number) => {
    const count = Math.min(4 + Math.floor(r / 2), 8);
    setBalloons(makeBalloons(count, Date.now() % 100000 + r, r));
  }, []);

  useEffect(() => {
    spawn(1);
    setReady(true);
  }, [spawn]);

  const pop = (id: number) => {
    if (!ready || celebrate || failing) return;
    if (poppingRef.current.has(id)) return;
    poppingRef.current.add(id);
    setBalloons((prev) => {
      if (!prev.some((b) => b.id === id)) {
        poppingRef.current.delete(id);
        return prev;
      }
      const next = prev.filter((b) => b.id !== id);
      poppingRef.current.delete(id);
      if (next.length === 0) {
        setCelebrate(true);
        setMessage('모두 터뜨렸어요!');
        window.setTimeout(() => {
          setCelebrate(false);
          setMessage('풍선을 톡! 톡! 터뜨려요');
          setRound((n) => {
            const nr = n + 1;
            spawn(nr);
            return nr;
          });
        }, 900);
      }
      return next;
    });
  };

  const handleBalloonPress = (id: number, e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    pop(id);
  };

  /** 풍선이 터지지 않고 위로 다 올라가버리면 이번 단계 실패 */
  const escape = (id: number) => {
    if (!ready || celebrate || failing) return;
    setBalloons((prev) => {
      if (!prev.some((b) => b.id === id)) return prev;
      return [];
    });
    setFailing(true);
    triggerWrong();
    setMessage('앗! 풍선이 날아갔어요');
  };

  const retryRound = () => {
    setFailing(false);
    setMessage('풍선을 톡! 톡! 터뜨려요');
    spawn(round);
  };

  const restartFromBeginning = () => {
    setFailing(false);
    setRound(1);
    setMessage('풍선을 톡! 톡! 터뜨려요');
    spawn(1);
  };

  return (
    <div className={`balloon-pop${shakeClass}${failing ? ' balloon-pop--failing' : ''}`}>
      <SuccessBurst show={celebrate} />
      <ScoreHud score={round} />
      <p className="balloon-pop__help">{message}</p>
      <div className="balloon-pop__sky" aria-label="풍선 놀이">
        {balloons.map((b) => (
          <button
            key={b.id}
            type="button"
            className="balloon-pop__balloon"
            style={{
              left: `${b.left}%`,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
              ['--balloon-size' as string]: `${b.size}px`,
              background: b.color,
            }}
            aria-label="풍선 터뜨리기"
            onPointerDown={(e) => handleBalloonPress(b.id, e)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                pop(b.id);
              }
            }}
            onAnimationEnd={() => escape(b.id)}
          >
            <KidsIcon id={b.icon} size="85%" />
          </button>
        ))}

        {failing ? (
          <div className="balloon-pop__fail-panel" role="dialog" aria-labelledby="balloon-pop-fail-title">
            <p id="balloon-pop-fail-title" className="balloon-pop__fail-title">
              풍선을 놓쳤어요!
            </p>
            <div className="balloon-pop__fail-actions">
              <button type="button" className="balloon-pop__btn balloon-pop__btn--retry" onClick={retryRound}>
                다시 도전
              </button>
              <button
                type="button"
                className="balloon-pop__btn balloon-pop__btn--restart"
                onClick={restartFromBeginning}
              >
                처음부터
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
