'use client';

import Link from 'next/link';
import {KidsIcon} from '@/components/kids-icon';
import {GAME_CARD_ICONS} from '@/assets/kids-icons';
import {getPortalGames} from '@/games';
import {useT} from '@/i18n/locale-context';

const CAR_RUN_CARD_ICON = '/car-run/vehicles/Police_animation/1.png';
const PLANE_SHOOT_CARD_ICON = '/plane-shoot/planes/jet-blue.png';
const TODIE_CARD_ICON = '/common/characters/warrior/idle/south.png';
const HIHI_CARD_ICON = '/common/characters/mage/idle/south.png';

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
                  {game.id === 'hihi' ? (
                    <img
                      className="game-portal__char-icon"
                      src={HIHI_CARD_ICON}
                      alt=""
                      draggable={false}
                    />
                  ) : game.id === 'todie' ? (
                    <img
                      className="game-portal__char-icon"
                      src={TODIE_CARD_ICON}
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
                <span className="game-portal__level" aria-label={`${t('Difficulty')}: ${game.level}/5`}>
                  {Array.from({length: game.level}, (_, index) => (
                    <svg key={index} width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="m12 2.5 2.94 5.96 6.58.96-4.76 4.64 1.13 6.55L12 17.52l-5.89 3.09 1.13-6.55-4.76-4.64 6.58-.96L12 2.5Z" />
                    </svg>
                  ))}
                </span>
                <strong>{t(game.title)}</strong>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
