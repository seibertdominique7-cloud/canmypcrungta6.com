import 'server-only';

import type {
  CreatorGuideLink,
  CreatorProductAssignment,
  CreatorRecommendation,
  CreatorRecommendationGroup,
  Product,
} from '../../generated/prisma/client';
import { CREATOR_FALLBACK } from '../data/creator-recommendations';
import {
  isCoreRecommendationScenarioCode,
  type CoreRecommendationScenarioCode,
} from '../data/recommendation-scenarios';
import type { AffiliateProductRecord, ProductRecord } from './affiliate-types';
import { isPublicHttpsUrl } from './affiliate-validation';
import { AdminDataError } from './admin-data-error';
import { getCatalogProducts } from './catalog-data';
import type {
  CreatorRecommendationInput,
  CreatorRecommendationRecord,
  CreatorRecommendationWorkspace,
  PublicCreatorRecommendationPayload,
} from './creator-recommendation-types';
import { isSafeCreatorDestination } from './creator-recommendation-validation';
import { prisma } from './prisma';

type CreatorAssignmentWithProduct = CreatorProductAssignment & { product: Product };
type CreatorGroupWithAssignments = CreatorRecommendationGroup & {
  assignments: CreatorAssignmentWithProduct[];
};
type CreatorWithChildren = CreatorRecommendation & {
  groups: CreatorGroupWithAssignments[];
  guides: CreatorGuideLink[];
};

