'use client';

import Link from 'next/link';
import {useEffect} from 'react';
import MemberHeaderActions from '@/components/layout/member-header-actions';
import {LOCALE_OPTIONS} from '@/i18n/detect';
import {useLocale, useSetLocale, useT} from '@/i18n/locale-context';
import useMemberStore from '@/store/use-member-store';

export default function Footer() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const t = useT();
  const {member, hydrated, hydrate, logout} = useMemberStore();

  useEffect(() => {
    hydrate();
    const onSync = () => {
      hydrate();
    };
    window.addEventListener('focus', onSync);
    document.addEventListener('visibilitychange', onSync);
    return () => {
      window.removeEventListener('focus', onSync);
      document.removeEventListener('visibilitychange', onSync);
    };
  }, [hydrate]);

  return (
    <footer id="footer" className="site-footer">
      <div className="site-shell">
        <div className="site-footer__inner site-shell__inner">
          <div className="site-footer__brand">
            <div className="site-footer__auth">
              {hydrated && member ? (
                <MemberHeaderActions member={member} onLogout={() => logout()} />
              ) : (
                <div className="auth-chip">
                  <Link href="/login/" className="auth-chip__link">
                    {t('Login')}
                  </Link>
                  <Link href="/register/" className="auth-chip__link">
                    {t('Register')}
                  </Link>
                </div>
              )}
            </div>
            <p className="site-footer__copy">
              © 2005{' '}
              <a
                href="https://kaisa.co.kr"
                className="site-footer__copy-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                kaisa.co.kr
              </a>
              . All Rights Reserved.
            </p>
          </div>
          <div className="site-footer__aside">
            <div className="site-footer__langs" role="group" aria-label="Language">
              {LOCALE_OPTIONS.map(option => {
                const active = locale === option.locale;
                return (
                  <button
                    key={option.locale}
                    type="button"
                    className={
                      active ? 'site-footer__lang site-footer__lang--active' : 'site-footer__lang'
                    }
                    aria-pressed={active}
                    onClick={() => setLocale(option.locale, option.country)}
                  >
                    {option.locale.toUpperCase()}
                  </button>
                );
              })}
            </div>
            <a href="mailto:kaisa@kaisa.co.kr" className="site-footer__link">
              kaisa@kaisa.co.kr
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
