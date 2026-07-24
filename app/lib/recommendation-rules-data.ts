import 'server-only';

import type {
  Product,
  CreatorRecommendationRule,
  RecommendationAssignment,
  RecommendationRule,
  RecommendationRuleOverride,
} from '../../generated/prisma/client';
import {
  getCreatorLaunchRules,
  getCreatorRuleId,
  getRecommendationRuleId,
  RECOMMENDATION_LAUNCH_RULES,
  type CreatorRuleDefinition,
  type CreatorDerivedCategory,
  type RecommendationRuleComponentType,
  type RecommendationRuleDefinition,
} from '../data/recommendation-rule-defaults';
import {
  CORE_RECOMMENDATION_SCENARIOS,
  isCoreRecommendationScenarioCode,
  type CoreRecommendationScenarioCode,
} from '../data/recommendation-scenarios';
import type {
  ProductRecord,
  ProductValueTier,
  RecommendationRuleMode,
  RecommendationRuleRecord,
  RecommendationRuleSortOrder,
  RecommendationSectionLayout,
  RecommendationSectionPurpose,
} from './affiliate-types';
import { isPublicHttpsUrl } from './affiliate-validation';
import { AdminDataError } from './admin-data-error';
import {
  selectProductsForRule,
  selectCreatorProducts,
  type RuleEngineOverride,
} from './recommendation-rule-engine';
import { prisma } from './prisma';

type RuleWithRelations = RecommendationRule & {
  overrides: Array<RecommendationRuleOverride & { product: Product }>;
};

export interface RecommendationRuleInput {
  title: string;
  description: string;
  enabled: boolean;
  mode: RecommendationRuleMode;
  allowedComponentTypes: string[];
  allowedValueTiers: ProductValueTier[];
  tierPriority: ProductValueTier[];
  fallbackComponentTypes: string[];
  fallbackValueTiers: ProductValueTier[];
  maxProducts: number;
  sortOrder: RecommendationRuleSortOrder;
  layout: RecommendationSectionLayout;
  collapsedByDefault: boolean;
}

export interface LaunchDefaultsPreview {
  scenarios: Array<{
    code: CoreRecommendationScenarioCode;
    rulesToCreate: number;
    rulesToUpdate: number;
    manualRulesProtected: number;
    creatorRulesToCreate: number;
    creatorRulesToUpdate: number;
    manualCreatorRulesProtected: number;
  }>;
}

export interface ScenarioAudit {
  scenario: CoreRecommendationScenarioCode;
  status: 'Automatic' | 'Manual Override' | 'Incomplete';
  sectionsRendered: string[];
  productsSelected: number;
  selectedValueTiers: ProductValueTier[];
  fallbacksUsed: string[];
  missingComponentTypes: string[];
  creatorGroupsRendered: string[];
  emptyRules: string[];
  disabledProductsReferenced: string[];
  invalidProductsReferenced: string[];
  productsMissingImages: string[];
  duplicateProducts: string[];
  sectionsExceedingLimits: string[];
}

export interface RecommendationAuditReport {
  generatedAt: string;
  scenarios: ScenarioAudit[];
  summary: {
    emptyScenarios: number;
    emptyRules: number;
    disabledReferences: number;
    invalidReferences: number;
    missingImages: number;
    duplicateProducts: number;
    sectionsExceedingLimits: number;
  };
}

