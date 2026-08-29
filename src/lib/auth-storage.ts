export const MEMBER_TOKEN_KEY = 'kaisa_game_member_token';
export const ADMIN_TOKEN_KEY = 'kaisa_game_admin_token';
export const MEMBER_SAVED_EMAIL_KEY = 'kaisa_game_member_email';

/** Shared across kaisa.co.kr / blog / tool / game */
export const SHARED_MEMBER_COOKIE = 'kaisa_member_token';
const MEMBER_COOKIE_MAX_AGE = 21600 * 60;
const LEGACY_MEMBER_KEYS = [
  'kaisa_blog_member_token',
  'kaisa_tool_member_token',
  'kaisa_game_member_token',
];

function cookieDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const host = window.location.hostname;
  if (host === 'kaisa.co.kr' || host.endsWith('.kaisa.co.kr')) return '.kaisa.co.kr';
  return undefined;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const row = part.trim();
    if (row.startsWith(prefix)) {
      return decodeURIComponent(row.slice(prefix.length));
    }
  }
  return null;
}

function writeCookie(name: string, value: string, maxAge: number) {
  if (typeof document === 'undefined') return;
  const domain = cookieDomain();
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const domainPart = domain ? `; Domain=${domain}` : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${domainPart}${secure}`;
}

function expireCookie(name: string, domain?: string) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const domainPart = domain ? `; Domain=${domain}` : '';
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${domainPart}${secure}`;
}

export function getSavedMemberEmail(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(MEMBER_SAVED_EMAIL_KEY) || '';
}

export function saveMemberEmail(email: string) {
  localStorage.setItem(MEMBER_SAVED_EMAIL_KEY, email);
}

export function clearSavedMemberEmail() {
  localStorage.removeItem(MEMBER_SAVED_EMAIL_KEY);
}

export function getToken(kind: 'member' | 'admin'): string | null {
  if (typeof window === 'undefined') return null;
  if (kind === 'admin') return localStorage.getItem(ADMIN_TOKEN_KEY);

  const fromCookie = readCookie(SHARED_MEMBER_COOKIE);
  if (fromCookie) return fromCookie;

  for (const key of LEGACY_MEMBER_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy) {
      writeCookie(SHARED_MEMBER_COOKIE, legacy, MEMBER_COOKIE_MAX_AGE);
      return legacy;
    }
  }
  return null;
}

export function setToken(kind: 'member' | 'admin', token: string) {
  if (kind === 'admin') {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    return;
  }
  writeCookie(SHARED_MEMBER_COOKIE, token, MEMBER_COOKIE_MAX_AGE);
  for (const key of LEGACY_MEMBER_KEYS) localStorage.removeItem(key);
}

export function clearToken(kind: 'member' | 'admin') {
  if (kind === 'admin') {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    return;
  }
  expireCookie(SHARED_MEMBER_COOKIE);
  expireCookie(SHARED_MEMBER_COOKIE, '.kaisa.co.kr');
  for (const key of LEGACY_MEMBER_KEYS) localStorage.removeItem(key);
}
