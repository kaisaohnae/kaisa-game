'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import './studio-nav.css';

const NAV = [
  {href: '/studio/', label: '에셋 스튜디오', match: (p: string) => p === '/studio' || p === '/studio/'},
  {
    href: '/studio/map/',
    label: 'Todie 맵',
    match: (p: string) => p.startsWith('/studio/map'),
  },
] as const;

export default function StudioNav() {
  const pathname = usePathname() ?? '';
  const onMap = pathname.startsWith('/studio/map');

  return (
    <nav
      className={`studio-nav${onMap ? ' studio-nav--map' : ''}`}
      aria-label="스튜디오 메뉴"
    >
      <div className="studio-nav__inner">
        <div className="studio-nav__tabs" role="tablist">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                role="tab"
                aria-selected={active}
                className={`studio-nav__tab${active ? ' studio-nav__tab--active' : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
