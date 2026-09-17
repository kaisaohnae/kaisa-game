export type Theme = 'light' | 'dark';

export const THEME_COOKIE_KEY = 'kaisa-shared-theme';
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const LEGACY_KEYS = ['kaisa-theme', 'kaisa-tool-theme'];
const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';

function readCookie(key: string): Theme | null {
  if (typeof document === 'undefined') return null;
  const entry = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith(key + '='));
  if (!entry) return null;
  const value = entry.slice(key.length + 1);
  return isTheme(value) ? value : null;
}

export function getThemeCookie(): Theme | null {
  return readCookie(THEME_COOKIE_KEY);
}

export function setThemeCookie(theme: Theme) {
  if (typeof document === 'undefined') return;
  const host = window.location.hostname;
  const domain = host === 'kaisa.co.kr' || host.endsWith('.kaisa.co.kr') ? '; domain=kaisa.co.kr' : '';
  document.cookie = THEME_COOKIE_KEY + '=' + theme + '; max-age=' + THEME_COOKIE_MAX_AGE + '; path=/; samesite=lax' + domain;
}

export function getStoredTheme(): Theme | null {
  const shared = getThemeCookie();
  if (shared) return shared;
  for (const key of LEGACY_KEYS) {
    let value: unknown = readCookie(key);
    if (!value) {
      try { value = localStorage.getItem(key); } catch {}
    }
    if (isTheme(value)) {
      setThemeCookie(value);
      return value;
    }
  }
  return null;
}
