import { describe, expect, it } from 'vitest';

import {
  canonicalizeProductName,
  validateAssignmentInput,
  validateProductInput,
} from './catalog-validation';

describe('catalog product validation', () => {
  it('accepts the required catalog fields and preserves the exact affiliate URL', () => {
    const affiliateUrl = 'https://www.amazon.com/dp/B012345678?tag=my-tag-20&ref_=exact';
    const result = validateProductInput({
      title: 'NVIDIA GeForce RTX 4070',
      componentType: 'GPU',
      affiliateUrl,
      retailer: 'Amazon',
      valueTier: 'Best Value',
      enabled: true,
    });

    expect(result.fieldErrors).toEqual({});
    expect(result.data).toMatchObject({
      title: 'NVIDIA GeForce RTX 4070',
      componentType: 'GPU',
      affiliateUrl,
      retailer: 'Amazon',
      valueTier: 'Best Value',
      shortDescription: '',
      defaultPriceText: 'Check Current Price',
    });
  });

  it('accepts an unset value tier and rejects labels outside the permanent list', () => {
    const unset = validateProductInput({
      title: 'RTX 4070',
      componentType: 'GPU',
      affiliateUrl: 'https://example.net/product',
      valueTier: null,
    });
    const invalid = validateProductInput({
      title: 'RTX 4070',
      componentType: 'GPU',
      affiliateUrl: 'https://example.net/product',
      valueTier: 'Entry Level',
    });

    expect(unset.fieldErrors).toEqual({});
    expect(unset.data?.valueTier).toBeNull();
    expect(invalid.fieldErrors.valueTier).toBe('Choose a valid value tier.');
  });

  it('rejects non-HTTPS affiliate URLs and warns about a likely missing Amazon tag', () => {
    const invalid = validateProductInput({
      title: 'RTX 4070',
      componentType: 'GPU',
      affiliateUrl: 'http://example.net/product',
    });
    const amazon = validateProductInput({
      title: 'RTX 4070',
      componentType: 'GPU',
      affiliateUrl: 'https://www.amazon.com/dp/B012345678',
      retailer: 'Amazon',
    });

    expect(invalid.fieldErrors.affiliateUrl).toContain('HTTPS');
    expect(amazon.warnings[0]).toContain('affiliate tag');
  });

  it('creates a stable canonical name without changing the displayed title', () => {
    expect(canonicalizeProductName('  NVIDIA   RTX 4070  ')).toBe('nvidia rtx 4070');
  });
});

describe('recommendation assignment validation', () => {
  it('accepts multiple products and multiple destination sections', () => {
    const result = validateAssignmentInput({
      productIds: ['product-a', 'product-b'],
      sectionIds: ['section-a', 'section-b'],
      badge: 'Performance Pick',
      buttonText: 'Check Current Price',
      overridePriceText: '$499',
      overrideDescription: 'Scenario-specific copy.',
      enabled: true,
      displayOrder: 15,
    });

    expect(result.fieldErrors).toEqual({});
    expect(result.data?.productIds).toEqual(['product-a', 'product-b']);
    expect(result.data?.sectionIds).toEqual(['section-a', 'section-b']);
    expect(result.data?.badge).toBe('Performance Pick');
    expect(result.data?.displayOrder).toBe(15);
  });

  it('requires both a product and a destination section', () => {
    const result = validateAssignmentInput({
      productIds: [],
      sectionIds: [],
      badge: 'None',
      buttonText: 'View Product',
    });

    expect(result.fieldErrors.productIds).toBeTruthy();
    expect(result.fieldErrors.sectionIds).toBeTruthy();
  });
});