export function parseRuleArray(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function toEngineRule(rule: RecommendationRule) {
  return {
    key: rule.key,
    mode: normalizeRuleMode(rule.mode),
    componentTypes: parseRuleArray(rule.allowedComponentTypes),
    valueTiers: parseRuleArray(rule.allowedValueTiers) as ProductValueTier[],
    tierPriority: parseRuleArray(rule.tierPriority) as ProductValueTier[],
    fallbackComponentTypes: parseRuleArray(rule.fallbackComponentTypes),
    fallbackValueTiers: parseRuleArray(rule.fallbackValueTiers) as ProductValueTier[],
    maxProducts: Math.max(0, rule.maxProducts),
    sortOrder: normalizeSortOrder(rule.sortOrder),
  };
}

export function toRuleOverrides(
  rule: RuleWithRelations,
  assignments: readonly RecommendationAssignment[],
): RuleEngineOverride[] {
  const assignmentOverrides = assignments
    .filter((assignment) => assignment.sectionId === rule.sourceSectionId)
    .map((assignment) => ({
      productId: assignment.productId,
      action: assignment.enabled ? 'PIN' as const : 'EXCLUDE' as const,
      displayOrder: assignment.displayOrder,
      source: 'ASSIGNMENT' as const,
    }));
  const explicitOverrides = rule.overrides.map((override) => ({
    productId: override.productId,
    action: override.action === 'PIN' ? 'PIN' as const : 'EXCLUDE' as const,
    displayOrder: override.displayOrder,
    source: 'OVERRIDE' as const,
  }));

  return deduplicateOverrides([...assignmentOverrides, ...explicitOverrides]);
}

export function selectRuleProducts(
  products: readonly Product[],
  rule: RuleWithRelations,
  assignments: readonly RecommendationAssignment[],
  seenProductIds: ReadonlySet<string> = new Set(),
) {
  return selectProductsForRule(
    products,
    toEngineRule(rule),
    toRuleOverrides(rule, assignments),
    seenProductIds,
  );
}

export function serializeRecommendationRule(
  rule: RuleWithRelations,
  products: readonly Product[],
  assignments: readonly RecommendationAssignment[],
): RecommendationRuleRecord {
  const selection = selectRuleProducts(products, rule, assignments);
  return {
    id: rule.id,
    scenarioId: rule.scenarioId,
    key: rule.key,
    title: rule.title,
    description: rule.description,
    enabled: rule.enabled,
    displayOrder: rule.displayOrder,
    mode: normalizeRuleMode(rule.mode),
    allowedComponentTypes: parseRuleArray(rule.allowedComponentTypes),
    allowedValueTiers: parseRuleArray(rule.allowedValueTiers) as ProductValueTier[],
    tierPriority: parseRuleArray(rule.tierPriority) as ProductValueTier[],
    fallbackComponentTypes: parseRuleArray(rule.fallbackComponentTypes),
    fallbackValueTiers: parseRuleArray(rule.fallbackValueTiers) as ProductValueTier[],
    maxProducts: rule.maxProducts,
    sortOrder: normalizeSortOrder(rule.sortOrder),
    layout: normalizeLayout(rule.layout),
    purpose: normalizePurpose(rule.purpose),
    collapsedByDefault: rule.collapsedByDefault,
    emptyStateTitle: rule.emptyStateTitle,
    emptyStateDescription: rule.emptyStateDescription,
    emptyCtaLabel: rule.emptyCtaLabel,
    emptyCtaUrl: rule.emptyCtaUrl,
    sourceSectionId: rule.sourceSectionId,
    source: rule.source === 'MANUAL' ? 'MANUAL' : 'LAUNCH_DEFAULT',
    overrides: rule.overrides.map((override) => ({
      id: override.id,
      productId: override.productId,
      action: override.action === 'PIN' ? 'PIN' : 'EXCLUDE',
      displayOrder: override.displayOrder,
      product: serializeProduct(override.product),
    })),
    previewProducts: selection.products.map((selected) => serializeProduct(selected.product)),
    summary: {
      eligibleProducts: selection.eligibleProducts,
      selectedProducts: selection.products.length,
      missingComponentTypes: selection.missingComponentTypes,
      invalidProducts: selection.invalidProducts,
      disabledProducts: selection.disabledProducts,
      fallbacksUsed: selection.fallbackUsed,
    },
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

export async function getLaunchDefaultsPreview(): Promise<LaunchDefaultsPreview> {
  const scenarios = await prisma.recommendationScenario.findMany({
    where: {
      groupType: 'SCENARIO',
      code: { in: CORE_RECOMMENDATION_SCENARIOS.map((scenario) => scenario.code) },
    },
    include: { recommendationRules: true, creatorRules: true },
  });

  const preview: LaunchDefaultsPreview['scenarios'] = [];
  for (const scenario of scenarios) {
    if (!isCoreRecommendationScenarioCode(scenario.code)) continue;
    const code = scenario.code;
    const defaults = RECOMMENDATION_LAUNCH_RULES[code];
    const creatorDefaults = getCreatorLaunchRules(code);
        const rulesByKey = new Map(scenario.recommendationRules.map((item) => [item.key, item]));
        const creatorRulesByKey = new Map(scenario.creatorRules.map((item) => [item.key, item]));
    preview.push({
          code,
          rulesToCreate: defaults.filter((item) => !rulesByKey.has(item.key)).length,
          rulesToUpdate: defaults.filter((item) => {
            const existing = rulesByKey.get(item.key);
            return existing && existing.source !== 'MANUAL';
          }).length,
          manualRulesProtected: defaults.filter(
            (item) => rulesByKey.get(item.key)?.source === 'MANUAL',
          ).length,
          creatorRulesToCreate: creatorDefaults.filter(
            (item) => !creatorRulesByKey.has(item.key),
          ).length,
          creatorRulesToUpdate: creatorDefaults.filter((item) => {
            const existing = creatorRulesByKey.get(item.key);
            return existing && existing.source !== 'MANUAL';
          }).length,
          manualCreatorRulesProtected: creatorDefaults.filter(
            (item) => creatorRulesByKey.get(item.key)?.source === 'MANUAL',
          ).length,
    });
  }
  return { scenarios: preview };
}

export async function applyLaunchDefaults(
  scenarioCodes: readonly CoreRecommendationScenarioCode[],
  overwriteManual = false,
) {
  const selectedCodes = Array.from(new Set(scenarioCodes)).filter(
    isCoreRecommendationScenarioCode,
  );
  if (selectedCodes.length === 0) {
    throw new AdminDataError('Choose at least one scenario.', 400);
  }
  const scenarios = await prisma.recommendationScenario.findMany({
    where: { code: { in: selectedCodes }, groupType: 'SCENARIO' },
    include: { recommendationRules: true, creatorRules: true },
  });
  let created = 0;
  let updated = 0;
  let protectedManual = 0;

  await prisma.$transaction(async (transaction) => {
    for (const scenario of scenarios) {
      if (!isCoreRecommendationScenarioCode(scenario.code)) continue;
      const rulesByKey = new Map(scenario.recommendationRules.map((item) => [item.key, item]));
      for (const [index, definition] of RECOMMENDATION_LAUNCH_RULES[
        scenario.code
      ].entries()) {
        const existing = rulesByKey.get(definition.key);
        if (existing?.source === 'MANUAL' && !overwriteManual) {
          protectedManual += 1;
          continue;
        }
        await transaction.recommendationRule.upsert({
          where: {
            scenarioId_key: { scenarioId: scenario.id, key: definition.key },
          },
          update: toRuleData(definition, (index + 1) * 10),
          create: {
            id: getRecommendationRuleId(scenario.code, definition.key),
            scenarioId: scenario.id,
            key: definition.key,
            ...toRuleData(definition, (index + 1) * 10),
          },
        });
        if (existing) updated += 1;
        else created += 1;
      }

      const creatorRulesByKey = new Map(
        scenario.creatorRules.map((item) => [item.key, item]),
      );
      for (const [index, definition] of getCreatorLaunchRules(scenario.code).entries()) {
        const existing = creatorRulesByKey.get(definition.key);
        if (existing?.source === 'MANUAL' && !overwriteManual) {
          protectedManual += 1;
          continue;
        }
        await transaction.creatorRecommendationRule.upsert({
          where: {
            scenarioId_key: { scenarioId: scenario.id, key: definition.key },
          },
          update: toCreatorRuleData(definition, (index + 1) * 10),
          create: {
            id: getCreatorRuleId(scenario.code, definition.key),
            scenarioId: scenario.id,
            key: definition.key,
            ...toCreatorRuleData(definition, (index + 1) * 10),
          },
        });
        if (existing) updated += 1;
        else created += 1;
      }
    }
  });

  return { created, updated, protectedManual };
}

export async function updateRecommendationRule(
  id: string,
  input: RecommendationRuleInput,
) {
  await prisma.recommendationRule.findUniqueOrThrow({ where: { id } });
  return prisma.recommendationRule.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description,
      enabled: input.enabled,
      mode: input.mode,
      allowedComponentTypes: JSON.stringify(input.allowedComponentTypes),
      allowedValueTiers: JSON.stringify(input.allowedValueTiers),
      tierPriority: JSON.stringify(input.tierPriority),
      fallbackComponentTypes: JSON.stringify(input.fallbackComponentTypes),
      fallbackValueTiers: JSON.stringify(input.fallbackValueTiers),
      maxProducts: input.maxProducts,
      sortOrder: input.sortOrder,
      layout: input.layout,
      collapsedByDefault: input.collapsedByDefault,
      source: 'MANUAL',
    },
  });
}