const creatorInclude = {
  groups: {
    orderBy: [{ displayOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    include: {
      assignments: {
        orderBy: [{ displayOrder: 'asc' as const }, { createdAt: 'asc' as const }],
        include: { product: true },
      },
    },
  },
  guides: {
    orderBy: [{ displayOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
};

export async function getCreatorRecommendationWorkspace(): Promise<CreatorRecommendationWorkspace> {
  const [scenarios, products] = await Promise.all([
    prisma.recommendationScenario.findMany({
      where: { groupType: 'SCENARIO', isCore: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      include: { creatorRecommendation: { include: creatorInclude } },
    }),
    getCatalogProducts(),
  ]);
  const productMap = new Map(products.map((product) => [product.id, product]));

  return {
    scenarios: scenarios
      .filter((scenario) => isCoreRecommendationScenarioCode(scenario.code))
      .map((scenario) => ({
        id: scenario.id,
        code: scenario.code as CoreRecommendationScenarioCode,
        displayName: scenario.displayName,
        creatorRecommendation: scenario.creatorRecommendation
          ? serializeAdminRecommendation(scenario.creatorRecommendation, productMap)
          : null,
      })),
    products,
  };
}

export async function saveCreatorRecommendation(input: CreatorRecommendationInput) {
  const scenario = await prisma.recommendationScenario.findUnique({
    where: { id: input.scenarioId },
    select: { id: true, code: true, groupType: true, isCore: true },
  });

  if (
    !scenario ||
    scenario.groupType !== 'SCENARIO' ||
    !scenario.isCore ||
    !isCoreRecommendationScenarioCode(scenario.code)
  ) {
    throw new AdminDataError('Choose a valid compatibility scenario.', 400);
  }

  const productIds = Array.from(
    new Set(input.groups.flatMap((group) => group.productIds)),
  );
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true },
  });

  if (products.length !== productIds.length) {
    throw new AdminDataError('One or more selected products no longer exist.', 400);
  }

  await prisma.$transaction(async (transaction) => {
    const recommendation = await transaction.creatorRecommendation.upsert({
      where: { scenarioId: scenario.id },
      update: {
        enabled: input.enabled,
        headline: input.headline,
        subheadline: input.subheadline,
        description: input.description,
        warningText: input.warningText,
        primaryCtaLabel: input.primaryCtaLabel,
        primaryCtaUrl: input.primaryCtaUrl,
        secondaryCtaLabel: input.secondaryCtaLabel,
        secondaryCtaUrl: input.secondaryCtaUrl,
      },
      create: {
        scenarioId: scenario.id,
        enabled: input.enabled,
        headline: input.headline,
        subheadline: input.subheadline,
        description: input.description,
        warningText: input.warningText,
        primaryCtaLabel: input.primaryCtaLabel,
        primaryCtaUrl: input.primaryCtaUrl,
        secondaryCtaLabel: input.secondaryCtaLabel,
        secondaryCtaUrl: input.secondaryCtaUrl,
      },
    });

    await transaction.creatorGuideLink.deleteMany({
      where: { creatorRecommendationId: recommendation.id },
    });
    await transaction.creatorRecommendationGroup.deleteMany({
      where: { creatorRecommendationId: recommendation.id },
    });

    for (const [groupIndex, group] of input.groups.entries()) {
      const createdGroup = await transaction.creatorRecommendationGroup.create({
        data: {
          creatorRecommendationId: recommendation.id,
          title: group.title,
          description: group.description,
          enabled: group.enabled,
          displayOrder: (groupIndex + 1) * 10,
        },
      });

      if (group.productIds.length > 0) {
        await transaction.creatorProductAssignment.createMany({
          data: group.productIds.map((productId, productIndex) => ({
            groupId: createdGroup.id,
            productId,
            enabled: true,
            displayOrder: (productIndex + 1) * 10,
          })),
        });
      }
    }

    if (input.guides.length > 0) {
      await transaction.creatorGuideLink.createMany({
        data: input.guides.map((guide, index) => ({
          creatorRecommendationId: recommendation.id,
          label: guide.label,
          url: guide.url,
          enabled: guide.enabled,
          displayOrder: (index + 1) * 10,
        })),
      });
    }
  });
}

export async function getPublicCreatorRecommendation(
  scenarioCode: CoreRecommendationScenarioCode,
): Promise<PublicCreatorRecommendationPayload> {
  const scenario = await prisma.recommendationScenario.findFirst({
    where: { code: scenarioCode, groupType: 'SCENARIO' },
    include: { creatorRecommendation: { include: creatorInclude } },
  });
  const recommendation = scenario?.creatorRecommendation;

  if (!recommendation?.enabled) return getCreatorFallbackPayload(scenarioCode);

  const groups = recommendation.groups
    .filter((group) => group.enabled)
    .map((group) => ({
      id: group.id,
      title: group.title,
      description: group.description,
      products: group.assignments
        .filter(
          (assignment) =>
            assignment.enabled &&
            assignment.product.enabled &&
            isPublicHttpsUrl(assignment.product.affiliateUrl),
        )
        .map((assignment) => serializePublicProduct(assignment, group.id)),
    }))
    .filter((group) => group.products.length > 0);
  const guides = recommendation.guides
    .filter((guide) => guide.enabled && isSafeCreatorDestination(guide.url))
    .map((guide) => ({ id: guide.id, label: guide.label, url: guide.url }));

  return {
    scenarioCode,
    source: 'custom',
    headline: recommendation.headline,
    subheadline: recommendation.subheadline,
    description: recommendation.description,
    warningText: recommendation.warningText,
    primaryCtaLabel: recommendation.primaryCtaLabel,
    primaryCtaUrl: isSafeCreatorDestination(recommendation.primaryCtaUrl)
      ? recommendation.primaryCtaUrl
      : CREATOR_FALLBACK.primaryCtaUrl,
    secondaryCtaLabel:
      recommendation.secondaryCtaLabel &&
      isSafeCreatorDestination(recommendation.secondaryCtaUrl)
        ? recommendation.secondaryCtaLabel
        : '',
    secondaryCtaUrl: isSafeCreatorDestination(recommendation.secondaryCtaUrl)
      ? recommendation.secondaryCtaUrl
      : '',
    groups,
    guides,
  };
}

export function getCreatorFallbackPayload(
  scenarioCode: CoreRecommendationScenarioCode,
): PublicCreatorRecommendationPayload {
  return {
    scenarioCode,
    source: 'fallback',
    ...CREATOR_FALLBACK,
    groups: [],
    guides: [],
  };
}

function serializeAdminRecommendation(
  recommendation: CreatorWithChildren,
  productMap: Map<string, ProductRecord>,
): CreatorRecommendationRecord {
  return {
    id: recommendation.id,
    scenarioId: recommendation.scenarioId,
    enabled: recommendation.enabled,
    headline: recommendation.headline,
    subheadline: recommendation.subheadline,
    description: recommendation.description,
    warningText: recommendation.warningText,
    primaryCtaLabel: recommendation.primaryCtaLabel,
    primaryCtaUrl: recommendation.primaryCtaUrl,
    secondaryCtaLabel: recommendation.secondaryCtaLabel,
    secondaryCtaUrl: recommendation.secondaryCtaUrl,
    groups: recommendation.groups.map((group) => ({
      id: group.id,
      title: group.title,
      description: group.description,
      enabled: group.enabled,
      displayOrder: group.displayOrder,
      assignments: group.assignments.flatMap((assignment) => {
        const product = productMap.get(assignment.productId);
        return product
          ? [{
              id: assignment.id,
              productId: assignment.productId,
              enabled: assignment.enabled,
              displayOrder: assignment.displayOrder,
              product,
            }]
          : [];
      }),
    })),
    guides: recommendation.guides.map((guide) => ({
      id: guide.id,
      label: guide.label,
      url: guide.url,
      enabled: guide.enabled,
      displayOrder: guide.displayOrder,
    })),
    createdAt: recommendation.createdAt.toISOString(),
    updatedAt: recommendation.updatedAt.toISOString(),
  };
}

function serializePublicProduct(
  assignment: CreatorAssignmentWithProduct,
  groupId: string,
): AffiliateProductRecord {
  const product = assignment.product;
  return {
    id: assignment.id,
    productId: product.id,
    sectionId: groupId,
    title: product.title,
    retailer: product.retailer as AffiliateProductRecord['retailer'],
    affiliateUrl: product.affiliateUrl,
    imageUrl: product.imageUrl,
    priceText: product.defaultPriceText,
    badge: 'None',
    shortDescription: product.shortDescription,
    buttonText: product.retailer === 'Other' ? 'Check Current Price' : `View on ${product.retailer}`,
    componentType: product.componentType as AffiliateProductRecord['componentType'],
    platform: product.platform as AffiliateProductRecord['platform'],
    enabled: assignment.enabled && product.enabled,
    displayOrder: assignment.displayOrder,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  };
}
