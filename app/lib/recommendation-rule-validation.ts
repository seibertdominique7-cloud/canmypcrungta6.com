import {
  PRODUCT_COMPONENT_TYPES,
  PRODUCT_VALUE_TIERS,
  type ProductValueTier,
} from './affiliate-types';
import type { RecommendationRuleInput } from './recommendation-rules-data';

const EXTRA_COMPONENT_TYPES = [
  'Gaming Desktop',
  'Prebuilt Laptop',
] as const;
const VALID_COMPONENT_TYPES = new Set<string>([
  ...PRODUCT_COMPONENT_TYPES,
  ...EXTRA_COMPONENT_TYPES,
]);
const VALID_TIERS = new Set<string>(PRODUCT_VALUE_TIERS);
const VALID_MODES = new Set(['AUTOMATIC', 'MANUAL']);
const VALID_SORT_ORDERS = new Set([
  'TIER_DIVERSITY',
  'COMPONENT_DIVERSITY',
  'ADMIN_ORDER',
]);
const VALID_LAYOUTS = new Set(['grid', 'horizontal', 'featured']);

export function validateRecommendationRuleInput(
  value: unknown,
): { data: RecommendationRuleInput | null; fieldErrors: Record<string, string> } {
  const input =
    typeof value === 'object' && value !== null
      ? value as Record<string, unknown>
      : {};
  const fieldErrors: Record<string, string> = {};
  const title = readText(input.title);
  const description = readText(input.description);
  const allowedComponentTypes = readStringArray(input.allowedComponentTypes);
  const fallbackComponentTypes = readStringArray(input.fallbackComponentTypes);
  const allowedValueTiers = readStringArray(input.allowedValueTiers);
  const tierPriority = readStringArray(input.tierPriority);
  const fallbackValueTiers = readStringArray(input.fallbackValueTiers);
  const maxProducts = Number(input.maxProducts);

  if (!title || title.length > 140) {
    fieldErrors.title = 'Enter a section title of 140 characters or fewer.';
  }
  if (!description || description.length > 500) {
    fieldErrors.description = 'Enter a description of 500 characters or fewer.';
  }
  if (!VALID_MODES.has(String(input.mode))) {
    fieldErrors.mode = 'Choose Automatic or Manual mode.';
  }
  if (!VALID_SORT_ORDERS.has(String(input.sortOrder))) {
    fieldErrors.sortOrder = 'Choose a valid sort order.';
  }
  if (!VALID_LAYOUTS.has(String(input.layout))) {
    fieldErrors.layout = 'Choose a valid layout.';
  }
  if (!Number.isInteger(maxProducts) || maxProducts < 0 || maxProducts > 12) {
    fieldErrors.maxProducts = 'Product limit must be between 0 and 12.';
  }
  if (![...allowedComponentTypes, ...fallbackComponentTypes].every(
    (item) => VALID_COMPONENT_TYPES.has(item),
  )) {
    fieldErrors.allowedComponentTypes = 'Choose valid component types.';
  }
  if (![...allowedValueTiers, ...tierPriority, ...fallbackValueTiers].every(
    (item) => VALID_TIERS.has(item),
  )) {
    fieldErrors.allowedValueTiers = 'Choose valid Value Tiers.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { data: null, fieldErrors };
  }

  return {
    data: {
      title,
      description,
      enabled: input.enabled !== false,
      mode: input.mode as RecommendationRuleInput['mode'],
      allowedComponentTypes,
      allowedValueTiers: allowedValueTiers as ProductValueTier[],
      tierPriority: tierPriority as ProductValueTier[],
      fallbackComponentTypes,
      fallbackValueTiers: fallbackValueTiers as ProductValueTier[],
      maxProducts,
      sortOrder: input.sortOrder as RecommendationRuleInput['sortOrder'],
      layout: input.layout as RecommendationRuleInput['layout'],
      collapsedByDefault: input.collapsedByDefault === true,
    },
    fieldErrors: {},
  };
}

function readText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? Array.from(
        new Set(
          value.filter(
            (item): item is string => typeof item === 'string' && item.length > 0,
          ),
        ),
      )
    : [];
}
