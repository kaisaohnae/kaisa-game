import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getGame, getGameIds} from '@/games';
import '@/components/game-portal.css';
import './game-page.css';

type PageProps = {
  params: Promise<{id: string}>;
};

export function generateStaticParams() {
  return getGameIds().map((id) => ({id}));
}

export async function generateMetadata({params}: PageProps) {
  const {id} = await params;
  const game = getGame(id);
  return {
    title: game ? `${game.title} · Kaisa Kids` : 'Kaisa Kids',
  };
}

export default async function GamePage({params}: PageProps) {
  const {id} = await params;
  const game = getGame(id);
  if (!game) notFound();

  const Game = game.Component;

  const isCarRun = id === 'car-run';

  return (
    <main className={`game-page${isCarRun ? ' game-page--car-run' : ''}`}>
      <header className="game-page__header">
        <Link href="/" className="game-page__back">
          🏠 홈으로
        </Link>
      </header>
      <section className="game-page__stage">
        <Game />
      </section>
    </main>
  );
}
