import type {MetadataRoute} from 'next';
import {absoluteUrl} from '@/config/site';
import {getGameIds} from '@/games';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const home: MetadataRoute.Sitemap[number] = {
    url: absoluteUrl('/'),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 1,
  };
  const games: MetadataRoute.Sitemap = getGameIds().map(id => ({
    url: absoluteUrl(`/games/${id}/`),
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));
  return [home, ...games];
}
