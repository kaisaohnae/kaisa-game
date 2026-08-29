'use client';

import Link from 'next/link';
import {useEffect, useId, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';
import IconLogo from '@/components/icons/common/icon-logo';
import {useT} from '@/i18n/locale-context';

const NAV = [
  {
    href: '/',
    labelKey: 'Games',
    match: (path: string) => path === '/' || path.startsWith('/games'),
  },
] as const;

export default function Header() {
  const t = useT();
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const navId = useId();
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (target && headerRef.current && !headerRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const items = NAV.map(item => {
    const isActive = item.match(pathname);

    return (
      <li key={item.href} className={isActive ? 'menu__item menu__item--active' : 'menu__item'}>
        <Link
          href={item.href}
          className="menu__link"
          aria-current={isActive ? 'page' : undefined}
          onClick={() => setOpen(false)}
        >
          {t(item.labelKey)}
        </Link>
      </li>
    );
  });

  return (
    <header id="header" ref={headerRef} className={open ? 'header--nav-open' : ''}>
      <div className="site-shell site-shell--header">
        <div className="header__top header__inner site-shell__inner">
          <p className="header__logo">
            <Link href="/" aria-label="Kaisa Home">
              <IconLogo width={100} height={42} />
            </Link>
          </p>
          <div className="header__actions">
            <nav className="menu menu--desktop" aria-label={t('Main navigation')}>
              <ul className="menu__list">{items}</ul>
            </nav>
            <button
              type="button"
              className={open ? 'menu__toggle menu__toggle--open' : 'menu__toggle'}
              aria-expanded={open}
              aria-controls={navId}
              aria-label={open ? t('Close menu') : t('Open menu')}
              onClick={() => setOpen(v => !v)}
            >
              <span className="menu__toggle-icon" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>

        <nav id={navId} className="header__nav" aria-label={t('Mobile navigation')} hidden={!open}>
          <div className="site-shell__inner header__nav-inner">
            <ul className="menu__list menu__list--mobile">{items}</ul>
          </div>
        </nav>
      </div>
    </header>
  );
}
