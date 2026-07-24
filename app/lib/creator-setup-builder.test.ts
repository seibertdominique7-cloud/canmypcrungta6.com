import { describe, expect, it } from 'vitest';

import type { ProductRecord } from './affiliate-types';
import {
  buildCreatorSetupPlan,
  isCreatorSetupProduct,
  type CreatorSetupAnswers,
} from './creator-setup-builder';

const defaultAnswers: CreatorSetupAnswers = {
  budget: '250_500',
  ownedGear: ['GAMING_PC'],
  goal: 'STREAM_GAMEPLAY',
  priority: 'BALANCED',
};

describe('creator setup builder', () => {
  it('uses only enabled products with valid URLs and matching value tiers', () => {
    const plan = buildCreatorSetupPlan([
      product('mic', 'FIFINE USB Microphone', 'Other', 'Budget'),
      product('disabled', 'Disabled Webcam', 'Other', 'Budget', { enabled: false }),
      product('invalid', 'Invalid Stream Deck', 'Other', 'Best Value', {
        affiliateUrl: 'https://example.com/product',
      }),
      product('premium', 'Premium Webcam', 'Other', 'Premium'),
    ], defaultAnswers);

    expect(allIds(plan)).toEqual(['mic']);
  });

  it('does not recommend gear the user already owns', () => {
    const plan = buildCreatorSetupPlan([
      product('mic', 'USB Microphone for Streaming', 'Other', 'Budget'),
      product('camera', '1080p Webcam Camera', 'Other', 'Best Value'),
      product('monitor', 'Second Monitor', 'Monitor', 'Best Value'),
    ], {
      ...defaultAnswers,
      ownedGear: ['GAMING_PC', 'MICROPHONE', 'SECOND_MONITOR'],
    });

    expect(allIds(plan)).toEqual(['camera']);
  });

  it('does not place expensive component categories in an under-$100 plan', () => {
    const plan = buildCreatorSetupPlan([
      product('gpu', 'Budget Graphics Card', 'GPU', 'Minimum'),
      product('mic', 'Budget USB Microphone', 'Other', 'Budget'),
      product('storage', '512GB NVMe SSD', 'Storage', 'Minimum'),
    ], {
      ...defaultAnswers,
      budget: 'UNDER_100',
    });

    expect(allIds(plan)).toEqual(['mic', 'storage']);
  });

  it('prioritizes PC parts for a performance-first setup without duplicating products', () => {
    const plan = buildCreatorSetupPlan([
      product('gpu', 'RTX Graphics Card', 'GPU', 'Recommended'),
      product('storage', '2TB NVMe SSD', 'Storage', 'Best Value'),
      product('mic', 'USB Microphone for Streaming', 'Other', 'Budget'),
      product('camera', '1080p Webcam Camera', 'Other', 'Best Value'),
    ], {
      budget: '500_1000',
      ownedGear: ['GAMING_PC'],
      goal: 'EDIT_VIDEO',
      priority: 'PC_PERFORMANCE',
    });

    expect(plan.essentials[0]?.id).toBe('storage');
    expect(new Set(allIds(plan)).size).toBe(allIds(plan).length);
  });

  it('identifies only creator-relevant catalog products', () => {
    expect(isCreatorSetupProduct(product('mic', 'USB Microphone', 'Other', 'Budget'))).toBe(true);
    expect(isCreatorSetupProduct(product('mouse', 'Gaming Mouse', 'Mouse', 'Budget'))).toBe(false);
  });

  it('returns a safe empty plan when no products qualify', () => {
    const plan = buildCreatorSetupPlan([], defaultAnswers);

    expect(plan.essentials).toEqual([]);
    expect(plan.nextUpgrades).toEqual([]);
    expect(plan.futureUpgrades).toEqual([]);
    expect(plan.setupOrder.length).toBeGreaterThan(0);
  });
});

function product(
  id: string,
  title: string,
  componentType: ProductRecord['componentType'],
  valueTier: ProductRecord['valueTier'],
  overrides: Partial<ProductRecord> = {},
): ProductRecord {
  return {
    id,
    title,
    canonicalName: title.toLowerCase(),
    componentType,
    shortDescription: `${title} description`,
    imageUrl: null,
    retailer: 'Amazon',
    affiliateUrl: `https://amazon.com/dp/${id}`,
    defaultPriceText: 'Check Current Price',
    platform: null,
    valueTier,
    enabled: true,
    usage: [],
    createdAt: '2026-07-23T00:00:00.000Z',
    updatedAt: '2026-07-23T00:00:00.000Z',
    ...overrides,
  };
}

function allIds(plan: ReturnType<typeof buildCreatorSetupPlan>) {
  return [...plan.essentials, ...plan.nextUpgrades, ...plan.futureUpgrades]
    .map((item) => item.id);
}
