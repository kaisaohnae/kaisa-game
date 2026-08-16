'use client';

import {KidsIcon} from '@/components/kids-icon';
import './success-burst.css';

type Props = {
  show: boolean;
};

/** 글자를 잘 모르는 아이들을 위한 성공 임팩트 */
export default function SuccessBurst({show}: Props) {
  if (!show) return null;

  return (
    <div className="success-burst" aria-hidden="true">
      <span className="success-burst__boom">
        <KidsIcon id="item-party" size="1em" />
      </span>
      <span className="success-burst__star success-burst__star--1">
        <KidsIcon id="item-sparkle" size="1em" />
      </span>
      <span className="success-burst__star success-burst__star--2">
        <KidsIcon id="shape-star" size="1em" />
      </span>
      <span className="success-burst__star success-burst__star--3">
        <KidsIcon id="item-sparkle" size="1em" />
      </span>
      <span className="success-burst__star success-burst__star--4">
        <KidsIcon id="shape-star" size="1em" />
      </span>
      <span className="success-burst__star success-burst__star--5">
        <KidsIcon id="item-sparkle" size="1em" />
      </span>
      <span className="success-burst__heart">
        <KidsIcon id="shape-heart" size="1em" />
      </span>
    </div>
  );
}
