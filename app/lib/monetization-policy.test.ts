import { describe, expect, it } from 'vitest';

import {
  getInitialProductCardCount,
  allocateInitialProductCardLimits,
  isPassingRecommendationScenario,
  MAX_INITIAL_PRODUCT_CARDS,
} from './monetization-policy';

describe('results monetization policy', () => {
  it('shows game purchase links only for passing scenarios', () => {
    expect(isPassingRecommendationScenario('PASS_RECOMMENDED')).toBe(true);
    expect(isPassingRecommendationScenario('PASS_MINIMUM')).toBe(true);
    expect(isPassingRecommendationScenario('FAIL_GPU')).toBe(false);
    expect(isPassingRecommendationScenario('CANNOT_DETERMINE')).toBe(false);
  });

  it('never renders more than seven product cards initially', () => {
    expect(getInitialProductCardCount(3, 4, true)).toBe(7);
    expect(getInitialProductCardCount(99, 99, true)).toBe(MAX_INITIAL_PRODUCT_CARDS);
    expect(getInitialProductCardCount(3, 4, false)).toBe(3);
  });

  it('allocates the seven-card budget across database-driven sections', () => {
    const limits = allocateInitialProductCardLimits([
      { collapsedByDefault: false, productCount: 3 },
      { collapsedByDefault: false, productCount: 6 },
      { collapsedByDefault: true, productCount: 4 },
      { collapsedByDefault: false, productCount: 2 },
    ]);

    expect(limits).toEqual([3, 4, 0, 0]);
    expect(limits.reduce((total, count) => total + count, 0)).toBe(
      MAX_INITIAL_PRODUCT_CARDS,
    );
  });
});
