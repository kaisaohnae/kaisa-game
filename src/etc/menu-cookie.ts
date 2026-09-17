export const MENU_COOKIE_KEY = 'kaisa-shared-menu';
export function getMenuCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some(part => part.trim() === MENU_COOKIE_KEY + '=open');
}
export function setMenuCookie(open: boolean) {
  if (typeof document === 'undefined') return;
  const host = window.location.hostname;
  const domain = host === 'kaisa.co.kr' || host.endsWith('.kaisa.co.kr') ? '; domain=kaisa.co.kr' : '';
  document.cookie = MENU_COOKIE_KEY + '=' + (open ? 'open' : 'closed') + '; max-age=2592000; path=/; samesite=lax' + domain;
}
