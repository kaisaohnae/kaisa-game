'use client';

import {useCallback, useEffect, useState} from 'react';
import {KidsIcon} from '@/components/kids-icon';
import type {KidsIconId} from '@/assets/kids-icons';
import SuccessBurst from '@/games/shared/SuccessBurst';
import ScoreHud from '@/games/shared/ScoreHud';
import {useWrongShake} from '@/games/shared/useWrongShake';
import './pattern-copy.css';

type Tone = {id: string; icon: KidsIconId; color: string};

const TONES: Tone[] = [
  {id: 'red', icon: 'color-red', color: '#ef5350'},
  {id: 'blue', icon: 'color-blue', color: '#42a5f5'},
  {id: 'yellow', icon: 'color-yellow', color: '#ffee58'},
  {id: 'green', icon: 'color-green', color: '#66bb6a'},
];

function makePattern(salt: number, length: number): Tone[] {
  let t = salt + 1;
  const rand = () => {
    t = (t * 1664525 + 1013904223) >>> 0;
    return t / 0xffffffff;
  };
  return Array.from({length}, () => TONES[Math.floor(rand() * TONES.length)]);
}

export default function PatternCopyGame() {
  const [pattern, setPattern] = useState<Tone[]>(() => makePattern(1, 3));
  const [phase, setPhase] = useState<'show' | 'play'>('show');
  const [highlight, setHighlight] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const {triggerWrong, shakeClass} = useWrongShake();

  const startRound = useCallback((salt: number, len: number) => {
    const next = makePattern(salt, len);
    setPattern(next);
    setPhase('show');
    setStep(0);
    setHighlight(null);
  }, []);

  useEffect(() => {
    startRound(Date.now() % 100000, 3);
  }, [startRound]);

  useEffect(() => {
    if (phase !== 'show') return;
    let i = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      if (i >= pattern.length) {
        setHighlight(null);
        setPhase('play');
        return;
      }
      setHighlight(pattern[i].id);
      window.setTimeout(() => {
        if (cancelled) return;
        setHighlight(null);
        i += 1;
        window.setTimeout(tick, 220);
      }, 520);
    };

    const delay = window.setTimeout(tick, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(delay);
    };
  }, [phase, pattern]);

  const onPick = (tone: Tone) => {
    if (phase !== 'play' || celebrate) return;
    if (tone.id !== pattern[step].id) {
      triggerWrong();
      window.setTimeout(() => {
        startRound(Date.now() % 100000, Math.min(3 + Math.floor(score / 2), 5));
      }, 500);
      return;
    }

    const next = step + 1;
    if (next >= pattern.length) {
      setCelebrate(true);
      setScore((n) => n + 1);
      window.setTimeout(() => {
        setCelebrate(false);
        startRound(Date.now() % 100000, Math.min(3 + Math.floor((score + 1) / 2), 5));
      }, 900);
      return;
    }
    setStep(next);
  };

  return (
    <div className={`pattern-copy${shakeClass}`}>
      <SuccessBurst show={celebrate} />
      <ScoreHud score={score} />
      <p className="pattern-copy__help">
        {phase === 'show' ? '반짝이는 순서를 봐!' : '같은 순서로 눌러봐!'}
      </p>

      <div className="pattern-copy__grid" role="group" aria-label="색깔 패드">
        {TONES.map((tone) => (
          <button
            key={tone.id}
            type="button"
            className={`pattern-copy__btn${highlight === tone.id ? ' pattern-copy__btn--lit' : ''}`}
            style={{background: tone.color}}
            aria-label={tone.id}
            disabled={phase !== 'play'}
            onClick={() => onPick(tone)}
          >
            <KidsIcon id={tone.icon} size="1em" />
          </button>
        ))}
      </div>
    </div>
  );
}
