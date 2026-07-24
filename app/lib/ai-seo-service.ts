import 'server-only';

import type { Prisma } from '../../generated/prisma/client';
import {
  getRequirementDisclaimer,
  getRequirementLabel,
} from '../data/gta6-requirements';
import type {
  AiSeoArticleContext,
  AiSeoGenerationInput,
  AiSeoProductContext,
  AiSeoSavedDraft,
  AiSeoWorkspace,
  GeneratedArticle,
} from './ai-seo-types';
import { getAiSeoProviderStatus, generateSeoArticle } from './ai-seo-provider';
import {
  createAvailableSlug,
  selectProductsForSeo,
  selectRelatedArticleCandidates,
} from './ai-seo-selection';
import { buildGeneratedArticleBody } from './ai-seo-content';
import { createAiSeoDraftInput } from './ai-seo-draft';
import { isPublicHttpsUrl } from './affiliate-validation';
import { affiliateProductIds } from './rich-text-shared';
import { sanitizeRichTextBody } from './rich-text';
import { createArticle, updateArticle } from './cms-data';
import type { ArticleInput } from './cms-validation';
import { prisma } from './prisma';
import type {
  ProductComponentType,
  ProductValueTier,
} from './affiliate-types';

const articleContextInclude = {
  categories: {
    include: {
      category: true,
    },
  },
} satisfies Prisma.ArticleInclude;

type ArticleContextRecord = Prisma.ArticleGetPayload<{
  include: typeof articleContextInclude;
}>;

export async function getAiSeoWorkspace(): Promise<AiSeoWorkspace> {
  const [products, articles] = await Promise.all([
    getEligibleProductRecords(),
    getPublishedArticleRecords(),
  ]);
  const productContexts = products.map(toProductContext);
  return {
    providerStatus: getAiSeoProviderStatus(),
    products: productContexts.map((product) => {
      const source = products.find((item) => item.id === product.id);
      return {
        ...product,
        retailer: source?.retailer ?? 'Other',
        imageUrl: source?.imageUrl ?? null,
      };
    }),
    publishedArticles: articles.map(toArticleContext),
    productCategories: Array.from(
      new Set(productContexts.map((product) => product.componentType)),
    ).sort((left, right) => left.localeCompare(right)),
  };
}

export async function generateAndSaveSeoDraft(
  input: AiSeoGenerationInput,
): Promise<AiSeoSavedDraft> {
  const [productRecords, publishedRecords, existingDraft] = await Promise.all([
    getEligibleProductRecords(),
    getPublishedArticleRecords(),
    input.articleId
      ? prisma.article.findUnique({ where: { id: input.articleId } })
      : Promise.resolve(null),
  ]);

  if (input.articleId && !existingDraft) {
    throw new AiSeoServiceError('The draft selected for regeneration no longer exists.', 404);
  }
  if (existingDraft && existingDraft.status !== 'draft') {
    throw new AiSeoServiceError('Only draft articles can be regenerated.', 409);
  }

  const allProducts = productRecords.map(toProductContext);
  const selectedProducts = selectProductsForSeo(allProducts, {
    topic: input.topic,
    categoryTypes: input.productCategories,
    specificProductIds: input.specificProductIds,
    maximum: 6,
  });
  const missingSpecificProductIds = input.specificProductIds.filter(
    (id) => !selectedProducts.some((product) => product.id === id),
  );
  if (missingSpecificProductIds.length) {
    throw new AiSeoServiceError(
      'One or more selected products are disabled, missing, or do not have a usable affiliate URL.',
      400,
    );
  }

  const allPublishedArticles = publishedRecords
    .filter((article) => article.id !== input.articleId)
    .map(toArticleContext);
  const articleCandidates = selectRelatedArticleCandidates(allPublishedArticles, {
    topic: input.topic,
    primaryKeyword: input.primaryKeyword,
    secondaryKeywords: input.secondaryKeywords,
    selectedArticleIds: input.relatedArticleIds,
    maximum: 20,
  });
  const missingSelectedArticleIds = input.relatedArticleIds.filter(
    (id) => !articleCandidates.some((article) => article.id === id),
  );
  if (missingSelectedArticleIds.length) {
    throw new AiSeoServiceError(
      'One or more selected related articles are no longer published.',
      400,
    );
  }

  const generated = await generateSeoArticle({
    ...input,
    products: selectedProducts,
    existingArticles: articleCandidates,
    requirements: {
      label: getRequirementLabel(),
      disclaimer: getRequirementDisclaimer(),
    },
  });
  const relatedArticleIds = mergeRelatedArticleIds(
    input.relatedArticleIds,
    generated.suggestedRelatedArticleIds,
    articleCandidates,
  );
  generated.suggestedRelatedArticleIds = relatedArticleIds;

  const slug = await createAvailableSlug(generated.slug || generated.h1, async (candidate) => {
    const match = await prisma.article.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return Boolean(match && match.id !== input.articleId);
  });
  const body = sanitizeRichTextBody(
    buildGeneratedArticleBody(generated, selectedProducts, articleCandidates),
  );
  const productIds = affiliateProductIds(body);

  if (!body.trim() || !generated.h1.trim() || generated.sections.length < 3) {
    throw new AiSeoServiceError(
      'The generated response was incomplete and was not saved.',
      422,
    );
  }
  if (
    generated.productRecommendations.length &&
    productIds.length !== new Set(generated.productRecommendations.map((item) => item.productId)).size
  ) {
    throw new AiSeoServiceError(
      'One or more generated product references could not be preserved safely.',
      422,
    );
  }

  const organization = chooseOrganization(
    generated,
    input,
    await getOrganizationRecords(),
  );
  const articleInput = createAiSeoDraftInput({
    generated,
    request: input,
    slug,
    body,
    relatedArticleIds,
    categoryIds: organization.categoryIds,
    primaryCategoryId: organization.primaryCategoryId,
    tagIds: organization.tagIds,
  });

  const saved = input.articleId
    ? await updateExistingDraft(input.articleId, articleInput)
    : await createArticle(articleInput);
  const stored = await prisma.article.findUnique({
    where: { id: saved.id },
    include: {
      relatedArticles: {
        orderBy: { displayOrder: 'asc' },
        select: { relatedArticleId: true },
      },
    },
  });
  if (!stored || stored.status !== 'draft') {
    throw new AiSeoServiceError('The generated draft could not be verified after saving.', 500);
  }

  return {
    id: stored.id,
    title: stored.title,
    slug: stored.slug,
    excerpt: stored.excerpt,
    status: 'draft',
    productIds: affiliateProductIds(stored.body),
    relatedArticleIds: stored.relatedArticles.map((item) => item.relatedArticleId),
    estimatedReadingTime: generated.estimatedReadingTime,
    featuredImagePrompt: stored.featuredImagePrompt,
    createdAt: stored.createdAt.toISOString(),
    updatedAt: stored.updatedAt.toISOString(),
  };
}