export async function resetRecommendationRule(id: string) {
  const existing = await prisma.recommendationRule.findUniqueOrThrow({
    where: { id },
    include: { scenario: { select: { code: true } } },
  });
  if (!isCoreRecommendationScenarioCode(existing.scenario.code)) {
    throw new AdminDataError('Only core scenario rules have launch defaults.', 400);
  }
  const definition = RECOMMENDATION_LAUNCH_RULES[existing.scenario.code].find(
    (item) => item.key === existing.key,
  );
  if (!definition) throw new AdminDataError('This rule has no launch default.', 400);
  const index = RECOMMENDATION_LAUNCH_RULES[existing.scenario.code].indexOf(definition);

  await prisma.$transaction([
    prisma.recommendationRuleOverride.deleteMany({ where: { ruleId: id } }),
    prisma.recommendationRule.update({
      where: { id },
      data: toRuleData(definition, (index + 1) * 10),
    }),
  ]);
}

export async function setRecommendationRuleOverride(
  ruleId: string,
  productId: string,
  action: 'PIN' | 'EXCLUDE' | 'RESET',
) {
  const [rule, product] = await Promise.all([
    prisma.recommendationRule.findUnique({ where: { id: ruleId } }),
    prisma.product.findUnique({ where: { id: productId } }),
  ]);
  if (!rule || !product) throw new AdminDataError('Rule or product does not exist.', 404);

  if (action === 'RESET') {
    await prisma.recommendationRuleOverride.deleteMany({ where: { ruleId, productId } });
    return;
  }
  const maximum = await prisma.recommendationRuleOverride.aggregate({
    where: { ruleId, action: 'PIN' },
    _max: { displayOrder: true },
  });
  await prisma.recommendationRuleOverride.upsert({
    where: { ruleId_productId: { ruleId, productId } },
    update: { action },
    create: {
      ruleId,
      productId,
      action,
      displayOrder: action === 'PIN' ? (maximum._max.displayOrder ?? 0) + 10 : 0,
    },
  });
}

