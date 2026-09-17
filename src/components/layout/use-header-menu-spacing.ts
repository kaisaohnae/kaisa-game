import {useEffect, type RefObject} from 'react';

/** Use the actual expanded header height so wrapped mobile menus also reserve enough space. */
export function useHeaderMenuSpacing(headerRef: RefObject<HTMLElement | null>, open: boolean) {
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const mobile = window.matchMedia('(max-width: 768px)');
    const update = () => {
      const top = header.querySelector<HTMLElement>('.kaisa-header__top');
      const extra = open && mobile.matches && top
        ? Math.max(0, header.offsetHeight - top.offsetHeight)
        : 0;
      document.documentElement.style.setProperty('--kaisa-mobile-menu-height', extra + 'px');
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    mobile.addEventListener('change', update);
    return () => {
      observer.disconnect();
      mobile.removeEventListener('change', update);
      document.documentElement.style.removeProperty('--kaisa-mobile-menu-height');
    };
  }, [headerRef, open]);
}
