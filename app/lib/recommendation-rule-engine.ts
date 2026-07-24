import {
  PRODUCT_VALUE_TIER_ORDER,
  type CreatorDerivedCategory,
  type CreatorRuleDefinition,
  type RecommendationRuleComponentType,
  type RecommendationRuleMode,
  type RecommendationRuleSortOrder,
} from '../data/recommendation-rule-defaults';
import type { ProductValueTier } from './affiliate-types';
import { isPublicHttpsUrl } from './affiliate-validation';

export interface RuleEngineProduct {
  id: string;
  title: string;
  componentType: string;
  valueTier: string | null;
  affiliateUrl: string;
  imageUrl: string | null;
  enabled: boolean;
}

export interface RuleEngineRule {
  key: string;
  mode: RecommendationRuleMode;
  componentTypes: string[];
  valueTiers: ProductValueTier[];
  tierPriority: ProductValueTier[];
  fallbackComponentTypes: string[];
  fallbackValueTiers: ProductValueTier[];
  maxProducts: number;
  sortOrder: RecommendationRuleSortOrder;
}

export interface RuleEngineOverride {
  productId: string;
  action: 'PIN' | 'EXCLUDE';
  displayOrder: number;
  source: 'ASSIGNMENT' | 'OVERRIDE';
}

export interface SelectedRuleProduct<T extends RuleEngineProduct = RuleEngineProduct> {
  product: T;
  selectionSource: 'MANUAL' | 'AUTOMATIC';
  fallback: 'NONE' | 'NEAREST_TIER' | 'FALLBACK_COMPONENT';
}

export interface RuleSelectionResult<T extends RuleEngineProduct = RuleEngineProduct> {
  products: SelectedRuleProduct<T>[];
  eligibleProducts: number;
  invalidProducts: number;
  disabledProducts: number;
  missingComponentTypes: string[];
  fallbackUsed: Array<'NEAREST_TIER' | 'FALLBACK_COMPONENT'>;
}

