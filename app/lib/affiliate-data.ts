import 'server-only';

import type {
  AffiliateProduct,
  GamePurchaseLink,
  RecommendationScenario,
  RecommendationSection,
} from '../../generated/prisma/client';
import type {
  AffiliateProductRecord,
  GamePurchaseLinkRecord,
  PublicMonetizationPayload,
  RecommendationScenarioRecord,
  RecommendationSectionRecord,
} from './affiliate-types';
import type {
  AffiliateProductInput,
  GamePurchaseLinkInput,
  RecommendationSectionInput,
  ScenarioInput,
} from './affiliate-validation';
import { isPublicHttpsUrl } from './affiliate-validation';
import { prisma } from './prisma';

type SectionWithProducts = RecommendationSection & { products: AffiliateProduct[] };
type ScenarioWithSections = RecommendationScenario & {
  sections: SectionWithProducts[];
};

export async function getAdminScenarios(): Promise<RecommendationScenarioRecord[]> {
  const scenarios = await prisma.recommendationScenario.findMany({
    where: { groupType: 'SCENARIO' },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      sections: {
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
        include: {
          products: {
            orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
      },
    },
  });

  return scenarios.map(serializeScenario);
}

export async function getAdminGamePurchaseLinks(): Promise<GamePurchaseLinkRecord[]> {
  const links = await prisma.gamePurchaseLink.findMany({
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return links.map(serializeGamePurchaseLink);
}

// Backward-compatible endpoint payload for callers of /api/recommendations.
export async function getPublicRecommendations(code: string, requestedLimit?: number) {
  const payload = await getPublicMonetization(code);
  if (!payload) return null;

  const configuredLimit = getRecommendationLimit();
  const limit = Math.min(
    configuredLimit,
    Math.max(
      1,
      Number.isFinite(requestedLimit)
        ? Math.floor(requestedLimit ?? 1)
        : configuredLimit,
    ),
  );
  const firstSection = payload.sections[0];

  return {
    scenario: {
      code: payload.scenario.code,
      heading: firstSection?.title ?? payload.scenario.resultHeading,
      description:
        firstSection?.description ?? payload.scenario.resultDescription,
    },
    links: firstSection?.products.slice(0, limit) ?? [],
  };
}

export async function getPublicMonetization(
  code: string,
): Promise<PublicMonetizationPayload> {
  const scenario = await prisma.recommendationScenario.findFirst({
    where: { code, groupType: 'SCENARIO' },
    include: {
      sections: {
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
        include: {
          products: {
            orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
      },
    },
  });

  if (!scenario) {
    console.info(`[recommendations] Detected scenario: ${code}`, {
      databaseScenarioCode: null,
      sectionsFound: 0,
      productsFound: 0,
      reason: 'No exact database scenario match.',
    });
    return null;
  }

  const matchingSections = scenario.sections;
  const enabledSections = matchingSections.filter((section) => section.enabled);
  const disabledSections = matchingSections
    .filter((section) => !section.enabled)
    .map((section) => ({
      title: section.title,
      enabledProducts: section.products.filter((product) => product.enabled).length,
    }));
  const sectionsWithoutEnabledProducts = enabledSections
    .filter((section) => !section.products.some((product) => product.enabled))
    .map((section) => section.title);
  const productsFound = enabledSections.reduce(
    (total, section) =>
      total + section.products.filter((product) => product.enabled).length,
    0,
  );
  const productsRejectedByUrl = enabledSections.flatMap((section) =>
    section.products
      .filter((product) => product.enabled && !isPublicHttpsUrl(product.affiliateUrl))
      .map((product) => product.title),
  );
  const sections = enabledSections
    .map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      maxProducts: section.maxProducts,
      collapsedByDefault: section.collapsedByDefault,
      layout: section.layout as RecommendationSectionRecord['layout'],
      purpose: section.purpose as RecommendationSectionRecord['purpose'],
      products: section.products
        .filter((product) => product.enabled)
        .filter((product) => isPublicHttpsUrl(product.affiliateUrl))
        .slice(0, Math.max(1, section.maxProducts))
        .map(serializeProduct),
    }))
    .filter((section) => section.products.length > 0);
  const renderableProductsFound = sections.reduce(
    (total, section) => total + section.products.length,
    0,
  );
  const debug = {
    detectedScenario: code,
    databaseScenarioCode: scenario.code,
    scenarioEnabled: scenario.enabled,
    sectionsFound: enabledSections.length,
    productsFound,
    renderableProductsFound,
    disabledSections,
    sectionsWithoutEnabledProducts,
    productsRejectedByUrl,
  };

  console.info(`[recommendations] Detected scenario: ${code}`, debug);

  return {
    scenario: {
      code: scenario.code,
      resultHeading: scenario.resultHeading,
      resultDescription: scenario.resultDescription,
    },
    sections: scenario.enabled ? sections : [],
    ...(process.env.NODE_ENV !== 'production' ? { debug } : {}),
  };
}

export async function createScenario(input: ScenarioInput) {
  const duplicate = await prisma.recommendationScenario.findUnique({
    where: { code: input.code },
  });

  if (duplicate) {
    throw new AdminDataError('A scenario with this code already exists.', 409);
  }

  const maximum = await prisma.recommendationScenario.aggregate({
    where: { groupType: 'SCENARIO' },
    _max: { displayOrder: true },
  });

  return prisma.recommendationScenario.create({
    data: {
      ...input,
      isCore: false,
      groupType: 'SCENARIO',
      displayOrder: (maximum._max.displayOrder ?? 0) + 10,
    },
  });
}

export async function updateScenario(id: string, input: ScenarioInput) {
  const existing = await prisma.recommendationScenario.findUniqueOrThrow({ where: { id } });
  const duplicate = await prisma.recommendationScenario.findFirst({
    where: { code: input.code, id: { not: id } },
  });

  if (!existing.isCore && duplicate) {
    throw new AdminDataError('A scenario with this code already exists.', 409);
  }

  return prisma.recommendationScenario.update({
    where: { id },
    data: {
      code: existing.isCore ? existing.code : input.code,
      displayName: input.displayName,
      resultHeading: input.resultHeading,
      resultDescription: input.resultDescription,
      enabled: input.enabled,
    },
  });
}

export async function deleteScenario(id: string) {
  const scenario = await prisma.recommendationScenario.findUniqueOrThrow({
    where: { id },
    include: {
      _count: { select: { sections: true, legacyAffiliateLinks: true } },
    },
  });

  if (scenario.isCore) {
    throw new AdminDataError('Core scenarios cannot be deleted.', 409);
  }

  if (scenario._count.sections > 0 || scenario._count.legacyAffiliateLinks > 0) {
    throw new AdminDataError('Remove every section before deleting this scenario.', 409);
  }

  await prisma.recommendationScenario.delete({ where: { id } });
}

export async function moveScenario(id: string, direction: 'up' | 'down') {
  const current = await prisma.recommendationScenario.findUniqueOrThrow({ where: { id } });
  const adjacent = await prisma.recommendationScenario.findFirst({
    where:
      direction === 'up'
        ? { groupType: 'SCENARIO', displayOrder: { lt: current.displayOrder } }
        : { groupType: 'SCENARIO', displayOrder: { gt: current.displayOrder } },
    orderBy: { displayOrder: direction === 'up' ? 'desc' : 'asc' },
  });

  if (!adjacent) return;

  await prisma.$transaction([
    prisma.recommendationScenario.update({
      where: { id: current.id },
      data: { displayOrder: adjacent.displayOrder },
    }),
    prisma.recommendationScenario.update({
      where: { id: adjacent.id },
      data: { displayOrder: current.displayOrder },
    }),
  ]);

}

export async function reorderScenarios(anchorId: string, orderedIds: string[]) {
  const anchor = await prisma.recommendationScenario.findFirst({
    where: { id: anchorId, groupType: 'SCENARIO' },
    select: { id: true },
  });
  if (!anchor) throw new AdminDataError('Scenario does not exist.', 404);

  const siblings = await prisma.recommendationScenario.findMany({
    where: { groupType: 'SCENARIO' },
    select: { id: true },
  });
  assertCompleteOrder(siblings.map((item) => item.id), orderedIds);

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.recommendationScenario.update({
        where: { id },
        data: { displayOrder: (index + 1) * 10 },
      }),
    ),
  );
}

