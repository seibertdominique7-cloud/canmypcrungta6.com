import 'dotenv/config';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client';
import { CORE_RECOMMENDATION_SCENARIOS } from '../app/data/recommendation-scenarios';
import { PREBUILT_RECOMMENDATION_GROUPS } from '../app/data/prebuilt-groups';
import {
  DEFAULT_RECOMMENDATION_SECTIONS,
  getDefaultSectionId,
} from '../app/data/recommendation-sections';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
});
const prisma = new PrismaClient({ adapter });

interface SeedAffiliateLink {
  id: string;
  scenarioCode: string;
  title: string;
  componentType: string;
  badge: string;
  displayOrder: number;
  enabled?: boolean;
  affiliateUrl?: string;
  retailer?: string;
  priceText?: string;
  shortDescription?: string;
  buttonText?: string;
}

const seedLinks: SeedAffiliateLink[] = [
  {
    id: 'seed-pass-recommended-controller',
    scenarioCode: 'PASS_RECOMMENDED',
    title: 'Gaming controller',
    componentType: 'Controller',
    badge: 'Recommended',
    displayOrder: 10,
  },
  {
    id: 'seed-pass-recommended-headset',
    scenarioCode: 'PASS_RECOMMENDED',
    title: 'Gaming headset',
    componentType: 'Headset',
    badge: 'Best Value',
    displayOrder: 20,
  },
  {
    id: 'seed-pass-recommended-nvme',
    scenarioCode: 'PASS_RECOMMENDED',
    title: '1 TB NVMe SSD',
    componentType: 'Storage',
    badge: 'Performance Pick',
    displayOrder: 30,
  },
  {
    id: 'seed-pass-minimum-rtx-4060',
    scenarioCode: 'PASS_MINIMUM',
    title: 'RTX 4060',
    componentType: 'GPU',
    badge: 'Budget Pick',
    displayOrder: 10,
  },
  {
    id: 'seed-pass-minimum-rx-7700-xt',
    scenarioCode: 'PASS_MINIMUM',
    title: 'RX 7700 XT',
    componentType: 'GPU',
    badge: 'Best Value',
    displayOrder: 20,
  },
  {
    id: 'seed-pass-minimum-32gb-ram',
    scenarioCode: 'PASS_MINIMUM',
    title: '32 GB RAM kit',
    componentType: 'RAM',
    badge: 'Recommended',
    displayOrder: 30,
  },
  {
    id: 'seed-fail-gpu-rtx-4060',
    scenarioCode: 'FAIL_GPU',
    title: 'RTX 4060',
    componentType: 'GPU',
    badge: 'Budget Pick',
    displayOrder: 10,
    enabled: true,
    affiliateUrl:
      'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4060-4060ti/',
    retailer: 'Other',
    priceText: 'See current options',
    shortDescription:
      'Explore NVIDIA GeForce RTX 4060 specifications and current buying options.',
    buttonText: 'View GPU options',
  },
  {
    id: 'seed-fail-gpu-rtx-4070',
    scenarioCode: 'FAIL_GPU',
    title: 'RTX 4070',
    componentType: 'GPU',
    badge: 'Performance Pick',
    displayOrder: 20,
    enabled: true,
    affiliateUrl:
      'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4070-family/',
    retailer: 'Other',
    priceText: 'See current options',
    shortDescription:
      'Explore NVIDIA GeForce RTX 4070 specifications and current buying options.',
    buttonText: 'View GPU options',
  },
  {
    id: 'seed-fail-gpu-rx-7700-xt',
    scenarioCode: 'FAIL_GPU',
    title: 'RX 7700 XT',
    componentType: 'GPU',
    badge: 'Best Value',
    displayOrder: 30,
  },
  {
    id: 'seed-fail-ram-ddr4',
    scenarioCode: 'FAIL_RAM',
    title: '32 GB DDR4 kit',
    componentType: 'RAM',
    badge: 'Budget Pick',
    displayOrder: 10,
  },
  {
    id: 'seed-fail-ram-ddr5',
    scenarioCode: 'FAIL_RAM',
    title: '32 GB DDR5 kit',
    componentType: 'RAM',
    badge: 'Performance Pick',
    displayOrder: 20,
  },
  {
    id: 'seed-fail-storage-1tb',
    scenarioCode: 'FAIL_STORAGE',
    title: '1 TB NVMe SSD',
    componentType: 'Storage',
    badge: 'Best Value',
    displayOrder: 10,
  },
  {
    id: 'seed-fail-storage-2tb',
    scenarioCode: 'FAIL_STORAGE',
    title: '2 TB NVMe SSD',
    componentType: 'Storage',
    badge: 'Performance Pick',
    displayOrder: 20,
  },
  {
    id: 'seed-fail-multiple-budget-prebuilt',
    scenarioCode: 'FAIL_MULTIPLE',
    title: 'Budget gaming prebuilt',
    componentType: 'Prebuilt PC',
    badge: 'Budget Pick',
    displayOrder: 10,
  },
  {
    id: 'seed-fail-multiple-midrange-prebuilt',
    scenarioCode: 'FAIL_MULTIPLE',
    title: 'Midrange gaming prebuilt',
    componentType: 'Prebuilt PC',
    badge: 'Best Value',
    displayOrder: 20,
  },
  {
    id: 'seed-fail-multiple-performance-prebuilt',
    scenarioCode: 'FAIL_MULTIPLE',
    title: 'Performance gaming prebuilt',
    componentType: 'Prebuilt PC',
    badge: 'Premium Pick',
    displayOrder: 30,
  },
];

