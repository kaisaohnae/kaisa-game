import {getLocaleCookie, setLocaleCookie} from './locale-cookie';
import type {Locale} from './types';

export const LOCALE_STORAGE_KEY = 'kaisa-locale';
export const COUNTRY_STORAGE_KEY = 'kaisa-country';
export const IP_STORAGE_KEY = 'kaisa-ip';

/** Default for first paint / unknown — posts are Korean. */
export const DEFAULT_LOCALE: Locale = 'ko';

const COUNTRY_LOCALE_MAP: Record<string, Locale> = {
  US: 'en',
  KR: 'ko',
  CN: 'zh',
  IN: 'hi',
};

export const LOCALE_OPTIONS: {locale: Locale; country: string; flag: string; label: string}[] = [
  {locale: 'en', country: 'US', flag: '🇺🇸', label: 'English'},
  {locale: 'ko', country: 'KR', flag: '🇰🇷', label: '한국어'},
  {locale: 'zh', country: 'CN', flag: '🇨🇳', label: '中文'},
  {locale: 'hi', country: 'IN', flag: '🇮🇳', label: 'हिन्दी'},
];

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'en' || value === 'ko' || value === 'zh' || value === 'hi';
}

export function countryToLocale(countryCode: string | undefined | null): Locale {
  if (!countryCode) return DEFAULT_LOCALE;
  const code = countryCode.trim().toUpperCase();
  return COUNTRY_LOCALE_MAP[code] ?? DEFAULT_LOCALE;
}

/** Prefer browser language list over IP geo. */
export function localeFromNavigator(
  language?: string | null,
  languages?: readonly string[] | null,
): Locale | null {
  const nav =
    typeof navigator !== 'undefined'
      ? navigator
      : ({language: language || '', languages: languages || []} as Navigator);

  const candidates = [language ?? nav.language, ...((languages ?? nav.languages) || [])].filter(
    Boolean,
  ) as string[];

  for (const raw of candidates) {
    const l = raw.toLowerCase();
    if (l.startsWith('ko')) return 'ko';
    if (l.startsWith('zh')) return 'zh';
    if (l.startsWith('hi')) return 'hi';
    if (l.startsWith('en')) return 'en';
  }
  return null;
}

export async function fetchCountryAndIp(): Promise<{country: string | null; ip: string | null}> {
  try {
    const res = await fetch('https://api.country.is/', {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return {country: null, ip: null};
    const data = (await res.json()) as {country?: string; ip?: string};
    const country = typeof data.country === 'string' ? data.country.trim().toUpperCase() : '';
    const ip = typeof data.ip === 'string' ? data.ip.trim() : '';
    return {country: country || null, ip: ip || null};
  } catch {
    return {country: null, ip: null};
  }
}

export async function fetchCountryCode(): Promise<string | null> {
  const {country} = await fetchCountryAndIp();
  return country;
}

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function peekStoredLocale(): Locale | null {
  const shared = getLocaleCookie();
  if (shared) return shared;
  const cached = readSession(LOCALE_STORAGE_KEY);
  return isLocale(cached) ? cached : null;
}

export function peekStoredIp(): string | null {
  return readSession(IP_STORAGE_KEY);
}

export function persistLocale(locale: Locale, country: string | null, ip?: string | null): void {
  setLocaleCookie(locale);
  writeSession(LOCALE_STORAGE_KEY, locale);
  if (country) writeSession(COUNTRY_STORAGE_KEY, country);
  else {
    try {
      sessionStorage.removeItem(COUNTRY_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  if (ip) writeSession(IP_STORAGE_KEY, ip);
}

/**
 * 1) session choice
 * 2) navigator.language
 * 3) IP country (fallback)
 */
export async function resolveLocale(): Promise<{locale: Locale; country: string | null; ip?: string | null}> {
  const cachedLocale = peekStoredLocale();
  const cachedCountry = readSession(COUNTRY_STORAGE_KEY);
  const cachedIp = readSession(IP_STORAGE_KEY);
  const initial = cachedLocale ?? localeFromNavigator();
  if (initial) persistLocale(initial, cachedCountry, cachedIp);
  if (cachedLocale && cachedCountry) return {locale: cachedLocale, country: cachedCountry, ip: cachedIp};

  const {country, ip} = await fetchCountryAndIp();
  const latest = getLocaleCookie() ?? peekStoredLocale();
  if (latest && latest !== initial) {
    return {locale: latest, country: readSession(COUNTRY_STORAGE_KEY), ip: readSession(IP_STORAGE_KEY)};
  }
  const locale = latest ?? initial ?? countryToLocale(country);
  persistLocale(locale, country, ip);
  return {locale, country, ip};
}
