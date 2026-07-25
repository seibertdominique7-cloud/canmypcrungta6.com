import { describe, expect, it } from 'vitest';

import { DEFAULT_MERCH_STORE_SETTINGS } from './merch-types';
import { getStoreSitemapEntry } from './merch-sitemap';

describe('store sitemap visibility', () => {
  it('excludes the store when disabled or missing a valid URL', () => {
    expect(getStoreSitemapEntry(DEFAULT_MERCH_STORE_SETTINGS, 'https://example.com')).toBeNull();
    expect(getStoreSitemapEntry({
      ...DEFAULT_MERCH_STORE_SETTINGS,
      storeEnabled: true,
    }, 'https://example.com')).toBeNull();
  });

  it('includes the canonical store URL only when publicly enabled', () => {
    const date = new Date('2026-07-24T12:00:00.000Z');
    expect(getStoreSitemapEntry({
      ...DEFAULT_MERCH_STORE_SETTINGS,
      storeEnabled: true,
      storeUrl: 'https://example-shop.fourthwall.com',
    }, 'https://canmypcrungta6.com/', date)).toEqual({
      url: 'https://canmypcrungta6.com/store',
      lastModified: date,
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  });
});
