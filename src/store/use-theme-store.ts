import {create} from 'zustand';
import {
  getStoredTheme,
  setThemeCookie,
  THEME_COOKIE_KEY,
  type Theme,
} from '@/etc/theme-cookie';

export type {Theme};
export const THEME_STORAGE_KEY = THEME_COOKIE_KEY;

type State = {
  theme: Theme;
  hydrated: boolean;
};

type Actions = {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => void;
};

const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  setThemeCookie(theme);
};

export const useThemeStore = create<State & Actions>((set, get) => ({
  theme: 'light',
  hydrated: false,
  setTheme: (theme) => {
    applyTheme(theme);
    set({theme});
  },
  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(next);
  },
  initTheme: () => {
    const theme = getStoredTheme() ?? 'light';
    applyTheme(theme);
    set({theme, hydrated: true});
  },
}));

export default useThemeStore;
