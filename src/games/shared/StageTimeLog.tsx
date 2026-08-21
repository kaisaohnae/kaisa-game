'use client';

import './stage-time-log.css';

type Props = {
  times: number[];
};

/** 지금까지 깬 단계별 클리어 시간 기록 (1단계부터 순서대로) */
export default function StageTimeLog({times}: Props) {
  if (times.length === 0) return null;

  return (
    <div className="stage-time-log" aria-label="단계별 클리어 시간 기록">
      {times.map((sec, i) => (
        <span key={i} className="stage-time-log__chip">
          {i + 1}단계 {sec}초
        </span>
      ))}
    </div>
  );
}
