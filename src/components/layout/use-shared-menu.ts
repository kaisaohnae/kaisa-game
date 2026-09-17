import {useCallback, useEffect, useRef, useState, type SetStateAction} from 'react';
import {getMenuCookie, setMenuCookie} from '@/etc/menu-cookie';

export function useSharedMenu() {
  const [open, setOpenState] = useState(false);
  const current = useRef(false);
  const setOpen = useCallback((value: SetStateAction<boolean>) => {
    const next = typeof value === 'function' ? value(current.current) : value;
    current.current = next;
    setMenuCookie(next);
    setOpenState(next);
  }, []);
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 768px)');
    const sync = () => {
      const next = mobile.matches && getMenuCookie();
      current.current = next;
      setOpenState(next);
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') sync(); };
    sync();
    mobile.addEventListener('change', sync);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(onVisibility, 1000);
    return () => {
      window.clearInterval(timer);
      mobile.removeEventListener('change', sync);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return {open, setOpen};
}
