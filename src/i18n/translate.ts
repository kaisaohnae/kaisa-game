import {dictionary} from './dictionary';
import type {Locale} from './types';

export function translate(key: string, locale: Locale): string {
  if (locale === 'en') return key;
  const entry = dictionary[key];
  if (!entry) return key;
  return entry[locale] ?? key;
}
