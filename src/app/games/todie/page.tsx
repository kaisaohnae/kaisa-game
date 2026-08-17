import type {Metadata, Viewport} from 'next';
import TodieGame from '@/games/todie/TodieGame';

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
  return <TodieGame />;
}