export async function createRecommendationSection(input: RecommendationSectionInput) {
  await assertScenarioExists(input.scenarioId);
  const displayOrder = await nextSectionDisplayOrder(input.scenarioId);

  return prisma.recommendationSection.create({
    data: { ...input, displayOrder, isCore: false },
  });
}

export async function updateRecommendationSection(
  id: string,
  input: RecommendationSectionInput,
) {
  const existing = await prisma.recommendationSection.findUniqueOrThrow({ where: { id } });
  await assertScenarioExists(input.scenarioId);
  const moved = existing.scenarioId !== input.scenarioId;

  return prisma.recommendationSection.update({
    where: { id },
    data: {
      ...input,
      displayOrder: moved
        ? await nextSectionDisplayOrder(input.scenarioId)
        : existing.displayOrder,
    },
  });
}

export async function deleteRecommendationSection(id: string) {
  const section = await prisma.recommendationSection.findUniqueOrThrow({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (section.isCore) {
    throw new AdminDataError('Default sections can be disabled but not deleted.', 409);
  }

  if (section._count.products > 0) {
    throw new AdminDataError('Move or delete every product before deleting this section.', 409);
  }

  await prisma.recommendationSection.delete({ where: { id } });
}

export async function moveRecommendationSection(id: string, direction: 'up' | 'down') {
  const current = await prisma.recommendationSection.findUniqueOrThrow({ where: { id } });
  const adjacent = await prisma.recommendationSection.findFirst({
    where: {
      scenarioId: current.scenarioId,
      ...(direction === 'up'
        ? { displayOrder: { lt: current.displayOrder } }
        : { displayOrder: { gt: current.displayOrder } }),
    },
    orderBy: { displayOrder: direction === 'up' ? 'desc' : 'asc' },
  });

  if (!adjacent) return;

  await prisma.$transaction([
    prisma.recommendationSection.update({
      where: { id: current.id },
      data: { displayOrder: adjacent.displayOrder },
    }),
    prisma.recommendationSection.update({
      where: { id: adjacent.id },
      data: { displayOrder: current.displayOrder },
    }),
  ]);
}

export async function reorderRecommendationSections(anchorId: string, orderedIds: string[]) {
  const anchor = await prisma.recommendationSection.findUnique({
    where: { id: anchorId },
    select: { scenarioId: true },
  });
  if (!anchor) throw new AdminDataError('Section does not exist.', 404);

  const siblings = await prisma.recommendationSection.findMany({
    where: { scenarioId: anchor.scenarioId },
    select: { id: true },
  });
  assertCompleteOrder(siblings.map((item) => item.id), orderedIds);

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.recommendationSection.update({
        where: { id },
        data: { displayOrder: (index + 1) * 10 },
      }),
    ),
  );
}

