import type {Metadata} from 'next';
import TodieGame from '@/games/todie/TodieGame';

export const metadata: Metadata = {
  title: 'todie',
  description: 'WASD action prototype',
};

/** Independent game under src/games/todie — not listed on Kaisa Kids portal */
export default function TodiePage() {
  return <TodieGame />;
}
