'use client';

import './success-burst.css';

type Props = {
  show: boolean;
};

/** 글자를 잘 모르는 아이들을 위한 성공 임팩트 */
export default function SuccessBurst({show}: Props) {
  if (!show) return null;

  return (
    <div className="success-burst" aria-hidden="true">
      <span className="success-burst__boom">🎉</span>
      <span className="success-burst__star success-burst__star--1">✨</span>
      <span className="success-burst__star success-burst__star--2">⭐</span>
      <span className="success-burst__star success-burst__star--3">💫</span>
      <span className="success-burst__star success-burst__star--4">🌟</span>
      <span className="success-burst__star success-burst__star--5">✨</span>
      <span className="success-burst__heart">💖</span>
    </div>
  );
}