export async function auditAllRecommendationScenarios(): Promise<RecommendationAuditReport> {
  const [scenarios, products, assignments] = await Promise.all([
    prisma.recommendationScenario.findMany({
      where: {
        groupType: 'SCENARIO',
        code: { in: CORE_RECOMMENDATION_SCENARIOS.map((scenario) => scenario.code) },
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        recommendationRules: {
          orderBy: { displayOrder: 'asc' },
          include: { overrides: { include: { product: true } } },
        },
        creatorRules: { orderBy: { displayOrder: 'asc' } },
      },
    }),
    prisma.product.findMany(),
    prisma.recommendationAssignment.findMany({ include: { product: true } }),
  ]);

  const audits = scenarios.flatMap((scenario) => {
    if (!isCoreRecommendationScenarioCode(scenario.code)) return [];
    const seen = new Set<string>();
    const selectedIds: string[] = [];
    const rendered: string[] = [];
    const tiers = new Set<ProductValueTier>();
    const fallbacks = new Set<string>();
    const missing = new Set<string>();
    const emptyRules: string[] = [];
    const overLimit: string[] = [];
    const disabledReferences = assignments
      .filter(
        (assignment) =>
          scenario.recommendationRules.some(
            (rule) => rule.sourceSectionId === assignment.sectionId,
          ) && !assignment.product.enabled,
      )
      .map((assignment) => assignment.product.title);
    const invalidReferences = assignments
      .filter(
        (assignment) =>
          scenario.recommendationRules.some(
            (rule) => rule.sourceSectionId === assignment.sectionId,
          ) && !isPublicHttpsUrl(assignment.product.affiliateUrl),
      )
      .map((assignment) => assignment.product.title);
    const missingImages: string[] = [];

    for (const rule of scenario.recommendationRules.filter((item) => item.enabled)) {
      const selection = selectRuleProducts(products, rule, assignments, seen);
      const hasGuidance = Boolean(rule.emptyCtaLabel && rule.emptyCtaUrl);
      if (selection.products.length > 0 || hasGuidance) rendered.push(rule.title);
      else emptyRules.push(rule.title);
      if (selection.products.length > rule.maxProducts) overLimit.push(rule.title);
      for (const selected of selection.products) {
        selectedIds.push(selected.product.id);
        if (selected.selectionSource !== 'MANUAL') seen.add(selected.product.id);
        if (selected.product.valueTier) tiers.add(selected.product.valueTier as ProductValueTier);
        if (!selected.product.imageUrl) missingImages.push(selected.product.title);
      }
      for (const fallback of selection.fallbackUsed) fallbacks.add(fallback);
      for (const component of selection.missingComponentTypes) missing.add(component);
    }

    const duplicateIds = selectedIds.filter(
      (id, index) => selectedIds.indexOf(id) !== index,
    );
    const manual = scenario.recommendationRules.some(
      (rule) => rule.source === 'MANUAL' || rule.mode === 'MANUAL',
    );
    const creatorSeen = new Set<string>();
    const creatorGroups = scenario.creatorRules
      .filter((rule) => rule.enabled)
      .flatMap((rule) => {
        const selected = selectCreatorProducts(
          products,
          toCreatorDefinition(rule),
          creatorSeen,
        );
        for (const product of selected) creatorSeen.add(product.id);
        return selected.length > 0 ? [rule.title] : [];
      });
    const productTitleById = new Map(products.map((product) => [product.id, product.title]));

    return [{
      scenario: scenario.code,
      status:
        scenario.recommendationRules.length === 0
          ? 'Incomplete' as const
          : manual
            ? 'Manual Override' as const
            : 'Automatic' as const,
      sectionsRendered: rendered,
      productsSelected: selectedIds.length,
      selectedValueTiers: Array.from(tiers),
      fallbacksUsed: Array.from(fallbacks),
      missingComponentTypes: Array.from(missing),
      creatorGroupsRendered: creatorGroups,
      emptyRules,
      disabledProductsReferenced: unique(disabledReferences),
      invalidProductsReferenced: unique(invalidReferences),
      productsMissingImages: unique(missingImages),
      duplicateProducts: unique(
        duplicateIds.map((id) => productTitleById.get(id) ?? id),
      ),
      sectionsExceedingLimits: overLimit,
    }];
  });

  return {
    generatedAt: new Date().toISOString(),
    scenarios: audits,
    summary: {
      emptyScenarios: audits.filter((audit) => audit.sectionsRendered.length === 0).length,
      emptyRules: audits.reduce((total, audit) => total + audit.emptyRules.length, 0),
      disabledReferences: audits.reduce(
        (total, audit) => total + audit.disabledProductsReferenced.length,
        0,
      ),
      invalidReferences: audits.reduce(
        (total, audit) => total + audit.invalidProductsReferenced.length,
        0,
      ),
      missingImages: audits.reduce(
        (total, audit) => total + audit.productsMissingImages.length,
        0,
      ),
      duplicateProducts: audits.reduce(
        (total, audit) => total + audit.duplicateProducts.length,
        0,
      ),
      sectionsExceedingLimits: audits.reduce(
        (total, audit) => total + audit.sectionsExceedingLimits.length,
        0,
      ),
    },
  };
}

