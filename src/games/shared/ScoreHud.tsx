'use client';

import './score-hud.css';

type Props = {
  score: number;
};

/** 난이도 ★와 구분되는 점수 표시 (우측 상단) */
export default function ScoreHud({score}: Props) {
  return (
    <div className="score-hud" aria-label={`점수 ${score}`}>
      <span className="score-hud__label">점수</span>
      <strong className="score-hud__num">{score}</strong>
    </div>
  );
}
