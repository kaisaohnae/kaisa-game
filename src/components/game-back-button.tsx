'use client';
import Link from 'next/link';
import {useT} from '@/i18n/locale-context';

export default function GameBackButton() {
  const t = useT();
  return (
    <header className="game-page__header">
      <Link href="/" className="game-page__back" aria-label={t('Back to games')} title={t('Back to games')}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5m7-7-7 7 7 7" />
        </svg>
      </Link>
    </header>
  );
}
