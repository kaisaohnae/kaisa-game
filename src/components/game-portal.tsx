'use client';

import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import {WheelGesturesPlugin} from 'embla-carousel-wheel-gestures';
import {getGamesByLevel, getLevelsDesc} from '@/games';
import type {GameLevel, GameModule} from '@/games';

const CARD_EMOJI: Record<string, string> = {
  'animal-tap': '🐶',
  'color-touch': '🎨',
  'balloon-pop': '🎈',
  'drag-fruit': '🧺',
  'tap-order': '👆',
  'move-buddy': '🐻',
  'shape-match': '⭐',
  'count-fruit': '🍎',
  'memory-cards': '🃏',
  'maze-pad': '🗺️',
  'pattern-copy': '✨',
  'shadow-match': '🌑',
  'number-study': '🔢',
  'hangul-study': 'ㄱ',
  'add-play': '➕',
  'sub-play': '➖',
  'pet-care': '🐣',
  'hero-quest': '🗡️',
  'magic-garden': '🌱',
};

function starsLabel(level: GameLevel) {
  return '★'.repeat(level);
}

function LevelRail({level, games}: {level: GameLevel; games: GameModule[]}) {
  const [emblaRef] = useEmblaCarousel(
    {
      align: 'start',
      dragFree: true,
      containScroll: 'trimSnaps',
      skipSnaps: false,
    },
    [WheelGesturesPlugin()],
  );

  if (games.length === 0) return null;

  return (
    <section className="game-portal__rail" aria-label={`난이도 ${starsLabel(level)}`}>
      <div className="game-portal__rail-head">
        <span className="game-portal__stars" aria-hidden="true">
          {starsLabel(level)}
        </span>
      </div>

      <div className="game-portal__viewport" ref={emblaRef}>
        <ul className="game-portal__track">
          {games.map((game) => (
            <li key={game.id} className="game-portal__slide">
              <Link href={`/games/${game.id}/`} className="game-portal__card">
                <span className="game-portal__emoji" aria-hidden="true">
                  {CARD_EMOJI[game.id] ?? '🎈'}
                </span>
                <span className="game-portal__level" aria-hidden="true">
                  {starsLabel(game.level)}
                </span>
                <strong>{game.title}</strong>
                <span className="game-portal__desc">{game.description}</span>
                <span className="game-portal__go">놀러가기 →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function GamePortal() {
  const levels = getLevelsDesc();

  return (
    <main className="game-portal">
      <div className="game-portal__deco game-portal__deco--star" aria-hidden="true">
        ★
      </div>
      <div className="game-portal__deco game-portal__deco--heart" aria-hidden="true">
        ♥
      </div>
      <div className="game-portal__deco game-portal__deco--cloud" aria-hidden="true">
        ☁
      </div>

      <header className="game-portal__header">
        <h1 className="game-portal__title">
          <span aria-hidden="true">🐻</span> Kaisa Kids
        </h1>
        <p className="game-portal__lead">톡톡 눌러보는 우리 놀이터</p>
      </header>

      <div className="game-portal__stage">
        {levels.map((level) => (
          <LevelRail key={level} level={level} games={getGamesByLevel(level)} />
        ))}
      </div>
    </main>
  );
}