export function selectProductsForRule<T extends RuleEngineProduct>(
  products: readonly T[],
  rule: RuleEngineRule,
  overrides: readonly RuleEngineOverride[] = [],
  seenProductIds: ReadonlySet<string> = new Set(),
): RuleSelectionResult<T> {
  const disabledProducts = products.filter((product) => !product.enabled).length;
  const invalidProducts = products.filter(
    (product) => product.enabled && !isPublicHttpsUrl(product.affiliateUrl),
  ).length;
  const publicProducts = products.filter(
    (product) => product.enabled && isPublicHttpsUrl(product.affiliateUrl),
  );
  const productsById = new Map(publicProducts.map((product) => [product.id, product]));
  const excluded = new Set(
    overrides.filter((override) => override.action === 'EXCLUDE').map((override) => override.productId),
  );
  const pinned = overrides
    .filter((override) => override.action === 'PIN')
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .flatMap((override) => {
      const product = productsById.get(override.productId);
      return product && !excluded.has(product.id) ? [product] : [];
    });
  const selected: SelectedRuleProduct<T>[] = [];
  const selectedIds = new Set<string>();

  for (const product of pinned) {
    if (selectedIds.has(product.id)) continue;
    selected.push({ product, selectionSource: 'MANUAL', fallback: 'NONE' });
    selectedIds.add(product.id);
    if (selected.length >= Math.max(0, rule.maxProducts)) break;
  }

  const exactEligible = publicProducts.filter(
    (product) =>
      !excluded.has(product.id) &&
      !selectedIds.has(product.id) &&
      !seenProductIds.has(product.id) &&
      rule.componentTypes.includes(product.componentType) &&
      isValueTierAllowed(product.valueTier, rule.valueTiers),
  );
  const missingComponentTypes = rule.componentTypes.filter(
    (componentType) =>
      !exactEligible.some((product) => product.componentType === componentType) &&
      !pinned.some((product) => product.componentType === componentType),
  );

  if (rule.mode === 'MANUAL' || selected.length >= Math.max(0, rule.maxProducts)) {
    return {
      products: selected,
      eligibleProducts: exactEligible.length,
      invalidProducts,
      disabledProducts,
      missingComponentTypes,
      fallbackUsed: [],
    };
  }

  appendAutomatic(
    selected,
    selectedIds,
    orderCandidates(exactEligible, rule, rule.tierPriority),
    rule.maxProducts,
    'NONE',
  );

  const fallbackUsed: RuleSelectionResult<T>['fallbackUsed'] = [];

  if (selected.length < rule.maxProducts) {
    const sameComponentFallback = publicProducts.filter(
      (product) =>
        !excluded.has(product.id) &&
        !selectedIds.has(product.id) &&
        !seenProductIds.has(product.id) &&
        rule.componentTypes.includes(product.componentType) &&
        !isValueTierAllowed(product.valueTier, rule.valueTiers),
    );
    const requestedFallbackTiers = sameComponentFallback.filter((product) =>
      isValueTierAllowed(product.valueTier, rule.fallbackValueTiers),
    );
    const nearestTiers =
      requestedFallbackTiers.length > 0
        ? requestedFallbackTiers
        : sameComponentFallback.sort(
            (left, right) =>
              tierDistance(left.valueTier, rule.valueTiers) -
              tierDistance(right.valueTier, rule.valueTiers),
          );
    const before = selected.length;
    appendAutomatic(
      selected,
      selectedIds,
      orderCandidates(nearestTiers, rule, [
        ...rule.fallbackValueTiers,
        ...PRODUCT_VALUE_TIER_ORDER,
      ]),
      rule.maxProducts,
      'NEAREST_TIER',
    );
    if (selected.length > before) fallbackUsed.push('NEAREST_TIER');
  }

  if (selected.length < rule.maxProducts && rule.fallbackComponentTypes.length > 0) {
    const fallbackComponents = publicProducts.filter(
      (product) =>
        !excluded.has(product.id) &&
        !selectedIds.has(product.id) &&
        !seenProductIds.has(product.id) &&
        rule.fallbackComponentTypes.includes(product.componentType) &&
        isValueTierAllowed(
          product.valueTier,
          rule.fallbackValueTiers.length > 0 ? rule.fallbackValueTiers : rule.valueTiers,
        ),
    );
    const before = selected.length;
    appendAutomatic(
      selected,
      selectedIds,
      orderCandidates(fallbackComponents, rule, [
        ...rule.tierPriority,
        ...rule.fallbackValueTiers,
      ]),
      rule.maxProducts,
      'FALLBACK_COMPONENT',
    );
    if (selected.length > before) fallbackUsed.push('FALLBACK_COMPONENT');
  }

  return {
    products: selected,
    eligibleProducts: exactEligible.length,
    invalidProducts,
    disabledProducts,
    missingComponentTypes,
    fallbackUsed,
  };
}

export function selectCreatorProducts<T extends RuleEngineProduct>(
  products: readonly T[],
  rule: CreatorRuleDefinition,
  seenProductIds: ReadonlySet<string> = new Set(),
): T[] {
  const candidates = products.filter((product) => {
    if (
      !product.enabled ||
      !isPublicHttpsUrl(product.affiliateUrl) ||
      seenProductIds.has(product.id) ||
      !isValueTierAllowed(product.valueTier, rule.valueTiers)
    ) {
      return false;
    }
    const componentMatch = rule.componentTypes.includes(
      product.componentType as RecommendationRuleComponentType,
    );
    const derivedMatch = deriveCreatorCategories(product).some((category) =>
      rule.derivedCategories.includes(category),
    );
    return componentMatch && (rule.derivedCategories.length === 0 || derivedMatch);
  });

  return orderCandidates(
    candidates,
    {
      key: rule.key,
      sortOrder: 'TIER_DIVERSITY',
    },
    rule.tierPriority,
  ).slice(0, rule.maxProducts);
}

export function deriveCreatorCategories(
  product: Pick<RuleEngineProduct, 'componentType' | 'title'>,
): CreatorDerivedCategory[] {
  if (product.componentType === 'Headset') return ['AUDIO'];
  if (product.componentType !== 'Other') return [];

  const normalized = product.title.toLowerCase();
  const categories: CreatorDerivedCategory[] = [];
  if (/\b(?:microphone|mic|headset|headphone|audio)\b/.test(normalized)) {
    categories.push('AUDIO');
  }
  if (/\b(?:webcam|camera|facecam)\b/.test(normalized)) categories.push('CAMERA');
  if (/\b(?:light|lighting|key light|ring light)\b/.test(normalized)) {
    categories.push('LIGHTING');
  }
  if (/\b(?:stream deck|stream controller|macro keys?)\b/.test(normalized)) {
    categories.push('STREAM_CONTROLLER');
  }
  if (/\b(?:mouse pad|ups|battery backup|capture card)\b/.test(normalized)) {
    categories.push('CREATOR_ACCESSORY');
  }
  return categories;
}

