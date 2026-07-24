import { describe, expect, it } from 'vitest';

import {
  PRODUCT_VALUE_TIER_ORDER,
  RECOMMENDATION_LAUNCH_RULES,
  getCreatorLaunchRules,
} from '../data/recommendation-rule-defaults';
import { CORE_RECOMMENDATION_SCENARIOS } from '../data/recommendation-scenarios';
import {
  deriveCreatorCategories,
  selectCreatorProducts,
  selectProductsForRule,
  type RuleEngineProduct,
  type RuleEngineRule,
} from './recommendation-rule-engine';

const baseRule: RuleEngineRule = {
  key: 'gpu-upgrades',
  mode: 'AUTOMATIC',
  componentTypes: ['GPU'],
  valueTiers: ['Budget', 'Best Value'],
  tierPriority: ['Budget', 'Best Value'],
  fallbackComponentTypes: [],
  fallbackValueTiers: ['Recommended'],
  maxProducts: 3,
  sortOrder: 'TIER_DIVERSITY',
};

describe('recommendation rule selection', () => {
  it('uses only enabled products with valid HTTPS affiliate URLs', () => {
    const result = selectProductsForRule([
      product('valid', 'GPU', 'Budget'),
      product('disabled', 'GPU', 'Best Value', { enabled: false }),
      product('example', 'GPU', 'Best Value', {
        affiliateUrl: 'https://example.com/fake',
      }),
      product('missing', 'GPU', 'Best Value', { affiliateUrl: '' }),
    ], baseRule);

    expect(result.products.map((item) => item.product.id)).toEqual(['valid']);
    expect(result.disabledProducts).toBe(1);
    expect(result.invalidProducts).toBe(2);
  });

  it('honors pins and exclusions before automatic products', () => {
    const result = selectProductsForRule(
      [
        product('budget', 'GPU', 'Budget'),
        product('value', 'GPU', 'Best Value'),
        product('premium-pin', 'GPU', 'Premium'),
      ],
      baseRule,
      [
        { productId: 'premium-pin', action: 'PIN', displayOrder: 0, source: 'OVERRIDE' },
        { productId: 'budget', action: 'EXCLUDE', displayOrder: 0, source: 'OVERRIDE' },
      ],
    );

    expect(result.products.map((item) => item.product.id)).toEqual([
      'premium-pin',
      'value',
    ]);
    expect(result.products[0].selectionSource).toBe('MANUAL');
  });

  it('uses the configured nearest tier fallback without guessing URLs', () => {
    const result = selectProductsForRule(
      [product('recommended', 'GPU', 'Recommended')],
      baseRule,
    );

    expect(result.products[0].product.id).toBe('recommended');
    expect(result.products[0].fallback).toBe('NEAREST_TIER');
    expect(result.fallbackUsed).toEqual(['NEAREST_TIER']);
  });

  it('does not repeat products selected by an earlier automatic section', () => {
    const result = selectProductsForRule(
      [product('seen', 'GPU', 'Budget'), product('next', 'GPU', 'Best Value')],
      { ...baseRule, maxProducts: 1 },
      [],
      new Set(['seen']),
    );
    expect(result.products.map((item) => item.product.id)).toEqual(['next']);
  });

  it('puts a 32 GB RAM kit before a 64 GB kit', () => {
    const result = selectProductsForRule(
      [
        product('64', 'RAM', 'Best Value', { title: '64GB DDR5 Memory Kit' }),
        product('32', 'RAM', 'Best Value', { title: '32GB DDR5 Memory Kit' }),
      ],
      {
        ...baseRule,
        key: 'ram-upgrades',
        componentTypes: ['RAM'],
        maxProducts: 2,
      },
    );
    expect(result.products.map((item) => item.product.id)).toEqual(['32', '64']);
  });

  it('includes both 1 TB and 2 TB storage options when available', () => {
    const result = selectProductsForRule(
      [
        product('one-a', 'Storage', 'Budget', { title: 'Fast 1TB SSD' }),
        product('one-b', 'Storage', 'Best Value', { title: 'Value 1TB SSD' }),
        product('two', 'Storage', 'Best Value', { title: 'Fast 2TB SSD' }),
      ],
      {
        ...baseRule,
        key: 'storage-upgrades',
        componentTypes: ['Storage'],
        maxProducts: 2,
      },
    );
    expect(result.products.map((item) => item.product.id)).toContain('two');
    expect(result.products.some((item) => item.product.title.includes('1TB'))).toBe(true);
  });
});

describe('launch defaults', () => {
  it('defines intentional rules for all 15 compatibility scenarios', () => {
    expect(Object.keys(RECOMMENDATION_LAUNCH_RULES)).toEqual(
      CORE_RECOMMENDATION_SCENARIOS.map((scenario) => scenario.code),
    );
    for (const scenario of CORE_RECOMMENDATION_SCENARIOS) {
      expect(RECOMMENDATION_LAUNCH_RULES[scenario.code].length).toBeGreaterThan(0);
      for (const rule of RECOMMENDATION_LAUNCH_RULES[scenario.code]) {
        expect(rule.maxProducts).toBeGreaterThanOrEqual(0);
        expect(rule.maxProducts).toBeLessThanOrEqual(6);
      }
    }
  });

  it('keeps the required Value Tier order centralized', () => {
    expect(PRODUCT_VALUE_TIER_ORDER).toEqual([
      'Minimum',
      'Budget',
      'Best Value',
      'Recommended',
      'Performance',
      'Premium',
    ]);
  });

  it('uses cautious creator fallbacks for unresolved scenarios', () => {
    for (const code of [
      'UNKNOWN_GPU',
      'UNKNOWN_CPU',
      'UNKNOWN_RAM',
      'UNKNOWN_STORAGE',
      'CANNOT_DETERMINE',
    ] as const) {
      expect(getCreatorLaunchRules(code)).toEqual([]);
    }
  });
});

describe('creator product groups', () => {
  it('derives creator categories conservatively from Other products', () => {
    expect(deriveCreatorCategories(product('mic', 'Other', 'Best Value', {
      title: 'USB Streaming Microphone',
    }))).toContain('AUDIO');
    expect(deriveCreatorCategories(product('gpu', 'GPU', 'Best Value'))).toEqual([]);
  });

  it('selects matching creator products without duplicates', () => {
    const rule = getCreatorLaunchRules('PASS_RECOMMENDED')[0];
    const selected = selectCreatorProducts(
      [
        product('headset', 'Headset', 'Best Value'),
        product('mic', 'Other', 'Recommended', { title: 'USB Microphone' }),
        product('camera', 'Other', 'Recommended', { title: '4K Webcam' }),
      ],
      rule,
      new Set(['headset']),
    );
    expect(selected.map((item) => item.id)).toEqual(['mic']);
  });
});

function product(
  id: string,
  componentType: string,
  valueTier: string,
  overrides: Partial<RuleEngineProduct> = {},
): RuleEngineProduct {
  return {
    id,
    title: `${id} product`,
    componentType,
    valueTier,
    affiliateUrl: `https://retailer.test/${id}`,
    imageUrl: `https://images.test/${id}.png`,
    enabled: true,
    ...overrides,
  };
}
