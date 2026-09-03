'use client';

import Link from 'next/link';
import {KidsIcon} from '@/components/kids-icon';
import {GAME_CARD_ICONS} from '@/assets/kids-icons';
import {getPortalGames} from '@/games';
import type {GameLevel} from '@/games';
import {useT} from '@/i18n/locale-context';
import warriorCardIcon from '@/games/todie/jobs/warrior/actions/idle_down.png';

const CAR_RUN_CARD_ICON = '/car-run/vehicles/Police_animation/1.png';
const PLANE_SHOOT_CARD_ICON = '/plane-shoot/planes/jet-blue.png';

function starsLabel(level: GameLevel) {
  return '★'.repeat(level);
}

function pngSrc(mod: string | {src: string}) {
  return typeof mod === 'string' ? mod : mod.src;
}

export default function GamePortal() {
  const games = getPortalGames();
  const t = useT();

  return (
    <main className="game-portal">
      <section className="game-portal__stage" aria-label={t('Game list')}>
        <ul className="game-portal__grid">
          {games.map(game => (
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
                  ) : game.id === 'plane-shoot' ? (
                    <img
                      className="game-portal__char-icon"
                      src={PLANE_SHOOT_CARD_ICON}
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
                <strong>{t(game.title)}</strong>
                <span className="game-portal__desc">{t(game.description)}</span>
                <span className="game-portal__go">{t('Play →')}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
