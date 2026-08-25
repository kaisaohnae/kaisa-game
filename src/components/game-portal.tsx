import Link from 'next/link';
import {KidsIcon} from '@/components/kids-icon';
import {GAME_CARD_ICONS} from '@/assets/kids-icons';
import {getPortalGames} from '@/games';
import type {GameLevel} from '@/games';
import warriorCardIcon from '@/games/todie/jobs/warrior/actions/idle_down.png';

const CAR_RUN_CARD_ICON = '/car-run/vehicles/Police_animation/1.png';

function starsLabel(level: GameLevel) {
  return '★'.repeat(level);
}

function pngSrc(mod: string | {src: string}) {
  return typeof mod === 'string' ? mod : mod.src;
}

export default function GamePortal() {
  const games = getPortalGames();

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
                  ) : game.id === 'car-run' ? (
                    <img
                      className="game-portal__char-icon"
                      src={CAR_RUN_CARD_ICON}
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

      <footer className="game-portal__footer">
        <p className="game-portal__copy">
          © 2005 Kaisa ·{' '}
          <a
            href="https://kaisa.co.kr"
            className="game-portal__copy-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            kaisa.co.kr
          </a>
          . All Rights Reserved.
        </p>
        <a href="mailto:kaisa@kaisa.co.kr" className="game-portal__mail">
          kaisa@kaisa.co.kr
        </a>
      </footer>
    </main>
  );
}