function appendAutomatic<T extends RuleEngineProduct>(
  selected: SelectedRuleProduct<T>[],
  selectedIds: Set<string>,
  candidates: readonly T[],
  maximum: number,
  fallback: SelectedRuleProduct['fallback'],
) {
  for (const product of candidates) {
    if (selected.length >= Math.max(0, maximum)) break;
    if (selectedIds.has(product.id)) continue;
    selected.push({ product, selectionSource: 'AUTOMATIC', fallback });
    selectedIds.add(product.id);
  }
}

function orderCandidates<T extends RuleEngineProduct>(
  candidates: readonly T[],
  rule: Pick<RuleEngineRule, 'key' | 'sortOrder'>,
  tierPriority: readonly ProductValueTier[],
): T[] {
  const priority = unique([
    ...tierPriority,
    ...PRODUCT_VALUE_TIER_ORDER,
  ]);
  const prepared = [...candidates].sort((left, right) => {
    const qualityDifference = Number(Boolean(right.imageUrl)) - Number(Boolean(left.imageUrl));
    if (qualityDifference !== 0) return qualityDifference;
    const tierDifference =
      tierIndex(left.valueTier, priority) - tierIndex(right.valueTier, priority);
    if (tierDifference !== 0) return tierDifference;
    const specializedDifference =
      specializedTitleRank(left, rule.key) - specializedTitleRank(right, rule.key);
    if (specializedDifference !== 0) return specializedDifference;
    return left.title.localeCompare(right.title);
  });

  if (rule.key.includes('storage')) {
    return roundRobin(prepared, (product) => storageCapacityGroup(product.title));
  }
  if (rule.sortOrder === 'COMPONENT_DIVERSITY') {
    return roundRobin(prepared, (product) => product.componentType);
  }
  if (rule.sortOrder === 'TIER_DIVERSITY') {
    return roundRobin(prepared, (product) => product.valueTier ?? 'Unranked');
  }
  return prepared;
}

function roundRobin<T>(items: readonly T[], groupKey: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = groupKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const result: T[] = [];
  let offset = 0;
  while (result.length < items.length) {
    let added = false;
    for (const group of groups.values()) {
      const item = group[offset];
      if (item) {
        result.push(item);
        added = true;
      }
    }
    if (!added) break;
    offset += 1;
  }
  return result;
}

function specializedTitleRank(product: RuleEngineProduct, ruleKey: string) {
  if (ruleKey.includes('ram')) {
    if (/\b32\s*gb\b/i.test(product.title)) return 0;
    if (/\b64\s*gb\b/i.test(product.title)) return 2;
    return 1;
  }
  return 0;
}

function storageCapacityGroup(title: string) {
  if (/\b1\s*tb\b/i.test(title)) return '1-1tb';
  if (/\b2\s*tb\b/i.test(title)) return '2-2tb';
  return '3-other';
}

function isValueTierAllowed(value: string | null, allowed: readonly ProductValueTier[]) {
  return value !== null && allowed.includes(value as ProductValueTier);
}

function tierDistance(value: string | null, targets: readonly ProductValueTier[]) {
  const valueIndex = PRODUCT_VALUE_TIER_ORDER.indexOf(value as ProductValueTier);
  if (valueIndex < 0 || targets.length === 0) return Number.MAX_SAFE_INTEGER;
  return Math.min(
    ...targets.map((target) =>
      Math.abs(PRODUCT_VALUE_TIER_ORDER.indexOf(target) - valueIndex),
    ),
  );
}

function tierIndex(value: string | null, priority: readonly ProductValueTier[]) {
  const index = priority.indexOf(value as ProductValueTier);
  return index < 0 ? priority.length : index;
}

function unique<T>(values: readonly T[]) {
  return Array.from(new Set(values));
}
