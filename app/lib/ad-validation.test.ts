import { describe, expect, it } from 'vitest';

import { isValidAdsenseClient, isValidAdsenseSlot, validateAdPlacement } from './ad-validation';

describe('ad management validation', () => {
  it('validates Google AdSense identifiers', () => {
    expect(isValidAdsenseClient('ca-pub-1234567890123456')).toBe(true);
    expect(isValidAdsenseClient('ca-pub-XXXXXXXXXXXXXXXX')).toBe(false);
    expect(isValidAdsenseSlot('1234567890')).toBe(true);
    expect(isValidAdsenseSlot('slot-123')).toBe(false);
  });

  it('rejects unknown placement codes', () => {
    const result = validateAdPlacement({ code: 'new-placement' });
    expect(result.data).toBeNull();
    expect(result.fieldErrors.code).toBeTruthy();
  });

  it('keeps custom HTML disabled even after trusted confirmation', () => {
    const result = validateAdPlacement({
      code: 'homepage',
      enabled: true,
      provider: 'custom-html',
      customHtml: '<div>Ad</div>',
      customHtmlTrusted: true,
    });
    expect(result.data).toBeNull();
    expect(result.fieldErrors.provider).toContain('not available');
  });

  it('enforces desktop targeting for the article sidebar', () => {
    const result = validateAdPlacement({ code: 'article-sidebar', deviceTarget: 'mobile' });
    expect(result.data).toBeNull();
    expect(result.fieldErrors.deviceTarget).toContain('desktop-only');
  });
});
