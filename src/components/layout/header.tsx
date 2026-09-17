'use client';
import {useEffect, useId, useRef} from 'react';
import {usePathname} from 'next/navigation';
import IconLogo from '@/components/icons/common/icon-logo';
import {useHeaderMenuSpacing} from './use-header-menu-spacing';
import {useSharedMenu} from './use-shared-menu';
import ThemeToggle from './theme-toggle';
import {useLocale, useT} from '@/i18n/locale-context';
import {activeKaisaNav, KAISA_HOME_URL, KAISA_NAV, KAISA_NAV_LABELS} from '@/config/kaisa-navigation';
import './kaisa-header.css';

export default function Header() {
  const pathname = usePathname() || '/';
  const t = useT();
  const locale = useLocale();
  const {open, setOpen} = useSharedMenu();
  const navId = useId();
  const headerRef = useRef<HTMLElement>(null);
  useHeaderMenuSpacing(headerRef, open);
  const active = activeKaisaNav('game', pathname);
  const isWorks = active === 'works';
  useEffect(() => {
    const onScroll = () => document.body.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, {passive: true});
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, setOpen]);
  const items = KAISA_NAV.map(item => (
    <li key={item.id} className={active === item.id ? 'kaisa-header__item is-active' : 'kaisa-header__item'}>
      <a href={item.href} className="kaisa-header__link" aria-current={active === item.id ? 'page' : undefined}>
        {KAISA_NAV_LABELS[locale][item.id]}
      </a>
    </li>
  ));
  return (
    <header id="header" ref={headerRef} className={`kaisa-header ${isWorks ? 'kaisa-header--works' : ''} ${open ? 'kaisa-header--open' : ''}`}>
      <div className="kaisa-header__shell">
        <div className="kaisa-header__top">
          <a href={KAISA_HOME_URL} className="kaisa-header__logo" aria-label="Kaisa Home"><IconLogo width={100} height={42} /></a>
          <div className="kaisa-header__actions">
            <nav className="kaisa-header__desktop" aria-label={t('Main navigation')}><ul className="kaisa-header__list">{items}</ul></nav>
            <ThemeToggle />
            <button type="button" className="kaisa-header__toggle" aria-expanded={open} aria-controls={navId} aria-label={open ? t('Close menu') : t('Open menu')} onClick={() => setOpen(value => !value)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d={open ? 'M6 6l12 12M6 18 18 6' : 'M3 6h18M3 12h18M3 18h18'} />
              </svg>
            </button>
          </div>
        </div>
        <nav id={navId} className="kaisa-header__mobile" aria-label={t('Mobile navigation')} hidden={!open}><ul className="kaisa-header__list">{items}</ul></nav>
      </div>
    </header>
  );
}