export async function duplicateRecommendationSection(id: string) {
  const source = await prisma.recommendationSection.findUniqueOrThrow({
    where: { id },
    include: { products: { orderBy: { displayOrder: 'asc' } } },
  });
  const displayOrder = await nextSectionDisplayOrder(source.scenarioId);

  await prisma.$transaction(async (transaction) => {
    const copy = await transaction.recommendationSection.create({
      data: {
        scenarioId: source.scenarioId,
        title: `${source.title} Copy`,
        description: source.description,
        enabled: source.enabled,
        displayOrder,
        maxProducts: source.maxProducts,
        collapsedByDefault: source.collapsedByDefault,
        layout: source.layout,
        purpose: source.purpose,
        isCore: false,
      },
    });

    if (source.products.length > 0) {
      await transaction.affiliateProduct.createMany({
        data: source.products.map((product) => ({
          sectionId: copy.id,
          title: product.title,
          retailer: product.retailer,
          affiliateUrl: product.affiliateUrl,
          imageUrl: product.imageUrl,
          priceText: product.priceText,
          shortDescription: product.shortDescription,
          badge: product.badge,
          buttonText: product.buttonText,
          componentType: product.componentType,
          platform: product.platform,
          enabled: product.enabled,
          displayOrder: product.displayOrder,
        })),
      });
    }
  });
}

