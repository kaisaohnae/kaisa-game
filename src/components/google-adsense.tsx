const ADSENSE_CLIENT = 'ca-pub-2641553863829571';

/** Renders inside root <head> — use native async script (not next/script beforeInteractive). */
export default function GoogleAdsense() {
  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
    />
  );
}
