import type { OverallResultStatus } from './compatibility';

export type CheckerDetectionMethod = 'manual' | 'screenshot';

type AnalyticsParameter = string | number | boolean | undefined;
type AnalyticsParameters = Record<string, AnalyticsParameter>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackPcCheckerStarted(detectionMethod: CheckerDetectionMethod) {
  sendEvent('pc_checker_started', {
    detection_method: detectionMethod,
  });
}

export function trackPcCheckerCompleted(
  checkerResult: OverallResultStatus,
  detectionMethod: CheckerDetectionMethod,
) {
  sendEvent('pc_checker_completed', {
    checker_result: checkerResult,
    detection_method: detectionMethod,
  });
}

export function trackPcCheckerPassed(
  checkerResult: Extract<OverallResultStatus, 'minimum' | 'recommended'>,
  detectionMethod: CheckerDetectionMethod,
) {
  sendEvent('pc_checker_passed', {
    checker_result: checkerResult,
    detection_method: detectionMethod,
  });
}

export function trackPcCheckerFailed(detectionMethod: CheckerDetectionMethod) {
  sendEvent('pc_checker_failed', {
    checker_result: 'fail',
    detection_method: detectionMethod,
  });
}

export function trackCheckerResult(
  checkerResult: OverallResultStatus,
  detectionMethod: CheckerDetectionMethod,
) {
  trackPcCheckerCompleted(checkerResult, detectionMethod);

  if (checkerResult === 'recommended' || checkerResult === 'minimum') {
    trackPcCheckerPassed(checkerResult, detectionMethod);
  } else if (checkerResult === 'fail') {
    trackPcCheckerFailed(detectionMethod);
  }
}

export function trackScreenshotUploaded(fileType?: string) {
  sendEvent('screenshot_uploaded', {
    detection_method: 'screenshot',
    file_type: fileType || undefined,
  });
}

export function trackManualSpecsSubmitted() {
  sendEvent('manual_specs_submitted', {
    detection_method: 'manual',
  });
}

export function trackAffiliateProductClicked({
  destinationUrl,
  productCategory,
  productName,
}: {
  destinationUrl?: string;
  productCategory?: string;
  productName?: string;
}) {
  sendEvent('affiliate_product_clicked', {
    destination_url: destinationUrl,
    product_category: productCategory,
    product_name: productName,
  });
}

export function trackMerchProductViewed({
  productCategory,
  productName,
}: {
  productCategory?: string;
  productName?: string;
}) {
  sendEvent('merch_product_viewed', {
    product_category: productCategory,
    product_name: productName,
  });
}

export function trackMerchProductClicked({
  destinationUrl,
  productCategory,
  productName,
}: {
  destinationUrl?: string;
  productCategory?: string;
  productName?: string;
}) {
  sendEvent('merch_product_clicked', {
    destination_url: destinationUrl,
    product_category: productCategory,
    product_name: productName,
  });
}

export function trackEmailSignupCompleted(signupSource: string) {
  sendEvent('email_signup_completed', {
    signup_source: signupSource,
  });
}

export function trackArticleViewed(articleSlug: string) {
  sendEvent('article_viewed', {
    article_slug: articleSlug,
  });
}

function sendEvent(name: string, parameters: AnalyticsParameters) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  const safeParameters = Object.fromEntries(
    Object.entries(parameters).filter(([, value]) => value !== undefined && value !== ''),
  );
  window.gtag('event', name, safeParameters);
}
