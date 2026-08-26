import type {Metadata, Viewport} from 'next';
import {Fredoka, Nunito} from 'next/font/google';
import '@/app/globals.css';
import GoogleAnalytics from '@/components/google-analytics';
import GoogleAdsense from '@/components/google-adsense';
import {LocaleProvider} from '@/i18n/locale-context';
import {getSiteUrl, SITE_DESCRIPTION, SITE_NAME} from '@/config/site';

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
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {index: true, follow: true},
  other: {
    'naver-site-verification': '23f0b8d4af5ee5ef89c26dea4c387517014dc8c0',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#fff3d9',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <head>
        <GoogleAdsense />
      </head>
      <body>
        <GoogleAnalytics />
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
