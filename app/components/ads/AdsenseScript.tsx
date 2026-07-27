import Script from 'next/script';

const ADSENSE_CLIENT = 'ca-pub-3318524075868220';

export function AdsenseScript() {
  return (
    <Script
      async
      crossOrigin="anonymous"
      id="google-adsense"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      strategy="beforeInteractive"
    />
  );
}
