'use client';

import {useCallback, useEffect, useRef, useState} from 'react';

const MAX_SECONDS = 1000;

/** 스테이지 진행 시간을 초 단위로 재는 타이머 (최대 1000초에서 멈춤) */
export function useStageTimer(maxSeconds = MAX_SECONDS) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  const readElapsed = useCallback(() => {
    const sec = Math.floor((Date.now() - startRef.current) / 1000);
    return Math.min(Math.max(sec, 0), maxSeconds);
  }, [maxSeconds]);

  /** 새 스테이지 시작 시점으로 타이머를 되돌림 */
  const reset = useCallback(() => {
    startRef.current = Date.now();
    setElapsed(0);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed(readElapsed());
    }, 1000);
    return () => window.clearInterval(id);
  }, [readElapsed]);

  /** 클리어 순간의 경과 시간을 기록용으로 즉시 계산해 반환 */
  const capture = useCallback(() => readElapsed(), [readElapsed]);

  return {elapsed, reset, capture};
}
