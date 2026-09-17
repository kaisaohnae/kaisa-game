'use client';

import {useEffect} from 'react';
import useThemeStore from '@/store/use-theme-store';
import {getThemeCookie} from '@/etc/theme-cookie';

export default function ThemeProvider() {
  useEffect(() => {
    useThemeStore.getState().initTheme();
    const syncTheme = () => {
      const theme = getThemeCookie();
      if (theme && theme !== useThemeStore.getState().theme) {
        useThemeStore.getState().setTheme(theme);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncTheme();
    };
    window.addEventListener('focus', syncTheme);
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') syncTheme();
    }, 1000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', syncTheme);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return null;
}
