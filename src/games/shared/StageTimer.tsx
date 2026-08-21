'use client';

import './stage-timer.css';

type Props = {
  seconds: number;
};

/** 좌측 상단 진행 시간 표시 (단계 표시 ScoreHud와 짝을 이룸) */
export default function StageTimer({seconds}: Props) {
  return (
    <div className="stage-timer" aria-label={`${seconds}초 진행 중`}>
      <span className="stage-timer__icon" aria-hidden="true">
        ⏱
      </span>
      <strong className="stage-timer__num">{seconds}</strong>
      <span className="stage-timer__label">초</span>
    </div>
  );
}
