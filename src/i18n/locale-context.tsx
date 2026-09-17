'use client';
import {createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode} from 'react';
import {DEFAULT_LOCALE, localeFromNavigator, peekStoredLocale, persistLocale, resolveLocale} from './detect';
import {getLocaleCookie} from './locale-cookie';
import {translate} from './translate';
import type {Locale} from './types';

interface LocaleContextValue {
  locale: Locale; country: string | null; t: (key: string) => string;
  setLocale: (locale: Locale, country?: string | null) => void;
}
const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE, country: null, t: key => key, setLocale: () => undefined
});
export function LocaleProvider({children}: {children: ReactNode}) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [country, setCountry] = useState<string | null>(null);
  const choiceVersion = useRef(0);
  useEffect(() => {
    let cancelled = false;
    const version = choiceVersion.current;
    const initial = peekStoredLocale() ?? localeFromNavigator() ?? DEFAULT_LOCALE;
    setLocaleState(initial);
    document.documentElement.lang = initial;
    resolveLocale().then(result => {
      if (cancelled || version !== choiceVersion.current) return;
      setLocaleState(result.locale);
      setCountry(result.country);
      document.documentElement.lang = result.locale;
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const syncLocale = () => {
      const shared = getLocaleCookie();
      if (shared && shared !== locale) {
        choiceVersion.current++;
        setLocaleState(shared);
        document.documentElement.lang = shared;
      }
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') syncLocale(); };
    window.addEventListener('focus', syncLocale);
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(onVisibility, 1000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', syncLocale);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [locale]);
  const setLocale = useCallback((next: Locale, nextCountry: string | null = null) => {
    choiceVersion.current++;
    setLocaleState(next); setCountry(nextCountry);
    persistLocale(next, nextCountry);
    document.documentElement.lang = next;
  }, []);
  return <LocaleContext.Provider value={{locale, country, t: key => translate(key, locale), setLocale}}>{children}</LocaleContext.Provider>;
}
export function useLocale(): Locale { return useContext(LocaleContext).locale; }
export function useCountry(): string | null { return useContext(LocaleContext).country; }
export function useSetLocale() { return useContext(LocaleContext).setLocale; }
export function useT() { return useContext(LocaleContext).t; }
