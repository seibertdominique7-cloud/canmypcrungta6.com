export const MAX_PRIMARY_RECOMMENDATIONS = 3;
export const MAX_PREBUILT_CATEGORIES = 4;
export const MAX_INITIAL_PRODUCT_CARDS = 7;

interface SectionCardAllocationInput {
  collapsedByDefault: boolean;
  productCount: number;
}

export function isPassingRecommendationScenario(code: string) {
  return code === 'PASS_RECOMMENDED' || code === 'PASS_MINIMUM';
}

export function getInitialProductCardCount(
  primaryCount: number,
  enabledPrebuiltCategoryCount: number,
  prebuiltSectionOpen: boolean,
) {
  const primary = Math.min(MAX_PRIMARY_RECOMMENDATIONS, Math.max(0, primaryCount));
  const prebuilt = prebuiltSectionOpen
    ? Math.min(MAX_PREBUILT_CATEGORIES, Math.max(0, enabledPrebuiltCategoryCount))
    : 0;
  return Math.min(MAX_INITIAL_PRODUCT_CARDS, primary + prebuilt);
}

export function allocateInitialProductCardLimits(
  sections: readonly SectionCardAllocationInput[],
) {
  return sections.reduce<{ limits: number[]; remaining: number }>(
    (state, section) => {
      const limit = section.collapsedByDefault
        ? 0
        : Math.min(Math.max(0, section.productCount), state.remaining);
      return {
        limits: [...state.limits, limit],
        remaining: state.remaining - limit,
      };
    },
    { limits: [], remaining: MAX_INITIAL_PRODUCT_CARDS },
  ).limits;
}
