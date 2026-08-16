'use client';

import {useCallback, useState} from 'react';
import './wrong-shake.css';

/** 오답 시 화면 흔들림 (+ 기기 진동) */
export function useWrongShake(durationMs = 450) {
  const [shake, setShake] = useState(false);

  const triggerWrong = useCallback(() => {
    setShake(true);
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(45);
    }
    window.setTimeout(() => setShake(false), durationMs);
  }, [durationMs]);

  return {
    shake,
    triggerWrong,
    shakeClass: shake ? ' kids-shake' : '',
  };
}
