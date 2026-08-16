import Link from 'next/link';
import {GAMES} from '@/games';

const CARD_EMOJI: Record<string, string> = {
  'animal-tap': '🐶',
  'color-touch': '🎨',
  'balloon-pop': '🎈',
  'shape-match': '⭐',
  'count-fruit': '🍎',
  'memory-cards': '🃏',
};

export default function GamePortal() {
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
        <p className="game-portal__eyebrow">3살 ~ 6살 친구들</p>
        <h1 className="game-portal__title">
          <span aria-hidden="true">🐻</span> Kaisa Kids
        </h1>
        <p className="game-portal__lead">
          폰이든 태블릿이든! 톡톡 눌러보는 우리 놀이터
        </p>
      </header>

      <section className="game-portal__stage" aria-label="놀이 목록">
        <ul className="game-portal__list">
          {GAMES.map((game) => (
            <li key={game.id}>
              <Link href={`/games/${game.id}/`} className="game-portal__card">
                <span className="game-portal__emoji" aria-hidden="true">
                  {CARD_EMOJI[game.id] ?? '🎈'}
                </span>
                <span className="game-portal__age">{game.age}</span>
                <strong>{game.title}</strong>
                <span className="game-portal__desc">{game.description}</span>
                <span className="game-portal__go">놀러가기 →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
