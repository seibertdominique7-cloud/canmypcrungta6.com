'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  trackAffiliateProductClicked,
  trackArticleViewed,
  trackMerchProductClicked,
  trackMerchProductViewed,
} from '../../lib/analytics';

const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;
const MERCH_CATEGORY = 'Launch Day Gear';

export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const [analyticsReady, setAnalyticsReady] = useState(false);
  const lastTrackedPath = useRef('');
  const validMeasurementId = GA_MEASUREMENT_ID_PATTERN.test(measurementId);

  useEffect(() => {
    if (
      !analyticsReady ||
      !validMeasurementId ||
      !pathname ||
      lastTrackedPath.current === pathname
    ) {
      return;
    }

    lastTrackedPath.current = pathname;
    const frame = window.requestAnimationFrame(() => {
      window.gtag?.('event', 'page_view', {
        page_location: `${window.location.origin}${pathname}`,
        page_path: pathname,
        page_title: document.title,
      });

      const articleMatch = pathname.match(/^\/articles\/([^/]+)$/);
      if (articleMatch) {
        trackArticleViewed(articleMatch[1]);
      }

      const merchMatch = pathname.match(/^\/merch\/([^/]+)$/);
      if (merchMatch) {
        trackMerchProductViewed({
          productCategory: MERCH_CATEGORY,
          productName: document.querySelector('main h1')?.textContent?.trim() || merchMatch[1],
        });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [analyticsReady, pathname, validMeasurementId]);

  useEffect(() => {
    if (!validMeasurementId) return;

    const onDocumentClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!anchor) return;

      if (anchor.rel.split(/\s+/).includes('sponsored')) {
        trackAffiliateProductClicked({
          destinationUrl: anchor.href,
          productCategory: anchor.dataset.analyticsProductCategory,
          productName:
            anchor.dataset.analyticsProductName ||
            anchor.closest('article')?.querySelector('h2, h3')?.textContent?.trim() ||
            anchor.textContent?.trim(),
        });
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin === window.location.origin &&
        /^\/merch\/[^/]+$/.test(destination.pathname)
      ) {
        trackMerchProductClicked({
          destinationUrl: `${destination.origin}${destination.pathname}`,
          productCategory: MERCH_CATEGORY,
          productName:
            anchor.dataset.analyticsProductName ||
            anchor.closest('article')?.querySelector('h2, h3')?.textContent?.trim() ||
            destination.pathname.split('/').pop(),
        });
      }
    };

    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, [validMeasurementId]);

  if (!validMeasurementId) return null;

  const debugMode = process.env.NODE_ENV !== 'production';
  const bootstrap = `
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
    window.gtag('js', new Date());
    window.gtag('config', ${JSON.stringify(measurementId)}, {
      send_page_view: false,
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      debug_mode: ${debugMode}
    });
  `;

  return (
    <>
      <Script id="ga4-bootstrap" strategy="afterInteractive">
        {bootstrap}
      </Script>
      <Script
        id="ga4-library"
        onReady={() => setAnalyticsReady(true)}
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        strategy="afterInteractive"
      />
    </>
  );
}
