import { describe, expect, it } from 'vitest';

import {
  inspectAffiliateUrl,
  isPlaceholderAffiliateUrl,
  isPublicHttpsUrl,
  validateAffiliateLinkInput,
  validateGamePurchaseLinkInput,
  validateRecommendationSectionInput,
  validateScenarioInput,
} from './affiliate-validation';

const validLink = {
  title: 'RTX 4070',
  retailer: 'Amazon',
  affiliateUrl: 'https://www.amazon.com/dp/example?tag=my-tag-20',
  imageUrl: null,
  priceText: 'Check current price',
  badge: 'Performance Pick',
  shortDescription: 'A strong GPU upgrade.',
  buttonText: 'View on Amazon',
  componentType: 'GPU',
  enabled: true,
  platform: null,
  sectionId: 'section-1',
};

describe('affiliate validation', () => {
  it('accepts HTTPS and preserves the exact affiliate URL', () => {
    const result = validateAffiliateLinkInput(validLink);

    expect(result.errors).toEqual([]);
    expect(result.data?.affiliateUrl).toBe(validLink.affiliateUrl);
  });

  it('rejects non-HTTPS URLs and embedded credentials', () => {
    expect(inspectAffiliateUrl('http://example.com/product').errors).toContain(
      'Affiliate URL must use HTTPS.',
    );
    expect(inspectAffiliateUrl('https://user:secret@example.com/product').errors).toContain(
      'Affiliate URL cannot contain embedded credentials.',
    );
  });

  it('reports the retailer domain and warns about a missing Amazon tag', () => {
    const inspection = inspectAffiliateUrl('https://www.amazon.com/dp/example', 'Amazon');

    expect(inspection.domain).toBe('www.amazon.com');
    expect(inspection.warnings).toContain(
      'Amazon URL does not appear to contain an affiliate tag.',
    );
  });

  it('rejects leading or trailing URL spaces instead of silently rewriting them', () => {
    const url = ' https://example.com/product ';
    const result = validateAffiliateLinkInput({ ...validLink, affiliateUrl: url });

    expect(result.data).toBeNull();
    expect(result.errors).toContain(
      'Affiliate URL cannot contain leading or trailing spaces.',
    );
  });

  it('rejects unsupported select values', () => {
    const result = validateAffiliateLinkInput({
      ...validLink,
      retailer: 'Untrusted Retailer',
      badge: '<script>alert(1)</script>',
      componentType: 'HTML',
    });

    expect(result.data).toBeNull();
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Choose a valid retailer.',
        'Choose a valid badge.',
        'Choose a valid component type.',
      ]),
    );
  });

  it('strips control characters and enforces safe scenario codes', () => {
    const scenario = validateScenarioInput({
      code: 'custom<script>',
      displayName: 'Custom\u0000 name',
      resultHeading: 'Upgrade options',
      resultDescription: 'A custom result.',
      enabled: true,
    });

    expect(scenario.data).toBeNull();
    expect(scenario.errors[0]).toContain('Code must use');
  });

  it('validates editable section layout and display controls', () => {
    const section = validateRecommendationSectionInput({
      scenarioId: 'scenario-1',
      title: 'Budget Gaming Desktops',
      description: 'Complete value-focused systems.',
      enabled: true,
      maxProducts: 4,
      collapsedByDefault: true,
      layout: 'grid',
      purpose: 'PREBUILT',
    });

    expect(section.errors).toEqual([]);
    expect(section.data).toMatchObject({
      maxProducts: 4,
      collapsedByDefault: true,
      layout: 'grid',
      purpose: 'PREBUILT',
    });
  });

  it('validates game purchase records and warns before enabling a PC listing', () => {
    const result = validateGamePurchaseLinkInput({
      enabled: true,
      title: 'Ready for GTA VI?',
      description: 'View the official retailer listing.',
      platform: 'PC',
      retailer: 'Best Buy',
      affiliateUrl: 'https://www.bestbuy.com/site/gta-vi',
      buttonText: 'View GTA VI',
      imageUrl: null,
      releaseStatus: 'Coming Soon',
    });

    expect(result.errors).toEqual([]);
    expect(result.warnings).toContain(
      'Only enable a PC link after an official PC purchase or preorder listing exists.',
    );
  });

  it('rejects unsupported purchase platforms and release statuses', () => {
    const result = validateGamePurchaseLinkInput({
      enabled: true,
      title: 'Ready for GTA VI?',
      description: 'View the listing.',
      platform: 'Windows',
      retailer: 'Other',
      affiliateUrl: 'https://retailer.example/gta-vi',
      buttonText: 'View GTA VI',
      imageUrl: null,
      releaseStatus: 'Live now',
    });

    expect(result.errors).toEqual(
      expect.arrayContaining(['Choose a valid platform.', 'Choose a valid release status.']),
    );
  });

  it('never treats seeded placeholder URLs as public products', () => {
    expect(isPlaceholderAffiliateUrl('https://example.com/replace-me/test-product')).toBe(true);
    expect(isPublicHttpsUrl('https://example.com/replace-me/test-product')).toBe(false);
    expect(isPublicHttpsUrl('https://retailer.example/products/real-product')).toBe(true);
  });
});