async function main() {
  for (const scenario of CORE_RECOMMENDATION_SCENARIOS) {
    await prisma.recommendationScenario.upsert({
      where: { code: scenario.code },
      update: {
        isCore: true,
        groupType: 'SCENARIO',
      },
      create: {
        code: scenario.code,
        displayName: scenario.displayName,
        resultHeading: scenario.heading,
        resultDescription: scenario.description,
        displayOrder: scenario.displayOrder,
        enabled: true,
        isCore: true,
        groupType: 'SCENARIO',
      },
    });
  }

  for (const group of PREBUILT_RECOMMENDATION_GROUPS) {
    await prisma.recommendationScenario.upsert({
      where: { code: group.code },
      update: {
        isCore: true,
        groupType: 'PREBUILT',
      },
      create: {
        code: group.code,
        displayName: group.displayName,
        resultHeading: group.heading,
        resultDescription: group.description,
        displayOrder: group.displayOrder,
        enabled: true,
        isCore: true,
        groupType: 'PREBUILT',
      },
    });
  }

  const scenarios = await prisma.recommendationScenario.findMany({
    select: { id: true, code: true },
  });
  const scenarioIds = new Map(scenarios.map((scenario) => [scenario.code, scenario.id]));

  let defaultSectionCount = 0;

  for (const [scenarioCode, sections] of Object.entries(
    DEFAULT_RECOMMENDATION_SECTIONS,
  )) {
    const scenarioId = scenarioIds.get(scenarioCode);

    if (!scenarioId) continue;

    for (const [index, section] of sections.entries()) {
      await prisma.recommendationSection.upsert({
        where: { id: getDefaultSectionId(scenarioCode, section.key) },
        update: { isCore: true },
        create: {
          id: getDefaultSectionId(scenarioCode, section.key),
          scenarioId,
          title: section.title,
          description: section.description,
          enabled: true,
          displayOrder: (index + 1) * 10,
          maxProducts: section.maxProducts,
          collapsedByDefault: section.collapsedByDefault,
          layout: section.layout,
          purpose: section.purpose,
          isCore: true,
        },
      });
      defaultSectionCount += 1;
    }
  }

  for (const link of seedLinks) {
    const scenarioId = scenarioIds.get(link.scenarioCode);

    if (!scenarioId) {
      throw new Error(`Missing seeded scenario: ${link.scenarioCode}`);
    }

    const enabled = link.enabled ?? false;
    const affiliateUrl =
      link.affiliateUrl ?? `https://example.com/replace-me/${link.id}`;
    const retailer = link.retailer ?? 'Other';
    const priceText = link.priceText ?? 'Check current price';
    const shortDescription =
      link.shortDescription ??
      'Seed placeholder for testing. Replace the URL, image, and copy before publishing.';
    const buttonText = link.buttonText ?? 'View deal';

    await prisma.legacyAffiliateLink.upsert({
      where: { id: link.id },
      update: {
        title: link.title,
        retailer,
        affiliateUrl,
        priceText,
        badge: link.badge,
        shortDescription,
        buttonText,
        componentType: link.componentType,
        enabled,
        displayOrder: link.displayOrder,
        scenarioId,
      },
      create: {
        id: link.id,
        title: link.title,
        retailer,
        affiliateUrl,
        imageUrl: null,
        priceText,
        badge: link.badge,
        shortDescription,
        buttonText,
        componentType: link.componentType,
        enabled,
        displayOrder: link.displayOrder,
        scenarioId,
      },
    });

    const defaultSection = DEFAULT_RECOMMENDATION_SECTIONS[
      link.scenarioCode
    ]?.find((section) => section.purpose !== 'GAME_PURCHASE');

    if (!defaultSection) {
      throw new Error(`Missing default product section: ${link.scenarioCode}`);
    }

    await prisma.affiliateProduct.upsert({
      where: { id: link.id },
      update: {
        sectionId: getDefaultSectionId(link.scenarioCode, defaultSection.key),
        title: link.title,
        retailer,
        affiliateUrl,
        priceText,
        badge: link.badge,
        shortDescription,
        buttonText,
        componentType: link.componentType,
        enabled,
        displayOrder: link.displayOrder,
      },
      create: {
        id: link.id,
        sectionId: getDefaultSectionId(link.scenarioCode, defaultSection.key),
        title: link.title,
        retailer,
        affiliateUrl,
        imageUrl: null,
        priceText,
        badge: link.badge,
        shortDescription,
        buttonText,
        componentType: link.componentType,
        platform: null,
        enabled,
        displayOrder: link.displayOrder,
        legacySourceType: 'AffiliateLink',
        legacySourceId: link.id,
      },
    });
  }

  await migrateLegacyPrebuiltProducts();
  await migrateLegacyPurchaseLinks();
  await syncCatalogFromLegacy();

  console.log(
    `Seeded ${CORE_RECOMMENDATION_SCENARIOS.length} result scenarios, ${defaultSectionCount} editable sections, ${PREBUILT_RECOMMENDATION_GROUPS.length} preserved legacy prebuilt groups, and ${seedLinks.length} example affiliate products.`,
  );
}

