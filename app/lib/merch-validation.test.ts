import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MERCH_STORE_SETTINGS,
  merchExternalLinkProps,
} from './merch-types';
import {
  isPublicMerchandiseProduct,
  isPublicMerchStore,
  validateMerchandiseProduct,
  validateMerchStoreSettings,
} from './merch-validation';

const completeProduct = {
  title: 'GTA VI Launch Tee',
  shortDescription: 'Original launch-themed gaming apparel.',
  productUrl: 'https://example-shop.fourthwall.com/products/launch-tee',
  imageUrl: 'https://cdn.example.com/launch-tee.png',
  productType: 'T-Shirt',
  badge: 'New',
  priceText: '$29.99',
  enabled: true,
  featured: true,
  displayOrder: 10,
  homepageVisible: true,
  storeVisible: true,
  articleVisible: true,
  notes: '',
  source: 'manual',
};

describe('merchandise validation and visibility', () => {
  it('allows incomplete disabled drafts but blocks incomplete enabled products', () => {
    expect(validateMerchandiseProduct({ ...completeProduct, enabled: false, title: '', productUrl: '', imageUrl: null }).data).not.toBeNull();
    const enabled = validateMerchandiseProduct({ ...completeProduct, title: '', productUrl: '', imageUrl: null });
    expect(enabled.data).toBeNull();
    expect(enabled.fieldErrors.title).toBeTruthy();
    expect(enabled.fieldErrors.productUrl).toBeTruthy();
    expect(enabled.fieldErrors.imageUrl).toBeTruthy();
  });

  it('rejects unsafe product and image schemes', () => {
    const result = validateMerchandiseProduct({
      ...completeProduct,
      productUrl: 'javascript:alert(1)',
      imageUrl: 'data:image/svg+xml,bad',
    });
    expect(result.data).toBeNull();
    expect(result.fieldErrors.productUrl).toContain('HTTPS');
    expect(result.fieldErrors.imageUrl).toContain('HTTPS');
  });

  it('publishes only complete enabled merchandise', () => {
    expect(isPublicMerchandiseProduct(completeProduct)).toBe(true);
    expect(isPublicMerchandiseProduct({ ...completeProduct, enabled: false })).toBe(false);
    expect(isPublicMerchandiseProduct({ ...completeProduct, imageUrl: null })).toBe(false);
  });

  it('keeps the store private until enabled with a valid HTTPS URL', () => {
    expect(isPublicMerchStore(DEFAULT_MERCH_STORE_SETTINGS)).toBe(false);
    expect(isPublicMerchStore({ ...DEFAULT_MERCH_STORE_SETTINGS, storeEnabled: true })).toBe(false);
    expect(isPublicMerchStore({
      ...DEFAULT_MERCH_STORE_SETTINGS,
      storeEnabled: true,
      storeUrl: 'https://example-shop.fourthwall.com',
    })).toBe(true);
  });

  it('rejects enabling settings without a valid store URL', () => {
    const result = validateMerchStoreSettings({
      ...DEFAULT_MERCH_STORE_SETTINGS,
      storeEnabled: true,
      storeUrl: 'http://insecure.example.com',
    });
    expect(result.data).toBeNull();
    expect(result.fieldErrors.storeUrl).toContain('HTTPS');
  });

  it('applies safe external link attributes only when configured', () => {
    expect(merchExternalLinkProps(true)).toEqual({
      target: '_blank',
      rel: 'noopener noreferrer',
    });
    expect(merchExternalLinkProps(false)).toEqual({});
  });
});
