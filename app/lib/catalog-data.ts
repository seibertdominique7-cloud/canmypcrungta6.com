import 'server-only';

import type {
  Product,
  RecommendationAssignment,
  RecommendationScenario,
  RecommendationSection,
} from '../../generated/prisma/client';
import type {
  AffiliateProductRecord,
  ProductRecord,
  RecommendationAssignmentRecord,
  RecommendationScenarioRecord,
  RecommendationWorkspace,
} from './affiliate-types';
import { AdminDataError } from './admin-data-error';
import {
  canonicalizeProductName,
  type AssignmentInput,
  type AssignmentUpdateInput,
  type ProductInput,
} from './catalog-validation';
import { prisma } from './prisma';

type ProductUsage = RecommendationAssignment & {
  section: RecommendationSection & { scenario: RecommendationScenario };
};
type ProductWithUsage = Product & { assignments: ProductUsage[] };
type AssignmentWithProduct = RecommendationAssignment & { product: Product };
type SectionWithAssignments = RecommendationSection & {
  assignments: AssignmentWithProduct[];
};
type ScenarioWithAssignments = RecommendationScenario & {
  sections: SectionWithAssignments[];
};

export async function getCatalogProducts(): Promise<ProductRecord[]> {
  const products = await prisma.product.findMany({
    orderBy: [{ title: 'asc' }, { createdAt: 'asc' }],
    include: {
      assignments: {
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
        include: { section: { include: { scenario: true } } },
      },
    },
  });

  return products.map(serializeCatalogProduct);
}

export async function getRecommendationWorkspace(): Promise<RecommendationWorkspace> {
  const [scenarios, products] = await Promise.all([
    prisma.recommendationScenario.findMany({
      where: { groupType: 'SCENARIO' },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        sections: {
          orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            assignments: {
              orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
              include: { product: true },
            },
          },
        },
      },
    }),
    getCatalogProducts(),
  ]);

  return {
    scenarios: scenarios.map(serializeWorkspaceScenario),
    products,
  };
}

export async function createCatalogProduct(input: ProductInput) {
  const canonicalName = canonicalizeProductName(input.title);
  const duplicate = await prisma.product.findFirst({
    where: { canonicalName, affiliateUrl: input.affiliateUrl },
    select: { id: true },
  });

  if (duplicate) {
    throw new AdminDataError('This exact product and affiliate URL already exist. Use the existing product.', 409);
  }

  return prisma.product.create({ data: { ...input, canonicalName } });
}

export async function updateCatalogProduct(id: string, input: ProductInput) {
  await prisma.product.findUniqueOrThrow({ where: { id } });
  const canonicalName = canonicalizeProductName(input.title);
  const duplicate = await prisma.product.findFirst({
    where: { canonicalName, affiliateUrl: input.affiliateUrl, id: { not: id } },
    select: { id: true },
  });

  if (duplicate) {
    throw new AdminDataError('This exact product and affiliate URL already exist. Use the existing product.', 409);
  }

  return prisma.product.update({ where: { id }, data: { ...input, canonicalName } });
}

export async function deleteCatalogProduct(id: string) {
  await prisma.product.findUniqueOrThrow({ where: { id } });
  return prisma.product.delete({ where: { id } });
}

export async function createRecommendationAssignments(input: AssignmentInput) {
  const products = await prisma.product.findMany({
    where: { id: { in: input.productIds } },
    select: { id: true },
  });
  const sections = await prisma.recommendationSection.findMany({
    where: { id: { in: input.sectionIds } },
    select: { id: true },
  });

  if (products.length !== input.productIds.length) {
    throw new AdminDataError('One or more selected products no longer exist.', 400);
  }
  if (sections.length !== input.sectionIds.length) {
    throw new AdminDataError('One or more destination sections no longer exist.', 400);
  }

  let created = 0;
  let skipped = 0;

  await prisma.$transaction(async (transaction) => {
    for (const sectionId of input.sectionIds) {
      const maximum = await transaction.recommendationAssignment.aggregate({
        where: { sectionId },
        _max: { displayOrder: true },
      });
      let displayOrder = input.displayOrder ?? (maximum._max.displayOrder ?? 0) + 10;

      if (input.displayOrder !== null) {
        await transaction.recommendationAssignment.updateMany({
          where: { sectionId, displayOrder: { gte: input.displayOrder } },
          data: { displayOrder: { increment: input.productIds.length * 10 } },
        });
      }

      for (const productId of input.productIds) {
        const duplicate = await transaction.recommendationAssignment.findFirst({
          where: { productId, sectionId },
          select: { id: true },
        });
        if (duplicate) {
          skipped += 1;
          continue;
        }

        await transaction.recommendationAssignment.create({
          data: {
            productId,
            sectionId,
            badge: input.badge,
            buttonText: input.buttonText,
            overridePriceText: input.overridePriceText,
            overrideDescription: input.overrideDescription,
            enabled: input.enabled,
            displayOrder,
          },
        });
        displayOrder += 10;
        created += 1;
      }
    }
  });

  return { created, skipped };
}

