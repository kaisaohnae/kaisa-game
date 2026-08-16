import type {Metadata, Viewport} from 'next';
import {Fredoka, Nunito} from 'next/font/google';
import '@/app/globals.css';

const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-kids-display',
  display: 'swap',
});

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-kids-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kaisa Kids',
  description: '폰·태블릿에서 즐기는 터치 놀이터',
  appleWebApp: {
    capable: true,
    title: 'Kaisa Kids',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#fff3d9',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ko" className={`${fredoka.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