export class AiSeoServiceError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'AiSeoServiceError';
  }
}

async function getEligibleProductRecords() {
  const products = await prisma.product.findMany({
    where: { enabled: true },
    orderBy: [{ componentType: 'asc' }, { title: 'asc' }],
    include: {
      assignments: {
        where: { enabled: true },
        orderBy: { displayOrder: 'asc' },
        select: { badge: true },
        take: 1,
      },
    },
  });
  return products.filter((product) => isPublicHttpsUrl(product.affiliateUrl));
}

async function getPublishedArticleRecords() {
  const now = new Date();
  return prisma.article.findMany({
    where: {
      noindex: false,
      robotsIndex: true,
      OR: [
        { status: 'published', publishedAt: { lte: now } },
        { status: 'scheduled', scheduledAt: { lte: now } },
      ],
    },
    orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    take: 100,
    include: articleContextInclude,
  });
}

function toProductContext(
  product: Awaited<ReturnType<typeof getEligibleProductRecords>>[number],
): AiSeoProductContext {
  return {
    id: product.id,
    title: product.title,
    category: product.componentType as ProductComponentType,
    componentType: product.componentType as ProductComponentType,
    valueTier: product.valueTier as ProductValueTier | null,
    badge: product.assignments[0]?.badge ?? product.valueTier ?? 'None',
    notes: product.shortDescription,
  };
}

function toArticleContext(article: ArticleContextRecord): AiSeoArticleContext {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    focusKeyword: article.focusKeyword,
    categories: article.categories.map((item) => item.category.name),
  };
}

function mergeRelatedArticleIds(
  selectedIds: string[],
  generatedIds: string[],
  available: AiSeoArticleContext[],
) {
  const allowed = new Set(available.map((article) => article.id));
  const merged = Array.from(
    new Set([...selectedIds, ...generatedIds].filter((id) => allowed.has(id))),
  );
  if (merged.length < 3) {
    for (const article of available) {
      if (!merged.includes(article.id)) merged.push(article.id);
      if (merged.length >= 3) break;
    }
  }
  return merged.slice(0, 8);
}

async function getOrganizationRecords() {
  const [categories, tags] = await Promise.all([
    prisma.contentCategory.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] }),
    prisma.contentTag.findMany({ orderBy: { name: 'asc' } }),
  ]);
  return { categories, tags };
}

function chooseOrganization(
  generated: GeneratedArticle,
  input: AiSeoGenerationInput,
  organization: Awaited<ReturnType<typeof getOrganizationRecords>>,
) {
  const search = normalizeWords(
    `${input.topic} ${input.primaryKeyword} ${input.secondaryKeywords.join(' ')} ${input.productCategories.join(' ')}`,
  );
  const categoryIds = organization.categories
    .filter((category) => overlaps(search, normalizeWords(`${category.name} ${category.slug}`)))
    .slice(0, 3)
    .map((category) => category.id);
  const tagIds = organization.tags
    .filter((tag) =>
      overlaps(
        normalizeWords(
          `${generated.focusKeyword} ${generated.secondaryKeywords.join(' ')}`,
        ),
        normalizeWords(`${tag.name} ${tag.slug}`),
      ),
    )
    .slice(0, 8)
    .map((tag) => tag.id);
  return {
    categoryIds,
    primaryCategoryId: categoryIds[0] ?? null,
    tagIds,
  };
}

async function updateExistingDraft(id: string, input: ArticleInput) {
  await updateArticle(id, input);
  return { id };
}

function normalizeWords(value: string) {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2),
  );
}

function overlaps(left: Set<string>, right: Set<string>) {
  for (const value of left) if (right.has(value)) return true;
  return false;
}