export async function updateRecommendationAssignment(
  id: string,
  input: AssignmentUpdateInput,
) {
  const existing = await prisma.recommendationAssignment.findUniqueOrThrow({ where: { id } });
  const section = await prisma.recommendationSection.findUnique({
    where: { id: input.sectionId },
    select: { id: true },
  });
  if (!section) throw new AdminDataError('Destination section does not exist.', 400);

  if (existing.sectionId !== input.sectionId) {
    const duplicate = await prisma.recommendationAssignment.findFirst({
      where: { productId: existing.productId, sectionId: input.sectionId, id: { not: id } },
      select: { id: true },
    });
    if (duplicate) {
      throw new AdminDataError('This product is already assigned to that section.', 409);
    }
  }

  return prisma.recommendationAssignment.update({
    where: { id },
    data: {
      ...input,
      displayOrder: input.displayOrder,
    },
  });
}

export async function deleteRecommendationAssignment(id: string) {
  return prisma.recommendationAssignment.delete({ where: { id } });
}

export async function bulkUpdateRecommendationAssignments(
  ids: string[],
  action: 'enable' | 'disable' | 'delete',
) {
  const uniqueIds = Array.from(new Set(ids)).slice(0, 500);
  if (uniqueIds.length === 0) throw new AdminDataError('Choose at least one assignment.', 400);

  if (action === 'delete') {
    return prisma.recommendationAssignment.deleteMany({ where: { id: { in: uniqueIds } } });
  }

  return prisma.recommendationAssignment.updateMany({
    where: { id: { in: uniqueIds } },
    data: { enabled: action === 'enable' },
  });
}

export async function moveRecommendationAssignment(id: string, direction: 'up' | 'down') {
  const current = await prisma.recommendationAssignment.findUniqueOrThrow({ where: { id } });
  const adjacent = await prisma.recommendationAssignment.findFirst({
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
    prisma.recommendationAssignment.update({
      where: { id: current.id },
      data: { displayOrder: adjacent.displayOrder },
    }),
    prisma.recommendationAssignment.update({
      where: { id: adjacent.id },
      data: { displayOrder: current.displayOrder },
    }),
  ]);
}

function serializeWorkspaceScenario(
  scenario: ScenarioWithAssignments,
): RecommendationScenarioRecord {
  return {
    ...scenario,
    groupType: scenario.groupType as RecommendationScenarioRecord['groupType'],
    createdAt: scenario.createdAt.toISOString(),
    updatedAt: scenario.updatedAt.toISOString(),
    sections: scenario.sections.map((section) => ({
      ...section,
      layout: section.layout as RecommendationScenarioRecord['sections'][number]['layout'],
      purpose: section.purpose as RecommendationScenarioRecord['sections'][number]['purpose'],
      createdAt: section.createdAt.toISOString(),
      updatedAt: section.updatedAt.toISOString(),
      assignments: section.assignments.map(serializeAssignment),
      products: section.assignments.map(flattenAssignmentProduct),
    })),
  };
}

function serializeAssignment(assignment: AssignmentWithProduct): RecommendationAssignmentRecord {
  return {
    ...assignment,
    badge: assignment.badge as RecommendationAssignmentRecord['badge'],
    product: serializeProductWithoutUsage(assignment.product),
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  };
}

function flattenAssignmentProduct(assignment: AssignmentWithProduct): AffiliateProductRecord {
  return {
    id: assignment.id,
    productId: assignment.productId,
    sectionId: assignment.sectionId,
    title: assignment.product.title,
    retailer: assignment.product.retailer as AffiliateProductRecord['retailer'],
    affiliateUrl: assignment.product.affiliateUrl,
    imageUrl: assignment.product.imageUrl,
    priceText: assignment.overridePriceText ?? assignment.product.defaultPriceText,
    badge: assignment.badge as AffiliateProductRecord['badge'],
    shortDescription: assignment.overrideDescription ?? assignment.product.shortDescription,
    buttonText: assignment.buttonText,
    componentType: assignment.product.componentType as AffiliateProductRecord['componentType'],
    platform: assignment.product.platform as AffiliateProductRecord['platform'],
    enabled: assignment.enabled && assignment.product.enabled,
    displayOrder: assignment.displayOrder,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  };
}

function serializeCatalogProduct(product: ProductWithUsage): ProductRecord {
  return {
    ...serializeProductWithoutUsage(product),
    usage: product.assignments.map((assignment) => ({
      assignmentId: assignment.id,
      sectionId: assignment.sectionId,
      sectionTitle: assignment.section.title,
      scenarioCode: assignment.section.scenario.code,
      scenarioName: assignment.section.scenario.displayName,
      assignmentEnabled: assignment.enabled,
    })),
  };
}

function serializeProductWithoutUsage(product: Product): ProductRecord {
  return {
    ...product,
    retailer: product.retailer as ProductRecord['retailer'],
    componentType: product.componentType as ProductRecord['componentType'],
    platform: product.platform as ProductRecord['platform'],
    usage: [],
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
