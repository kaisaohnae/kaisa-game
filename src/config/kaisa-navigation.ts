/**
 * kaisa-game header navigation — this site only (headers are no longer shared across kaisa sites).
 * The logo and the single menu item both point to this site's home.
 */
export type KaisaSite = 'game';

export const KAISA_NAV = [
  {id: 'game', label: 'Games', href: '/'}
] as const;
export const KAISA_HOME_URL = '/';
export function activeKaisaNav(site: KaisaSite, _pathname: string) {
  return site;
}

export const KAISA_NAV_LABELS = {
  en: {game: 'GAME'},
  ko: {game: '게임'},
  zh: {game: '游戏'},
  hi: {game: 'गेम'}
} as const;