function toRuleData(definition: RecommendationRuleDefinition, displayOrder: number) {
  return {
    title: definition.title,
    description: definition.description,
    enabled: true,
    displayOrder,
    mode: 'AUTOMATIC',
    allowedComponentTypes: JSON.stringify(definition.componentTypes),
    allowedValueTiers: JSON.stringify(definition.valueTiers),
    tierPriority: JSON.stringify(definition.tierPriority),
    fallbackComponentTypes: JSON.stringify(definition.fallbackComponentTypes),
    fallbackValueTiers: JSON.stringify(definition.fallbackValueTiers),
    maxProducts: definition.maxProducts,
    sortOrder: definition.sortOrder,
    layout: definition.layout,
    purpose: definition.purpose,
    collapsedByDefault: definition.collapsedByDefault,
    emptyStateTitle: definition.emptyStateTitle,
    emptyStateDescription: definition.emptyStateDescription,
    emptyCtaLabel: definition.emptyCtaLabel,
    emptyCtaUrl: definition.emptyCtaUrl,
    sourceSectionId: definition.sourceSectionId,
    source: 'LAUNCH_DEFAULT',
  };
}

function toCreatorRuleData(definition: CreatorRuleDefinition, displayOrder: number) {
  return {
    title: definition.title,
    description: definition.description,
    enabled: true,
    displayOrder,
    allowedComponentTypes: JSON.stringify(definition.componentTypes),
    allowedValueTiers: JSON.stringify(definition.valueTiers),
    derivedCategories: JSON.stringify(definition.derivedCategories),
    tierPriority: JSON.stringify(definition.tierPriority),
    maxProducts: definition.maxProducts,
    source: 'LAUNCH_DEFAULT',
  };
}

