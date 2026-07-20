import { describe, expect, it } from 'vitest';

import { isValidAdsenseClient, isValidAdsenseSlot } from './ad-config';

describe('AdSense configuration validation', () => {
  it('accepts a real publisher ID shape and rejects placeholders', () => {
    expect(isValidAdsenseClient('ca-pub-1234567890123456')).toBe(true);
    expect(isValidAdsenseClient('ca-pub-XXXXXXXXXXXXXXXX')).toBe(false);
    expect(isValidAdsenseClient('')).toBe(false);
  });

  it('accepts numeric slot IDs only', () => {
    expect(isValidAdsenseSlot('1234567890')).toBe(true);
    expect(isValidAdsenseSlot('')).toBe(false);
    expect(isValidAdsenseSlot('homepage-slot')).toBe(false);
  });
});
