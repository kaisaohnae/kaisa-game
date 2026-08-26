import type {Metadata} from 'next';
import type {GameModule} from '@/games/types';
import {absoluteUrl, SITE_DESCRIPTION, SITE_NAME} from '@/config/site';

type PageMetaInput = {
  title: string;
  description: string;
  path: string;
};

export function buildPageMetadata({title, description, path}: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  const isSiteRoot = title === SITE_NAME;

  return {
    title: isSiteRoot ? {absolute: SITE_NAME} : title,
    description,
    alternates: {canonical: url},
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: isSiteRoot ? SITE_NAME : `${title} · ${SITE_NAME}`,
      description,
      url,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary',
      title: isSiteRoot ? SITE_NAME : `${title} · ${SITE_NAME}`,
      description,
    },
    robots: {index: true, follow: true},
  };
}

export function homePageMetadata(): Metadata {
  return buildPageMetadata({title: SITE_NAME, description: SITE_DESCRIPTION, path: '/'});
}

export function gamePageMetadata(game: GameModule): Metadata {
  return buildPageMetadata({
    title: game.title,
    description: game.description,
    path: `/games/${game.id}/`,
  });
}

export function homeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: absoluteUrl('/'),
  };
}

export function gameJsonLd(game: GameModule) {
  const pageUrl = absoluteUrl(`/games/${game.id}/`);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: `${game.title} · ${SITE_NAME}`,
        description: game.description,
        url: pageUrl,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Any',
        offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'},
        isPartOf: {'@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/')},
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {'@type': 'ListItem', position: 1, name: SITE_NAME, item: absoluteUrl('/')},
          {'@type': 'ListItem', position: 2, name: game.title, item: pageUrl},
        ],
      },
    ],
  };
}