export async function createAffiliateLink(input: AffiliateProductInput) {
  await assertSectionExists(input.sectionId);
  const displayOrder = await nextProductDisplayOrder(input.sectionId);

  return prisma.affiliateProduct.create({ data: { ...input, displayOrder } });
}

export async function updateAffiliateLink(id: string, input: AffiliateProductInput) {
  const existing = await prisma.affiliateProduct.findUniqueOrThrow({ where: { id } });
  await assertSectionExists(input.sectionId);
  const moved = existing.sectionId !== input.sectionId;

  return prisma.affiliateProduct.update({
    where: { id },
    data: {
      ...input,
      legacySourceType: moved ? null : existing.legacySourceType,
      legacySourceId: moved ? null : existing.legacySourceId,
      displayOrder: moved
        ? await nextProductDisplayOrder(input.sectionId)
        : existing.displayOrder,
    },
  });
}

export async function deleteAffiliateLink(id: string) {
  await prisma.affiliateProduct.delete({ where: { id } });
}

export async function moveAffiliateLink(id: string, direction: 'up' | 'down') {
  const current = await prisma.affiliateProduct.findUniqueOrThrow({ where: { id } });
  const adjacent = await prisma.affiliateProduct.findFirst({
    where: {
      sectionId: current.sectionId,
      ...(direction === 'up'
        ? { displayOrder: { lt: current.displayOrder } }
        : { displayOrder: { gt: current.displayOrder } }),
    },
    orderBy: { displayOrder: direction === 'up' ? 'desc' : 'asc' },
  });

  if (!adjacent) return;

  await prisma.$transaction([
    prisma.affiliateProduct.update({
      where: { id: current.id },
      data: { displayOrder: adjacent.displayOrder },
    }),
    prisma.affiliateProduct.update({
      where: { id: adjacent.id },
      data: { displayOrder: current.displayOrder },
    }),
  ]);
}

export async function reorderAffiliateLinks(anchorId: string, orderedIds: string[]) {
  const anchor = await prisma.affiliateProduct.findUnique({
    where: { id: anchorId },
    select: { sectionId: true },
  });
  if (!anchor) throw new AdminDataError('Product does not exist.', 404);

  const siblings = await prisma.affiliateProduct.findMany({
    where: { sectionId: anchor.sectionId },
    select: { id: true },
  });
  assertCompleteOrder(siblings.map((item) => item.id), orderedIds);

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.affiliateProduct.update({
        where: { id },
        data: { displayOrder: (index + 1) * 10 },
      }),
    ),
  );
}

