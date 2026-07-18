export const PREBUILT_RECOMMENDATION_GROUPS = [
  {
    code: 'PREBUILT_DESKTOP_BUDGET',
    displayName: 'Budget Desktop',
    heading: 'Budget Gaming Desktop',
    description: 'Value-focused desktop gaming PCs.',
    displayOrder: 10,
  },
  {
    code: 'PREBUILT_DESKTOP_HIGH_END',
    displayName: 'High-End Desktop',
    heading: 'High-End Gaming Desktop',
    description: 'Higher-performance desktop gaming PCs.',
    displayOrder: 20,
  },
  {
    code: 'PREBUILT_LAPTOP_BUDGET',
    displayName: 'Budget Laptop',
    heading: 'Budget Gaming Laptop',
    description: 'Portable gaming PCs at a more accessible price point.',
    displayOrder: 30,
  },
  {
    code: 'PREBUILT_LAPTOP_HIGH_END',
    displayName: 'High-End Laptop',
    heading: 'High-End Gaming Laptop',
    description: 'Premium portable gaming PCs.',
    displayOrder: 40,
  },
] as const;

export type PrebuiltRecommendationGroupCode =
  (typeof PREBUILT_RECOMMENDATION_GROUPS)[number]['code'];

const PREBUILT_GROUP_CODES = new Set<string>(
  PREBUILT_RECOMMENDATION_GROUPS.map((group) => group.code),
);

export function isPrebuiltRecommendationGroupCode(
  value: string,
): value is PrebuiltRecommendationGroupCode {
  return PREBUILT_GROUP_CODES.has(value);
}
