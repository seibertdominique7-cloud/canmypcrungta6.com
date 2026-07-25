import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  trackAffiliateProductClicked,
  trackArticleViewed,
  trackCheckerResult,
  trackEmailSignupCompleted,
  trackManualSpecsSubmitted,
  trackMerchProductClicked,
  trackMerchProductViewed,
  trackPcCheckerStarted,
  trackScreenshotUploaded,
} from './analytics';

describe('Google Analytics event helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does nothing during server rendering', () => {
    expect(() => trackArticleViewed('launch-guide')).not.toThrow();
  });

  it('tracks checker events without hardware details', () => {
    const gtag = mockGoogleTag();

    trackPcCheckerStarted('screenshot');
    trackCheckerResult('recommended', 'screenshot');
    trackScreenshotUploaded('image/png');
    trackManualSpecsSubmitted();

    expect(gtag).toHaveBeenNthCalledWith(1, 'event', 'pc_checker_started', {
      detection_method: 'screenshot',
    });
    expect(gtag).toHaveBeenNthCalledWith(2, 'event', 'pc_checker_completed', {
      checker_result: 'recommended',
      detection_method: 'screenshot',
    });
    expect(gtag).toHaveBeenNthCalledWith(3, 'event', 'pc_checker_passed', {
      checker_result: 'recommended',
      detection_method: 'screenshot',
    });
    expect(gtag).toHaveBeenNthCalledWith(4, 'event', 'screenshot_uploaded', {
      detection_method: 'screenshot',
      file_type: 'image/png',
    });
    expect(gtag).toHaveBeenNthCalledWith(5, 'event', 'manual_specs_submitted', {
      detection_method: 'manual',
    });
  });

  it('tracks content and commerce events using only non-personal metadata', () => {
    const gtag = mockGoogleTag();

    trackAffiliateProductClicked({
      productName: 'RTX 4070',
      productCategory: 'GPU',
      destinationUrl: 'https://retailer.example/product',
    });
    trackMerchProductViewed({
      productName: 'Launch Day Tee',
      productCategory: 'Launch Day Gear',
    });
    trackMerchProductClicked({
      productName: 'Launch Day Tee',
      productCategory: 'Launch Day Gear',
      destinationUrl: '/merch/launch-day-tee',
    });
    trackEmailSignupCompleted('homepage');
    trackArticleViewed('launch-guide');

    expect(gtag).toHaveBeenCalledTimes(5);
    expect(gtag).toHaveBeenLastCalledWith('event', 'article_viewed', {
      article_slug: 'launch-guide',
    });
    expect(JSON.stringify(gtag.mock.calls)).not.toContain('email_address');
  });
});

function mockGoogleTag() {
  const gtag = vi.fn();
  vi.stubGlobal('window', { gtag });
  return gtag;
}
