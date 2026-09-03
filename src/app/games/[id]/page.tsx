import Link from 'next/link';
import {notFound} from 'next/navigation';
import JsonLd from '@/components/seo/json-ld';
import {getGame, getGameIds} from '@/games';
import {gameJsonLd, gamePageMetadata} from '@/lib/seo';
import '@/components/game-portal.css';
import './game-page.css';

type PageProps = {
  params: Promise<{id: string}>;
};

export function generateStaticParams() {
  return getGameIds().map(id => ({id}));
}

export async function generateMetadata({params}: PageProps) {
  const {id} = await params;
  const game = getGame(id);
  if (!game) return {};
  return gamePageMetadata(game);
}

export default async function GamePage({params}: PageProps) {
  const {id} = await params;
  const game = getGame(id);
  if (!game) notFound();

  const Game = game.Component;
  const isImmersive = id === 'car-run' || id === 'plane-shoot';

  return (
    <>
      <JsonLd data={gameJsonLd(game)} />
      <main
        className={`game-page${isImmersive ? ` game-page--${id}` : ''}`}
      >
        <header className="game-page__header">
          <Link href="/" className="game-page__back">
            🏠 홈으로
          </Link>
        </header>
        <section className="game-page__stage">
          <Game />
        </section>
      </main>
    </>
  );
}
