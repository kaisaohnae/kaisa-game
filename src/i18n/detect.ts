import type {Locale} from './types';

export const LOCALE_STORAGE_KEY = 'kaisa-locale';
export const COUNTRY_STORAGE_KEY = 'kaisa-country';

const COUNTRY_LOCALE_MAP: Record<string, Locale> = {
  US: 'en',
  KR: 'ko',
  CN: 'zh',
  IN: 'hi'
};

export const LOCALE_OPTIONS: {locale: Locale; country: string; flag: string; label: string}[] = [
  {locale: 'en', country: 'US', flag: '🇺🇸', label: 'English'},
  {locale: 'ko', country: 'KR', flag: '🇰🇷', label: '한국어'},
  {locale: 'zh', country: 'CN', flag: '🇨🇳', label: '中文'},
  {locale: 'hi', country: 'IN', flag: '🇮🇳', label: 'हिन्दी'}
];

export function countryToLocale(countryCode: string | undefined | null): Locale {
  if (!countryCode) return 'en';
  const code = countryCode.trim().toUpperCase();
  return COUNTRY_LOCALE_MAP[code] ?? 'en';
}

export async function fetchCountryCode(): Promise<string | null> {
  try {
    const res = await fetch('https://api.country.is/', {
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {country?: string};
    const country = typeof data.country === 'string' ? data.country.trim().toUpperCase() : '';
    return country || null;
  } catch {
    return null;
  }
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

export function persistLocale(locale: Locale, country: string | null): void {
  writeSession(LOCALE_STORAGE_KEY, locale);
  if (country) writeSession(COUNTRY_STORAGE_KEY, country);
  else {
    try {
      sessionStorage.removeItem(COUNTRY_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export async function resolveLocale(): Promise<{locale: Locale; country: string | null}> {
  const cachedLocale = readSession(LOCALE_STORAGE_KEY) as Locale | null;
  const cachedCountry = readSession(COUNTRY_STORAGE_KEY);

  if (cachedLocale === 'en' || cachedLocale === 'ko' || cachedLocale === 'zh' || cachedLocale === 'hi') {
    return {locale: cachedLocale, country: cachedCountry};
  }

  const country = await fetchCountryCode();
  const locale = countryToLocale(country);
  persistLocale(locale, country);
  return {locale, country};
}