async function migrateLegacyPrebuiltProducts() {
  const sectionKeyByGroupCode: Record<string, string> = {
    PREBUILT_DESKTOP_BUDGET: 'budget-gaming-desktops',
    PREBUILT_DESKTOP_HIGH_END: 'high-end-gaming-desktops',
    PREBUILT_LAPTOP_BUDGET: 'budget-gaming-laptops',
    PREBUILT_LAPTOP_HIGH_END: 'high-end-gaming-laptops',
  };
  const groups = await prisma.recommendationScenario.findMany({
    where: { groupType: 'PREBUILT' },
    include: { legacyAffiliateLinks: true },
  });

  for (const group of groups) {
    const sectionKey = sectionKeyByGroupCode[group.code];
    if (!sectionKey) continue;

    const destinationSectionIds = Object.entries(DEFAULT_RECOMMENDATION_SECTIONS)
      .filter(([, sections]) => sections.some((section) => section.key === sectionKey))
      .map(([scenarioCode]) => getDefaultSectionId(scenarioCode, sectionKey));

    for (const product of group.legacyAffiliateLinks) {
      for (const sectionId of destinationSectionIds) {
        await prisma.affiliateProduct.upsert({
          where: {
            legacySourceType_legacySourceId_sectionId: {
              legacySourceType: 'PrebuiltAffiliateLink',
              legacySourceId: product.id,
              sectionId,
            },
          },
          update: {},
          create: {
            id: `migrated-prebuilt-${product.id}-${sectionId}`,
            sectionId,
            title: product.title,
            retailer: product.retailer,
            affiliateUrl: product.affiliateUrl,
            imageUrl: product.imageUrl,
            priceText: product.priceText,
            shortDescription: product.shortDescription,
            badge: product.badge,
            buttonText: product.buttonText,
            componentType: product.componentType,
            platform: null,
            enabled: product.enabled,
            displayOrder: product.displayOrder,
            legacySourceType: 'PrebuiltAffiliateLink',
            legacySourceId: product.id,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
          },
        });
      }
    }
  }
}

