import type {Metadata, Viewport} from 'next';
import GameBackButton from '@/components/game-back-button';
import TodieGame from '@/games/todie/TodieGame';
import '@/app/games/[id]/game-page.css';

export const metadata: Metadata = {
  title: 'todie',
  description: 'WASD action prototype',
};

/** Tablet / phone: lock zoom for game play */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

/** Independent game under src/games/todie — not listed on Kaisa Kids portal */
export default function TodiePage() {
  return (
    <main className="game-page">
      <GameBackButton />
      <section className="game-page__stage"><TodieGame /></section>
    </main>
  );
}
