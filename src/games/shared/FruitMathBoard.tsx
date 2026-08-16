'use client';

import {KidsIcon} from '@/components/kids-icon';
import type {KidsIconId} from '@/assets/kids-icons';
import './fruit-math.css';

export type FruitMathMode = 'add' | 'sub';

type Props = {
  mode: FruitMathMode;
  a: number;
  b: number;
  fruit: KidsIconId;
  /** Remount animations each round */
  roundKey: number;
};

/**
 * Kids-friendly fruit action board:
 * - add: left fruits + new fruits bouncing in
 * - sub: start with all, then some fly away / get crossed out
 */
export default function FruitMathBoard({mode, a, b, fruit, roundKey}: Props) {
  if (mode === 'add') {
    return (
      <div className="fruit-math fruit-math--add" key={roundKey} aria-hidden="true">
        <div className="fruit-math__tray fruit-math__tray--left">
          {Array.from({length: a}, (_, i) => (
            <span
              key={`l-${i}`}
              className="fruit-math__fruit fruit-math__fruit--in"
              style={{animationDelay: `${i * 70}ms`}}
            >
              <KidsIcon id={fruit} size="1em" />
            </span>
          ))}
          <em className="fruit-math__count">{a}</em>
        </div>

        <span className="fruit-math__plus" aria-hidden="true">
          +
        </span>

        <div className="fruit-math__tray fruit-math__tray--right">
          {Array.from({length: b}, (_, i) => (
            <span
              key={`r-${i}`}
              className="fruit-math__fruit fruit-math__fruit--join"
              style={{animationDelay: `${280 + i * 90}ms`}}
            >
              <KidsIcon id={fruit} size="1em" />
            </span>
          ))}
          <em className="fruit-math__count fruit-math__count--join">{b}</em>
        </div>
      </div>
    );
  }

  const keep = a - b;
  return (
    <div className="fruit-math fruit-math--sub" key={roundKey} aria-hidden="true">
      <div className="fruit-math__tray fruit-math__tray--wide">
        {Array.from({length: a}, (_, i) => {
          const taken = i >= keep;
          return (
            <span
              key={`s-${i}`}
              className={
                taken
                  ? 'fruit-math__fruit fruit-math__fruit--gone'
                  : 'fruit-math__fruit fruit-math__fruit--stay'
              }
              style={{
                animationDelay: taken ? `${400 + (i - keep) * 110}ms` : `${i * 50}ms`,
              }}
            >
              <KidsIcon id={fruit} size="1em" />
            </span>
          );
        })}
      </div>
      <p className="fruit-math__hint">
        <span className="fruit-math__hint-gone">이렇게 빠져요 → 남은 걸 세요</span>
      </p>
    </div>
  );
}