export async function copyAffiliateLink(id: string, sectionIds: string[]) {
  const source = await prisma.affiliateProduct.findUniqueOrThrow({ where: { id } });
  const uniqueSectionIds = Array.from(new Set(sectionIds)).slice(0, 50);

  if (uniqueSectionIds.length === 0) {
    throw new AdminDataError('Choose at least one destination section.', 400);
  }

  const sections = await prisma.recommendationSection.findMany({
    where: { id: { in: uniqueSectionIds } },
    select: { id: true },
  });

  if (sections.length !== uniqueSectionIds.length) {
    throw new AdminDataError('One or more destination sections do not exist.', 400);
  }

  for (const section of sections) {
    await prisma.affiliateProduct.create({
      data: {
        sectionId: section.id,
        title: source.title,
        retailer: source.retailer,
        affiliateUrl: source.affiliateUrl,
        imageUrl: source.imageUrl,
        priceText: source.priceText,
        shortDescription: source.shortDescription,
        badge: source.badge,
        buttonText: source.buttonText,
        componentType: source.componentType,
        platform: source.platform,
        enabled: source.enabled,
        displayOrder: await nextProductDisplayOrder(section.id),
      },
    });
  }
}

export async function createGamePurchaseLink(input: GamePurchaseLinkInput) {
  const maximum = await prisma.gamePurchaseLink.aggregate({ _max: { displayOrder: true } });
  const link = await prisma.gamePurchaseLink.create({
    data: { ...input, displayOrder: (maximum._max.displayOrder ?? 0) + 10 },
  });
  await syncLegacyGamePurchaseLink(link);
  return link;
}

export async function updateGamePurchaseLink(id: string, input: GamePurchaseLinkInput) {
  const link = await prisma.gamePurchaseLink.update({ where: { id }, data: input });
  await syncLegacyGamePurchaseLink(link);
  return link;
}

export async function deleteGamePurchaseLink(id: string) {
  await prisma.$transaction([
    prisma.affiliateProduct.deleteMany({
      where: { legacySourceType: 'GamePurchaseLink', legacySourceId: id },
    }),
    prisma.gamePurchaseLink.delete({ where: { id } }),
  ]);
}

export async function moveGamePurchaseLink(id: string, direction: 'up' | 'down') {
  const current = await prisma.gamePurchaseLink.findUniqueOrThrow({ where: { id } });
  const adjacent = await prisma.gamePurchaseLink.findFirst({
    where:
      direction === 'up'
        ? { displayOrder: { lt: current.displayOrder } }
        : { displayOrder: { gt: current.displayOrder } },
    orderBy: { displayOrder: direction === 'up' ? 'desc' : 'asc' },
  });
  if (!adjacent) return;

  await prisma.$transaction([
    prisma.gamePurchaseLink.update({
      where: { id: current.id },
      data: { displayOrder: adjacent.displayOrder },
    }),
    prisma.gamePurchaseLink.update({
      where: { id: adjacent.id },
      data: { displayOrder: current.displayOrder },
    }),
  ]);

  const reordered = await prisma.gamePurchaseLink.findMany({
    where: { id: { in: [current.id, adjacent.id] } },
  });
  for (const link of reordered) await syncLegacyGamePurchaseLink(link);
}

export class AdminDataError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function getRecommendationLimit() {
  const configured = Number.parseInt(process.env.AFFILIATE_RECOMMENDATION_LIMIT ?? '3', 10);
  return Number.isFinite(configured) ? Math.min(12, Math.max(1, configured)) : 3;
}

async function assertScenarioExists(id: string) {
  const scenario = await prisma.recommendationScenario.findFirst({
    where: { id, groupType: 'SCENARIO' },
  });
  if (!scenario) throw new AdminDataError('Scenario does not exist.', 400);
}

async function assertSectionExists(id: string) {
  const section = await prisma.recommendationSection.findUnique({ where: { id } });
  if (!section) throw new AdminDataError('Section does not exist.', 400);
}

async function nextSectionDisplayOrder(scenarioId: string) {
  const maximum = await prisma.recommendationSection.aggregate({
    where: { scenarioId },
    _max: { displayOrder: true },
  });
  return (maximum._max.displayOrder ?? 0) + 10;
}

