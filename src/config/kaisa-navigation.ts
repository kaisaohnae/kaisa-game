export type KaisaSite = 'fo' | 'blog' | 'tool' | 'game';
function navUrl(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return fallback;
    if (process.env.NODE_ENV === 'production' && ['localhost', '127.0.0.1'].includes(url.hostname)) return fallback;
    return value;
  } catch { return fallback; }
}
export const KAISA_NAV = [
  {id: 'posts', label: 'Posts', href: navUrl(process.env.NEXT_PUBLIC_NAV_POSTS_URL, 'https://kaisa.co.kr/')},
  {id: 'blog', label: 'Blog', href: navUrl(process.env.NEXT_PUBLIC_NAV_BLOG_URL, 'https://blog.kaisa.co.kr/')},
  {id: 'tool', label: 'Tools', href: navUrl(process.env.NEXT_PUBLIC_NAV_TOOL_URL, 'https://tool.kaisa.co.kr/image/compress/')},
  {id: 'game', label: 'Games', href: navUrl(process.env.NEXT_PUBLIC_NAV_GAME_URL, 'https://game.kaisa.co.kr/')},
  {id: 'works', label: 'Works', href: navUrl(process.env.NEXT_PUBLIC_NAV_WORKS_URL, 'https://kaisa.co.kr/works')}
] as const;
export const KAISA_HOME_URL = navUrl(process.env.NEXT_PUBLIC_NAV_HOME_URL, 'https://kaisa.co.kr/');
export function activeKaisaNav(site: KaisaSite, pathname: string) {
  if (site === 'fo') return pathname.startsWith('/works') || pathname.startsWith('/illustration') ? 'works' : 'posts';
  return site;
}

export const KAISA_NAV_LABELS = {
  en: {posts: 'POST', blog: 'BLOG', tool: 'TOOL', game: 'GAME', works: 'WORK'},
  ko: {posts: '포스트', blog: '블로그', tool: '툴', game: '게임', works: '작업'},
  zh: {posts: '文章', blog: '博客', tool: '工具', game: '游戏', works: '作品'},
  hi: {posts: 'पोस्ट', blog: 'ब्लॉग', tool: 'टूल', game: 'गेम', works: 'कार्य'}
} as const;
