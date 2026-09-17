import type {Locale} from './types';

export const LOCALE_COOKIE_KEY = 'kaisa-shared-locale';
const MAX_AGE = 60 * 60 * 24 * 30;
function valid(value: unknown): value is Locale {
  return value === 'ko' || value === 'en' || value === 'zh' || value === 'hi';
}
export function getLocaleCookie(): Locale | null {
  if (typeof document === 'undefined') return null;
  const entry = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith(LOCALE_COOKIE_KEY + '='));
  const value = entry?.slice(LOCALE_COOKIE_KEY.length + 1);
  return valid(value) ? value : null;
}
export function setLocaleCookie(locale: Locale) {
  if (typeof document === 'undefined') return;
  const host = window.location.hostname;
  const domain = host === 'kaisa.co.kr' || host.endsWith('.kaisa.co.kr') ? '; domain=kaisa.co.kr' : '';
  document.cookie = LOCALE_COOKIE_KEY + '=' + locale + '; max-age=' + MAX_AGE + '; path=/; samesite=lax' + domain;
}

/** Sets the shared cookie on first entry, before hydration; React starts with a stable locale. */
export const LOCALE_BOOTSTRAP_SCRIPT = `(function(){try{
var key='kaisa-shared-locale',entry=document.cookie.split(';').map(function(c){return c.trim();}).find(function(c){return c.indexOf(key+'=')===0;});
var l=entry?entry.slice(key.length+1):null;
function valid(v){return /^(ko|en|zh|hi)$/.test(v||'');}
if(!valid(l)){try{l=sessionStorage.getItem('kaisa-locale');}catch(e){}}
if(!valid(l)){var a=[navigator.language].concat(navigator.languages||[]);l=null;for(var i=0;i<a.length;i++){var m=/^(ko|en|zh|hi)/i.exec(a[i]||'');if(m){l=m[1].toLowerCase();break;}}}
var determined=valid(l);if(!determined)l='ko';
if(determined&&(!entry||entry.slice(key.length+1)!==l)){var h=location.hostname,d=h==='kaisa.co.kr'||h.endsWith('.kaisa.co.kr')?'; domain=kaisa.co.kr':'';document.cookie=key+'='+l+'; max-age=2592000; path=/; samesite=lax'+d;}
document.documentElement.lang=l;
}catch(e){document.documentElement.lang='ko';}})();`;