async function nextProductDisplayOrder(sectionId: string) {
  const maximum = await prisma.affiliateProduct.aggregate({
    where: { sectionId },
    _max: { displayOrder: true },
  });
  return (maximum._max.displayOrder ?? 0) + 10;
}

function assertCompleteOrder(actualIds: string[], orderedIds: string[]) {
  if (orderedIds.length > 500 || new Set(orderedIds).size !== orderedIds.length) {
    throw new AdminDataError('The requested display order is invalid.', 400);
  }

  const actual = new Set(actualIds);
  const containsEverySibling =
    actualIds.length === orderedIds.length && orderedIds.every((id) => actual.has(id));

  if (!containsEverySibling) {
    throw new AdminDataError('The display order must include every item in this group.', 400);
  }
}

async function syncLegacyGamePurchaseLink(link: GamePurchaseLink) {
  const sections = await prisma.recommendationSection.findMany({
    where: {
      purpose: 'GAME_PURCHASE',
      scenario: { code: { in: ['PASS_RECOMMENDED', 'PASS_MINIMUM'] } },
    },
    select: { id: true, scenario: { select: { code: true } } },
  });

  for (const section of sections) {
    await prisma.affiliateProduct.upsert({
      where: {
        legacySourceType_legacySourceId_sectionId: {
          legacySourceType: 'GamePurchaseLink',
          legacySourceId: link.id,
          sectionId: section.id,
        },
      },
      update: {
        title: link.title,
        retailer: link.retailer,
        affiliateUrl: link.affiliateUrl,
        imageUrl: link.imageUrl,
        priceText: link.releaseStatus,
        shortDescription: link.description,
        buttonText: link.buttonText,
        componentType: 'Game Purchase',
        platform: link.platform,
        enabled: link.enabled,
        displayOrder: link.displayOrder,
      },
      create: {
        id: `migrated-purchase-${link.id}-${section.scenario.code}`,
        sectionId: section.id,
        title: link.title,
        retailer: link.retailer,
        affiliateUrl: link.affiliateUrl,
        imageUrl: link.imageUrl,
        priceText: link.releaseStatus,
        shortDescription: link.description,
        badge: 'None',
        buttonText: link.buttonText,
        componentType: 'Game Purchase',
        platform: link.platform,
        enabled: link.enabled,
        displayOrder: link.displayOrder,
        legacySourceType: 'GamePurchaseLink',
        legacySourceId: link.id,
      },
    });
  }
}

function serializeScenario(scenario: ScenarioWithSections): RecommendationScenarioRecord {
  return {
    ...scenario,
    groupType: scenario.groupType as RecommendationScenarioRecord['groupType'],
    createdAt: scenario.createdAt.toISOString(),
    updatedAt: scenario.updatedAt.toISOString(),
    sections: scenario.sections.map(serializeSection),
  };
}

function serializeSection(section: SectionWithProducts): RecommendationSectionRecord {
  return {
    ...section,
    layout: section.layout as RecommendationSectionRecord['layout'],
    purpose: section.purpose as RecommendationSectionRecord['purpose'],
    createdAt: section.createdAt.toISOString(),
    updatedAt: section.updatedAt.toISOString(),
    products: section.products.map(serializeProduct),
  };
}

function serializeProduct(product: AffiliateProduct): AffiliateProductRecord {
  return {
    ...product,
    retailer: product.retailer as AffiliateProductRecord['retailer'],
    badge: product.badge as AffiliateProductRecord['badge'],
    componentType: product.componentType as AffiliateProductRecord['componentType'],
    platform: product.platform as AffiliateProductRecord['platform'],
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function serializeGamePurchaseLink(link: GamePurchaseLink): GamePurchaseLinkRecord {
  return {
    ...link,
    retailer: link.retailer as GamePurchaseLinkRecord['retailer'],
    platform: link.platform as GamePurchaseLinkRecord['platform'],
    releaseStatus: link.releaseStatus as GamePurchaseLinkRecord['releaseStatus'],
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  };
}
