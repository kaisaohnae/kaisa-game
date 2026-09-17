import Script from 'next/script';

const ADSENSE_CLIENT = 'ca-pub-2641553863829571';

/** Load ads after hydration so third-party head mutations cannot reorder the initial tree. */
export default function GoogleAdsense() {
  return (
    <Script
      id="kaisa-google-adsense"
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
    />
  );
}
