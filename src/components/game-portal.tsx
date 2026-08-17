import Link from 'next/link';
import {KidsIcon} from '@/components/kids-icon';
import {GAME_CARD_ICONS} from '@/assets/kids-icons';
import {GAMES} from '@/games';
import type {GameLevel} from '@/games';
import warriorCardIcon from '@/games/todie/jobs/warrior/actions/idle_down.png';

function starsLabel(level: GameLevel) {
  return '★'.repeat(level);
}

function pngSrc(mod: string | {src: string}) {
  return typeof mod === 'string' ? mod : mod.src;
}

export default function GamePortal() {
  const games = [...GAMES].sort((a, b) => {
    if (a.id === 'todie') return -1;
    if (b.id === 'todie') return 1;
    return b.level - a.level;
  });

  return (
    <main className="game-portal">
      <header className="game-portal__header">
        <h1 className="game-portal__title">
          <KidsIcon id="animal-bear" size="1.25em" className="game-portal__brand-icon" /> Kaisa Kids
        </h1>
        <p className="game-portal__lead">톡톡 눌러보는 우리 놀이터</p>
      </header>

      <section className="game-portal__stage" aria-label="놀이 목록">
        <ul className="game-portal__grid">
          {games.map((game) => (
            <li key={game.id} className="game-portal__item">
              <Link href={`/games/${game.id}/`} className="game-portal__card">
                <span className="game-portal__emoji" aria-hidden="true">
                  {game.id === 'todie' ? (
                    <img
                      className="game-portal__char-icon"
                      src={pngSrc(warriorCardIcon)}
                      alt=""
                      draggable={false}
                    />
                  ) : (
                    <KidsIcon id={GAME_CARD_ICONS[game.id] ?? 'item-balloon'} size="1em" />
                  )}
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
      </section>
    </main>
  );
}