async function migrateLegacyPurchaseLinks() {
  const purchaseLinks = await prisma.gamePurchaseLink.findMany();

  for (const purchase of purchaseLinks) {
    for (const scenarioCode of ['PASS_RECOMMENDED', 'PASS_MINIMUM']) {
      const sectionId = getDefaultSectionId(scenarioCode, 'gta-vi-purchase');

      await prisma.affiliateProduct.upsert({
        where: {
          legacySourceType_legacySourceId_sectionId: {
            legacySourceType: 'GamePurchaseLink',
            legacySourceId: purchase.id,
            sectionId,
          },
        },
        update: {},
        create: {
          id: `migrated-purchase-${purchase.id}-${scenarioCode}`,
          sectionId,
          title: purchase.title,
          retailer: purchase.retailer,
          affiliateUrl: purchase.affiliateUrl,
          imageUrl: purchase.imageUrl,
          priceText: purchase.releaseStatus,
          shortDescription: purchase.description,
          badge: 'None',
          buttonText: purchase.buttonText,
          componentType: 'Game Purchase',
          platform: purchase.platform,
          enabled: purchase.enabled,
          displayOrder: purchase.displayOrder,
          legacySourceType: 'GamePurchaseLink',
          legacySourceId: purchase.id,
          createdAt: purchase.createdAt,
          updatedAt: purchase.updatedAt,
        },
      });
    }
  }
}

async function syncCatalogFromLegacy() {
  const legacyProducts = await prisma.affiliateProduct.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  for (const legacy of legacyProducts) {
    const canonicalName = legacy.title.trim().replace(/\s+/g, ' ').toLowerCase();
    let product = await prisma.product.findFirst({
      where: { canonicalName, affiliateUrl: legacy.affiliateUrl },
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          id: legacy.id,
          title: legacy.title,
          canonicalName,
          componentType:
            legacy.componentType === 'Prebuilt PC'
              ? 'Prebuilt Desktop'
              : legacy.componentType === 'Game Purchase'
                ? 'Game'
                : legacy.componentType,
          shortDescription: legacy.shortDescription,
          imageUrl: legacy.imageUrl,
          retailer: legacy.retailer,
          affiliateUrl: legacy.affiliateUrl,
          defaultPriceText: legacy.priceText,
          platform: legacy.platform,
          enabled: legacy.enabled,
          createdAt: legacy.createdAt,
          updatedAt: legacy.updatedAt,
        },
      });
    }

    const assignmentId = `assignment-${legacy.id}`;
    const existingAssignment = await prisma.recommendationAssignment.findUnique({
      where: { id: assignmentId },
      select: { id: true },
    });

    if (!existingAssignment) {
      await prisma.recommendationAssignment.create({
        data: {
          id: assignmentId,
          productId: product.id,
          sectionId: legacy.sectionId,
          badge: legacy.badge,
          buttonText: legacy.buttonText,
          overridePriceText:
            legacy.priceText === product.defaultPriceText ? null : legacy.priceText,
          overrideDescription:
            legacy.shortDescription === product.shortDescription
              ? null
              : legacy.shortDescription,
          enabled: legacy.enabled,
          displayOrder: legacy.displayOrder,
          createdAt: legacy.createdAt,
          updatedAt: legacy.updatedAt,
        },
      });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
