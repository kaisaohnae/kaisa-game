'use client';

import './score-hud.css';

type Props = {
  score: number;
};

/** 우측 상단 단계 표시 (난이도 ★와 구분) */
export default function ScoreHud({score}: Props) {
  return (
    <div className="score-hud" aria-label={`${score} 단계`}>
      <strong className="score-hud__num">{score}</strong>
      <span className="score-hud__label">단계</span>
    </div>
  );
}
