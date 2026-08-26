import GamePortal from '@/components/game-portal';
import JsonLd from '@/components/seo/json-ld';
import {homeJsonLd, homePageMetadata} from '@/lib/seo';
import '@/components/game-portal.css';

export const metadata = homePageMetadata();

export default function Page() {
  return (
    <>
      <JsonLd data={homeJsonLd()} />
      <GamePortal />
    </>
  );
}
