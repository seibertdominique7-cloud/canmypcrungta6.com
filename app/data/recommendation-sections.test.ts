import { describe, expect, it } from 'vitest';

import { CORE_RECOMMENDATION_SCENARIOS } from './recommendation-scenarios';
import { DEFAULT_RECOMMENDATION_SECTIONS } from './recommendation-sections';

describe('default recommendation sections', () => {
  it('gives every compatibility-result scenario at least one editable section', () => {
    for (const scenario of CORE_RECOMMENDATION_SCENARIOS) {
      expect(DEFAULT_RECOMMENDATION_SECTIONS[scenario.code]?.length).toBeGreaterThan(0);
    }
  });

  it('creates game-purchase sections only for passing scenarios', () => {
    const purchaseScenarios = Object.entries(DEFAULT_RECOMMENDATION_SECTIONS)
      .filter(([, sections]) =>
        sections.some((section) => section.purpose === 'GAME_PURCHASE'),
      )
      .map(([code]) => code);

    expect(purchaseScenarios).toEqual(['PASS_RECOMMENDED', 'PASS_MINIMUM']);
  });

  it('includes all four prebuilt categories as normal editable sections', () => {
    const sectionTitles = new Set(
      Object.values(DEFAULT_RECOMMENDATION_SECTIONS)
        .flat()
        .map((section) => section.title),
    );

    expect(sectionTitles.has('Budget Gaming Desktops')).toBe(true);
    expect(sectionTitles.has('High-End Gaming Desktops')).toBe(true);
    expect(sectionTitles.has('Budget Gaming Laptops')).toBe(true);
    expect(sectionTitles.has('High-End Gaming Laptops')).toBe(true);
  });
});