function toCreatorDefinition(rule: CreatorRecommendationRule): CreatorRuleDefinition {
  return {
    key: rule.key,
    title: rule.title,
    description: rule.description,
    componentTypes: parseRuleArray(
      rule.allowedComponentTypes,
    ) as RecommendationRuleComponentType[],
    valueTiers: parseRuleArray(rule.allowedValueTiers) as ProductValueTier[],
    tierPriority: parseRuleArray(rule.tierPriority) as ProductValueTier[],
    derivedCategories: parseRuleArray(
      rule.derivedCategories,
    ) as CreatorDerivedCategory[],
    maxProducts: Math.max(0, rule.maxProducts),
  };
}

function deduplicateOverrides(overrides: readonly RuleEngineOverride[]) {
  const byProduct = new Map<string, RuleEngineOverride>();
  for (const override of overrides) {
    const existing = byProduct.get(override.productId);
    if (!existing || override.source === 'OVERRIDE') byProduct.set(override.productId, override);
  }
  return Array.from(byProduct.values());
}

function serializeProduct(product: Product): ProductRecord {
  return {
    ...product,
    retailer: product.retailer as ProductRecord['retailer'],
    componentType: product.componentType as ProductRecord['componentType'],
    platform: product.platform as ProductRecord['platform'],
    valueTier: product.valueTier as ProductRecord['valueTier'],
    usage: [],
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function normalizeRuleMode(value: string): RecommendationRuleMode {
  return value === 'MANUAL' ? 'MANUAL' : 'AUTOMATIC';
}

function normalizeSortOrder(value: string): RecommendationRuleSortOrder {
  if (value === 'COMPONENT_DIVERSITY' || value === 'ADMIN_ORDER') return value;
  return 'TIER_DIVERSITY';
}

function normalizeLayout(value: string): RecommendationSectionLayout {
  if (value === 'horizontal' || value === 'featured') return value;
  return 'grid';
}

function normalizePurpose(value: string): RecommendationSectionPurpose {
  if (value === 'PREBUILT' || value === 'GAME_PURCHASE' || value === 'GUIDANCE') {
    return value;
  }
  return 'GENERAL';
}

function unique<T>(values: readonly T[]) {
  return Array.from(new Set(values));
}
