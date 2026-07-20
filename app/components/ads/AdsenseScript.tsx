'use client';

import Script from 'next/script';

import { useAdConfiguration } from './AdConfigurationProvider';

export function AdsenseScript() {
  const { configuration, previewPlacement, ready } = useAdConfiguration();
  if (!ready || previewPlacement || !configuration.scriptClient) return null;

  return (
    <Script
      async
      crossOrigin="anonymous"
      id="google-adsense"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(configuration.scriptClient)}`}
      strategy="afterInteractive"
    />
  );
}
