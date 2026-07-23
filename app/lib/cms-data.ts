import 'server-only';

import { randomUUID } from 'node:crypto';

import type { Prisma } from '../../generated/prisma/client';
import type {
  ArticleRecord,
  ContentCategoryRecord,
  ContentRevisionRecord,
  ContentTagRecord,
  ContentWorkspace,
  MediaAssetRecord,
  MediaFolderRecord,
  MediaUsageRecord,
  PageRecord,
  RedirectRecord,
  SiteContentRecord,
} from './cms-types';
import type { ArticleInput, PageInput } from './cms-validation';
import type { AffiliateRetailer, ProductComponentType } from './affiliate-types';
import { createSlug, validatePath } from './cms-validation';
import { AdminDataError } from './admin-data-error';
import { validateExternalImageUrl } from './media-validation';
import { prisma } from './prisma';
import {
  REQUIRED_PAGES,
  isRequiredPageKey,
  type RequiredPageKey,
} from '../data/required-pages';

const articleInclude = {
  categories: { include: { category: { include: { _count: { select: { articles: true } } } } } },
  tags: { include: { tag: { include: { _count: { select: { articles: true } } } } } },
  relatedArticles: { orderBy: { displayOrder: 'asc' as const }, select: { relatedArticleId: true } },
} satisfies Prisma.ArticleInclude;

type ArticleWithRelations = Prisma.ArticleGetPayload<{ include: typeof articleInclude }>;
type CategoryWithCount = Prisma.ContentCategoryGetPayload<{ include: { _count: { select: { articles: true } } } }>;
type TagWithCount = Prisma.ContentTagGetPayload<{ include: { _count: { select: { articles: true } } } }>;
type MediaWithFolder = Prisma.MediaAssetGetPayload<{ include: { folder: true } }>;
type MediaFolderWithCount = Prisma.MediaFolderGetPayload<{ include: { _count: { select: { media: true } } } }>;
const pageInclude = {
  faqEntries: { orderBy: [{ displayOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
} satisfies Prisma.ContentPageInclude;
type PageWithFaqs = Prisma.ContentPageGetPayload<{ include: typeof pageInclude }>;

export async function getContentWorkspace(): Promise<ContentWorkspace> {
  const [articles, pages, categories, tags, media, mediaFolders, affiliateProducts, revisions] = await Promise.all([
    prisma.article.findMany({ orderBy: { updatedAt: 'desc' }, include: articleInclude }),
    prisma.contentPage.findMany({ orderBy: { updatedAt: 'desc' }, include: pageInclude }),
    prisma.contentCategory.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { articles: true } } } }),
    prisma.contentTag.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { articles: true } } } }),
    prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, include: { folder: true } }),
    prisma.mediaFolder.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { media: true } } } }),
    prisma.product.findMany({
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        enabled: true,
        retailer: true,
        affiliateUrl: true,
        imageUrl: true,
        defaultPriceText: true,
        shortDescription: true,
        componentType: true,
        assignments: {
          where: { enabled: true },
          orderBy: { displayOrder: 'asc' },
          select: { badge: true },
          take: 1,
        },
      },
    }),
    prisma.contentRevision.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);
  return {
    articles: articles.map((article) => serializeArticle(article, revisions.filter((item) => item.contentKind === 'article' && item.contentId === article.id).slice(0, 20))),
    pages: pages.map((page) => serializePage(page, revisions.filter((item) => item.contentKind === 'page' && item.contentId === page.id).slice(0, 20))),
    categories: categories.map(serializeCategory),
    tags: tags.map(serializeTag),
    media: await Promise.all(media.map(serializeMedia)),
    mediaFolders: mediaFolders.map(serializeMediaFolder),
    affiliateProducts: affiliateProducts.map(({ defaultPriceText, assignments, ...product }) => ({
      ...product,
      retailer: product.retailer as AffiliateRetailer,
      componentType: product.componentType as ProductComponentType,
      priceText: defaultPriceText,
      badge: assignments[0]?.badge ?? 'None',
    })),
  };
}

export async function createArticle(input: ArticleInput) {
  await ensureUniqueSlug('article', input.slug);
  const publishedAt = input.status === 'published' ? input.publishedAt ?? new Date() : input.publishedAt;
  return prisma.article.create({
    data: {
      ...articleFields(input, publishedAt),
      categories: { create: input.categoryIds.map((categoryId) => ({ categoryId, isPrimary: categoryId === input.primaryCategoryId })) },
      tags: { create: input.tagIds.map((tagId) => ({ tagId })) },
      relatedArticles: { create: input.relatedArticleIds.map((relatedArticleId, displayOrder) => ({ relatedArticleId, displayOrder })) },
    },
  });
}

export async function updateArticle(id: string, input: ArticleInput) {
  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) throw new AdminDataError('Article not found.', 404);
  await ensureUniqueSlug('article', input.slug, id);
  await validateRelatedArticles(id, input.relatedArticleIds);
  const slugChanged = existing.slug !== input.slug;
  if (slugChanged && isEverPublished(existing.status, existing.publishedAt)) {
    await assertRedirectSafe(`/articles/${existing.slug}`, `/articles/${input.slug}`);
  }
  const publishedAt = input.status === 'published' ? input.publishedAt ?? existing.publishedAt ?? new Date() : input.publishedAt ?? existing.publishedAt;
  await prisma.$transaction(async (transaction) => {
    if (existing.title !== input.title || existing.body !== input.body) {
      await transaction.contentRevision.create({ data: { contentId: id, contentKind: 'article', titleSnapshot: existing.title, bodySnapshot: existing.body, editorIdentifier: 'admin' } });
    }
    await transaction.articleCategory.deleteMany({ where: { articleId: id } });
    await transaction.articleTag.deleteMany({ where: { articleId: id } });
    await transaction.articleRelated.deleteMany({ where: { articleId: id } });
    await transaction.article.update({
      where: { id },
      data: {
        ...articleFields(input, publishedAt),
        categories: { create: input.categoryIds.map((categoryId) => ({ categoryId, isPrimary: categoryId === input.primaryCategoryId })) },
        tags: { create: input.tagIds.map((tagId) => ({ tagId })) },
        relatedArticles: { create: input.relatedArticleIds.map((relatedArticleId, displayOrder) => ({ relatedArticleId, displayOrder })) },
      },
    });
    if (slugChanged && isEverPublished(existing.status, existing.publishedAt)) {
      await transaction.redirect.upsert({
        where: { sourcePath: `/articles/${existing.slug}` },
        update: { destinationPath: `/articles/${input.slug}`, statusCode: 301, enabled: true },
        create: { sourcePath: `/articles/${existing.slug}`, destinationPath: `/articles/${input.slug}`, statusCode: 301, enabled: true },
      });
    }
  });
  await trimRevisions('article', id);
}

export async function duplicateArticle(id: string) {
  const source = await prisma.article.findUnique({ where: { id }, include: articleInclude });
  if (!source) throw new AdminDataError('Article not found.', 404);
  const slug = await availableSlug('article', `${source.slug}-copy`);
  return prisma.article.create({
    data: {
      ...articleFields({ ...toArticleInput(source), title: `${source.title} Copy`, slug, status: 'draft', publishedAt: null, scheduledAt: null }, null),
      categories: { create: source.categories.map(({ categoryId, isPrimary }) => ({ categoryId, isPrimary })) },
      tags: { create: source.tags.map(({ tagId }) => ({ tagId })) },
      relatedArticles: { create: source.relatedArticles.map((item, displayOrder) => ({ relatedArticleId: item.relatedArticleId, displayOrder })) },
    },
  });
}

export async function deleteArticle(id: string) {
  await prisma.$transaction([
    prisma.contentRevision.deleteMany({ where: { contentKind: 'article', contentId: id } }),
    prisma.article.delete({ where: { id } }),
  ]);
}

export async function createPage(input: PageInput) {
  await ensureUniqueSlug('page', input.slug);
  return prisma.contentPage.create({
    data: {
      ...pageFields(input, input.status === 'published' ? input.publishedAt ?? new Date() : input.publishedAt),
      faqEntries: { create: faqEntryFields(input.faqEntries) },
    },
  });
}

export async function updatePage(id: string, input: PageInput) {
  const existing = await prisma.contentPage.findUnique({ where: { id }, include: pageInclude });
  if (!existing) throw new AdminDataError('Page not found.', 404);
  if (existing.requiredPageKey && existing.slug !== input.slug) {
    throw new AdminDataError('The slug for a required public page is fixed so its public URL remains stable.', 409);
  }
  await ensureUniqueSlug('page', input.slug, id);
  const slugChanged = existing.slug !== input.slug;
  if (slugChanged && isEverPublished(existing.status, existing.publishedAt)) await assertRedirectSafe(`/pages/${existing.slug}`, `/pages/${input.slug}`);
  const publishedAt = input.status === 'published' ? input.publishedAt ?? existing.publishedAt ?? new Date() : input.publishedAt ?? existing.publishedAt;
  await prisma.$transaction(async (transaction) => {
    if (existing.title !== input.title || existing.body !== input.body || faqSnapshot(existing.faqEntries) !== faqSnapshot(input.faqEntries)) await transaction.contentRevision.create({ data: { contentId: id, contentKind: 'page', titleSnapshot: existing.title, bodySnapshot: existing.body, structuredSnapshot: faqSnapshot(existing.faqEntries), editorIdentifier: 'admin' } });
    await transaction.faqEntry.deleteMany({ where: { pageId: id } });
    await transaction.contentPage.update({
      where: { id },
      data: {
        ...pageFields(input, publishedAt),
        faqEntries: { create: faqEntryFields(input.faqEntries) },
      },
    });
    if (slugChanged && isEverPublished(existing.status, existing.publishedAt)) await transaction.redirect.upsert({ where: { sourcePath: `/pages/${existing.slug}` }, update: { destinationPath: `/pages/${input.slug}`, statusCode: 301, enabled: true }, create: { sourcePath: `/pages/${existing.slug}`, destinationPath: `/pages/${input.slug}`, statusCode: 301, enabled: true } });
  });
  await trimRevisions('page', id);
}

export async function duplicatePage(id: string) {
  const source = await prisma.contentPage.findUnique({ where: { id }, include: pageInclude });
  if (!source) throw new AdminDataError('Page not found.', 404);
  return prisma.contentPage.create({
    data: {
      ...pageFields(toPageInput(source), null),
      title: `${source.title} Copy`,
      slug: await availableSlug('page', `${source.slug}-copy`),
      status: 'draft',
      publishedAt: null,
      showInNavigation: false,
      showInFooter: false,
      requiredPageKey: null,
      faqEntries: { create: faqEntryFields(toPageInput(source).faqEntries) },
    },
  });
}

export async function deletePage(id: string) {
  const page = await prisma.contentPage.findUnique({ where: { id }, select: { requiredPageKey: true } });
  if (!page) throw new AdminDataError('Page not found.', 404);
  if (page.requiredPageKey) throw new AdminDataError('Required public pages cannot be deleted. Disable or unpublish the page instead.', 409);
  await prisma.$transaction([prisma.contentRevision.deleteMany({ where: { contentKind: 'page', contentId: id } }), prisma.contentPage.delete({ where: { id } })]);
}

export async function restoreRevision(kind: 'article' | 'page', contentId: string, revisionId: string) {
  const revision = await prisma.contentRevision.findFirst({ where: { id: revisionId, contentKind: kind, contentId } });
  if (!revision) throw new AdminDataError('Revision not found.', 404);
  if (kind === 'article') {
    const current = await prisma.article.findUnique({ where: { id: contentId } });
    if (!current) throw new AdminDataError('Article not found.', 404);
    await prisma.$transaction([prisma.contentRevision.create({ data: { contentId, contentKind: kind, titleSnapshot: current.title, bodySnapshot: current.body, editorIdentifier: 'admin-before-restore' } }), prisma.article.update({ where: { id: contentId }, data: { title: revision.titleSnapshot, body: revision.bodySnapshot } })]);
  } else {
    const current = await prisma.contentPage.findUnique({ where: { id: contentId }, include: pageInclude });
    if (!current) throw new AdminDataError('Page not found.', 404);
    const restoredFaqs = parseFaqSnapshot(revision.structuredSnapshot);
    await prisma.$transaction(async (transaction) => {
      await transaction.contentRevision.create({ data: { contentId, contentKind: kind, titleSnapshot: current.title, bodySnapshot: current.body, structuredSnapshot: faqSnapshot(current.faqEntries), editorIdentifier: 'admin-before-restore' } });
      if (restoredFaqs) await transaction.faqEntry.deleteMany({ where: { pageId: contentId } });
      await transaction.contentPage.update({ where: { id: contentId }, data: { title: revision.titleSnapshot, body: revision.bodySnapshot, ...(restoredFaqs ? { faqEntries: { create: faqEntryFields(restoredFaqs) } } : {}) } });
    });
  }
  await trimRevisions(kind, contentId);
}

export async function moveNavigationPage(id: string, direction: 'up' | 'down') {
  const current = await prisma.contentPage.findUnique({ where: { id } });
  if (!current) throw new AdminDataError('Page not found.', 404);
  const adjacent = await prisma.contentPage.findFirst({ where: { showInNavigation: true, navigationOrder: direction === 'up' ? { lt: current.navigationOrder } : { gt: current.navigationOrder } }, orderBy: { navigationOrder: direction === 'up' ? 'desc' : 'asc' } });
  if (!adjacent) return;
  await prisma.$transaction([prisma.contentPage.update({ where: { id }, data: { navigationOrder: adjacent.navigationOrder } }), prisma.contentPage.update({ where: { id: adjacent.id }, data: { navigationOrder: current.navigationOrder } })]);
}

export async function getCategories() {
  return (await prisma.contentCategory.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { articles: true } } } })).map(serializeCategory);
}

export async function saveCategory(input: { name: string; slug: string; description: string; imageUrl: string | null; seoTitle: string; metaDescription: string }, id?: string) {
  const data = { ...input, name: input.name.trim(), slug: createSlug(input.slug || input.name), description: input.description.trim(), seoTitle: input.seoTitle.trim(), metaDescription: input.metaDescription.trim() };
  if (!data.name || !data.slug) throw new AdminDataError('Category name and slug are required.', 400);
  const duplicate = await prisma.contentCategory.findFirst({ where: { slug: data.slug, ...(id ? { id: { not: id } } : {}) } });
  if (duplicate) throw new AdminDataError('That category slug is already in use.', 409);
  if (id) return prisma.contentCategory.update({ where: { id }, data });
  const maximum = await prisma.contentCategory.aggregate({ _max: { displayOrder: true } });
  return prisma.contentCategory.create({ data: { ...data, displayOrder: (maximum._max.displayOrder ?? 0) + 10 } });
}

export async function deleteCategory(id: string) {
  const category = await prisma.contentCategory.findUnique({ where: { id }, include: { _count: { select: { articles: true } } } });
  if (!category) throw new AdminDataError('Category not found.', 404);
  if (category._count.articles) throw new AdminDataError('Only unused categories can be deleted. Merge or reassign its articles first.', 409);
  await prisma.contentCategory.delete({ where: { id } });
}

export async function mergeCategory(sourceId: string, targetId: string) {
  if (sourceId === targetId) throw new AdminDataError('Choose a different destination category.', 400);
  const [source, target] = await Promise.all([prisma.contentCategory.findUnique({ where: { id: sourceId }, include: { articles: true } }), prisma.contentCategory.findUnique({ where: { id: targetId } })]);
  if (!source || !target) throw new AdminDataError('Category not found.', 404);
  await prisma.$transaction(async (transaction) => {
    for (const link of source.articles) {
      const existing = await transaction.articleCategory.findUnique({ where: { articleId_categoryId: { articleId: link.articleId, categoryId: targetId } } });
      if (existing) {
        if (link.isPrimary && !existing.isPrimary) await transaction.articleCategory.update({ where: { articleId_categoryId: { articleId: link.articleId, categoryId: targetId } }, data: { isPrimary: true } });
      } else {
        await transaction.articleCategory.create({ data: { articleId: link.articleId, categoryId: targetId, isPrimary: link.isPrimary } });
      }
    }
    await transaction.articleCategory.deleteMany({ where: { categoryId: sourceId } });
    await transaction.contentCategory.delete({ where: { id: sourceId } });
  });
}

export async function moveCategory(id: string, direction: 'up' | 'down') {
  const current = await prisma.contentCategory.findUnique({ where: { id } });
  if (!current) throw new AdminDataError('Category not found.', 404);
  const adjacent = await prisma.contentCategory.findFirst({ where: { displayOrder: direction === 'up' ? { lt: current.displayOrder } : { gt: current.displayOrder } }, orderBy: { displayOrder: direction === 'up' ? 'desc' : 'asc' } });
  if (!adjacent) return;
  await prisma.$transaction([prisma.contentCategory.update({ where: { id }, data: { displayOrder: adjacent.displayOrder } }), prisma.contentCategory.update({ where: { id: adjacent.id }, data: { displayOrder: current.displayOrder } })]);
}

export async function getTags() {
  return (await prisma.contentTag.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { articles: true } } } })).map(serializeTag);
}

export async function getCategoryBySlug(slug: string) {
  const item = await prisma.contentCategory.findUnique({ where: { slug }, include: { _count: { select: { articles: true } } } });
  return item ? serializeCategory(item) : null;
}

export async function getTagBySlug(slug: string) {
  const item = await prisma.contentTag.findUnique({ where: { slug }, include: { _count: { select: { articles: true } } } });
  return item ? serializeTag(item) : null;
}

export async function saveTag(input: { name: string; slug: string }, id?: string) {
  const data = { name: input.name.trim(), slug: createSlug(input.slug || input.name) };
  if (!data.name || !data.slug) throw new AdminDataError('Tag name and slug are required.', 400);
  const duplicate = await prisma.contentTag.findFirst({ where: { slug: data.slug, ...(id ? { id: { not: id } } : {}) } });
  if (duplicate) throw new AdminDataError('That tag slug is already in use.', 409);
  return id ? prisma.contentTag.update({ where: { id }, data }) : prisma.contentTag.create({ data });
}

export async function deleteTag(id: string) {
  const tag = await prisma.contentTag.findUnique({ where: { id }, include: { _count: { select: { articles: true } } } });
  if (!tag) throw new AdminDataError('Tag not found.', 404);
  if (tag._count.articles) throw new AdminDataError('Only unused tags can be deleted. Merge or remove its article links first.', 409);
  await prisma.contentTag.delete({ where: { id } });
}

export async function mergeTag(sourceId: string, targetId: string) {
  if (sourceId === targetId) throw new AdminDataError('Choose a different destination tag.', 400);
  const source = await prisma.contentTag.findUnique({ where: { id: sourceId }, include: { articles: true } });
  if (!source || !(await prisma.contentTag.findUnique({ where: { id: targetId } }))) throw new AdminDataError('Tag not found.', 404);
  await prisma.$transaction(async (transaction) => {
    for (const link of source.articles) await transaction.articleTag.upsert({ where: { articleId_tagId: { articleId: link.articleId, tagId: targetId } }, update: {}, create: { articleId: link.articleId, tagId: targetId } });
    await transaction.articleTag.deleteMany({ where: { tagId: sourceId } });
    await transaction.contentTag.delete({ where: { id: sourceId } });
  });
}

export async function getSiteContent(): Promise<SiteContentRecord[]> {
  return (await prisma.siteContent.findMany({ orderBy: [{ group: 'asc' }, { label: 'asc' }] })).map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() }));
}

export async function getSiteContentMap() {
  const items = await prisma.siteContent.findMany();
  return Object.fromEntries(items.map((item) => [item.key, item.value])) as Record<string, string>;
}

export async function updateSiteContent(items: Array<{ key: string; value: string }>) {
  const unique = new Map(items.filter((item) => item.key && typeof item.value === 'string').map((item) => [item.key, item.value.slice(0, 10000)]));
  await prisma.$transaction(Array.from(unique, ([key, value]) => prisma.siteContent.update({ where: { key }, data: { value } })));
}

export async function getRedirects(): Promise<RedirectRecord[]> {
  return (await prisma.redirect.findMany({ orderBy: { updatedAt: 'desc' } })).map(serializeRedirect);
}

export async function saveRedirect(input: { sourcePath: string; destinationPath: string; statusCode: number; enabled: boolean }, id?: string) {
  const source = validatePath(input.sourcePath, 'Source path');
  const destination = validatePath(input.destinationPath, 'Destination path');
  if (source.error || destination.error) throw new AdminDataError(source.error || destination.error, 400);
  if (![301, 302, 307, 308].includes(input.statusCode)) throw new AdminDataError('Choose a supported redirect status code.', 400);
  await assertRedirectSafe(source.value, destination.value, id);
  const duplicate = await prisma.redirect.findFirst({ where: { sourcePath: source.value, ...(id ? { id: { not: id } } : {}) } });
  if (duplicate) throw new AdminDataError('That source path already has a redirect.', 409);
  const data = { sourcePath: source.value, destinationPath: destination.value, statusCode: input.statusCode, enabled: input.enabled };
  return id ? prisma.redirect.update({ where: { id }, data }) : prisma.redirect.create({ data });
}

export async function deleteRedirect(id: string) { await prisma.redirect.delete({ where: { id } }); }

export async function findRedirect(sourcePath: string) {
  return prisma.redirect.findUnique({ where: { sourcePath, enabled: true } });
}

export async function getPublishedArticles(page = 1, pageSize = 12, filter?: { categorySlug?: string; tagSlug?: string }) {
  const now = new Date();
  const where: Prisma.ArticleWhereInput = {
    ...publicArticleWhere(now),
    ...(filter?.categorySlug ? { categories: { some: { category: { slug: filter.categorySlug } } } } : {}),
    ...(filter?.tagSlug ? { tags: { some: { tag: { slug: filter.tagSlug } } } } : {}),
  };
  const [items, total] = await Promise.all([prisma.article.findMany({ where, orderBy: [{ publishedAt: 'desc' }, { scheduledAt: 'desc' }, { createdAt: 'desc' }], skip: (Math.max(1, page) - 1) * pageSize, take: pageSize, include: articleInclude }), prisma.article.count({ where })]);
  return { articles: items.map((item) => serializeArticle(item)), total, page: Math.max(1, page), pageSize };
}

export async function getPublishedArticleBySlug(slug: string) {
  const article = await prisma.article.findFirst({ where: { slug, ...publicArticleWhere(new Date()) }, include: articleInclude });
  return article ? serializeArticle(article) : null;
}

export async function getPublishedPageBySlug(slug: string) {
  const page = await prisma.contentPage.findFirst({ where: { slug, status: 'published', enabled: true }, include: pageInclude });
  return page ? serializePage(page) : null;
}

export async function getPublishedRequiredPage(key: string) {
  if (!isRequiredPageKey(key)) return null;
  const page = await prisma.contentPage.findFirst({
    where: { requiredPageKey: key, status: 'published', enabled: true },
    include: { faqEntries: { where: { enabled: true }, orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }] } },
  });
  return page ? serializePage(page) : null;
}

export async function getArticlePreview(id: string) {
  const [article, revisions] = await Promise.all([prisma.article.findUnique({ where: { id }, include: articleInclude }), prisma.contentRevision.findMany({ where: { contentKind: 'article', contentId: id }, orderBy: { createdAt: 'desc' }, take: 20 })]);
  return article ? serializeArticle(article, revisions) : null;
}

export async function getPagePreview(id: string) {
  const [page, revisions] = await Promise.all([prisma.contentPage.findUnique({ where: { id }, include: pageInclude }), prisma.contentRevision.findMany({ where: { contentKind: 'page', contentId: id }, orderBy: { createdAt: 'desc' }, take: 20 })]);
  return page ? serializePage(page, revisions) : null;
}

export async function getRelatedArticles(article: ArticleRecord, limit = 4) {
  const manual = article.relatedArticleIds.length ? await prisma.article.findMany({ where: { id: { in: article.relatedArticleIds }, ...publicArticleWhere(new Date()) }, include: articleInclude }) : [];
  const manualIds = new Set(manual.map((item) => item.id));
  const categoryIds = article.categories.map((item) => item.id);
  const tagIds = article.tags.map((item) => item.id);
  const automatic = await prisma.article.findMany({
    where: {
      id: { notIn: [article.id, ...manualIds] },
      AND: [
        publicArticleWhere(new Date()),
        { OR: [{ categories: { some: { categoryId: { in: categoryIds } } } }, { tags: { some: { tagId: { in: tagIds } } } }] },
      ],
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    include: articleInclude,
  });
  return [...manual, ...automatic].slice(0, limit).map((item) => serializeArticle(item));
}

export async function getRecentArticles(limit = 5) {
  return (await prisma.article.findMany({ where: publicArticleWhere(new Date()), orderBy: [{ publishedAt: 'desc' }, { scheduledAt: 'desc' }], take: limit, include: articleInclude })).map((item) => serializeArticle(item));
}

export async function getHomepageArticles(limit = 3) {
  const now = new Date();
  const items = await prisma.article.findMany({
    where: {
      status: 'published',
      noindex: false,
      robotsIndex: true,
      OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
    },
    orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: Math.min(3, Math.max(1, limit)),
    include: articleInclude,
  });
  return items.map((item) => serializeArticle(item));
}

export async function getNavigationPages() {
  return prisma.contentPage.findMany({ where: { status: 'published', enabled: true, showInNavigation: true }, orderBy: [{ navigationOrder: 'asc' }, { title: 'asc' }], select: { slug: true, title: true, navigationLabel: true, requiredPageKey: true } });
}

export async function getFooterPages() {
  return prisma.contentPage.findMany({
    where: { status: 'published', enabled: true, showInFooter: true },
    orderBy: [{ footerGroup: 'asc' }, { footerOrder: 'asc' }, { title: 'asc' }],
    select: { slug: true, title: true, requiredPageKey: true, footerLabel: true, footerGroup: true, footerOrder: true },
  });
}

export async function restoreMissingRequiredPages() {
  let created = 0;
  let linked = 0;

  for (const definition of REQUIRED_PAGES) {
    const keyed = await prisma.contentPage.findUnique({
      where: { requiredPageKey: definition.key },
      select: { id: true },
    });
    if (keyed) continue;

    const equivalent = await prisma.contentPage.findFirst({
      where: {
        OR: [
          { slug: { in: definition.aliases } },
          { title: definition.title },
        ],
      },
      include: { faqEntries: { select: { id: true } } },
    });

    if (equivalent) {
      await prisma.contentPage.update({
        where: { id: equivalent.id },
        data: {
          requiredPageKey: definition.key,
          ...(definition.faqEntries?.length && !equivalent.faqEntries.length
            ? {
                faqEntries: {
                  create: definition.faqEntries.map((entry) => ({ ...entry, enabled: true })),
                },
              }
            : {}),
        },
      });
      linked += 1;
      continue;
    }

    await prisma.contentPage.create({
      data: {
        title: definition.title,
        slug: definition.key,
        excerpt: definition.excerpt,
        body: definition.body,
        status: 'published',
        enabled: true,
        requiredPageKey: definition.key,
        pageTemplate: definition.pageTemplate,
        publishedAt: new Date(),
        seoTitle: definition.seoTitle,
        metaDescription: definition.metaDescription,
        schemaType: definition.schemaType,
        showInFooter: true,
        footerLabel: definition.footerLabel,
        footerGroup: definition.footerGroup,
        footerOrder: definition.footerOrder,
        faqEntries: definition.faqEntries?.length
          ? { create: definition.faqEntries.map((entry) => ({ ...entry, enabled: true })) }
          : undefined,
      },
    });
    created += 1;
  }

  return { created, linked };
}

export async function getMediaAssets(): Promise<MediaAssetRecord[]> {
  return Promise.all((await prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, include: { folder: true } })).map(serializeMedia));
}

export async function createMediaAsset(input: { filename: string; originalFilename: string; url: string; sourceType: 'upload' | 'external'; storageProvider: string; mimeType: string; width: number | null; height: number | null; fileSize: number; altText: string; title: string; storageKey: string; folderId?: string | null }) {
  if (input.folderId) await requireMediaFolder(input.folderId);
  return prisma.mediaAsset.create({ data: input });
}

export async function createExternalMediaAsset(input: { url: string; altText: string; title: string; folderId?: string | null }) {
  const result = validateExternalImageUrl(input.url);
  if (!result.ok) throw new AdminDataError(result.error, 400);
  if (input.folderId) await requireMediaFolder(input.folderId);
  const originalFilename = externalFilename(result.value);
  return prisma.mediaAsset.create({ data: { filename: originalFilename, originalFilename, url: result.value, sourceType: 'external', storageProvider: 'external', mimeType: 'image/external', width: null, height: null, fileSize: 0, altText: input.altText.trim().slice(0, 300), title: input.title.trim().slice(0, 180) || originalFilename, storageKey: `external:${randomUUID()}`, folderId: input.folderId || null } });
}

export async function updateMediaAsset(id: string, input: { altText: string; title: string; folderId?: string | null }) {
  if (input.folderId) await requireMediaFolder(input.folderId);
  return prisma.mediaAsset.update({ where: { id }, data: { altText: input.altText.trim().slice(0, 300), title: input.title.trim().slice(0, 180), ...(input.folderId !== undefined ? { folderId: input.folderId || null } : {}) } });
}

export async function deleteMediaAsset(id: string) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) throw new AdminDataError('Media item not found.', 404);
  const usages = await getMediaUsage(asset.url);
  if (usages.length) throw new AdminDataError(`This image is still used in ${usages.length} content location${usages.length === 1 ? '' : 's'}. Open “View usage” before replacing or removing it.`, 409);
  await prisma.mediaAsset.delete({ where: { id } });
  return asset;
}

export async function replaceMediaAsset(id: string, replacementId: string) {
  if (id === replacementId) throw new AdminDataError('Choose a different replacement image.', 400);
  const [asset, replacement] = await Promise.all([prisma.mediaAsset.findUnique({ where: { id } }), prisma.mediaAsset.findUnique({ where: { id: replacementId } })]);
  if (!asset || !replacement) throw new AdminDataError('The original or replacement image could not be found.', 404);
  const oldUrl = asset.url; const newUrl = replacement.url;
  await prisma.$transaction(async (transaction) => {
    const [articleBodies, pageBodies, siteValues] = await Promise.all([
      transaction.article.findMany({ where: { body: { contains: oldUrl } }, select: { id: true, body: true } }),
      transaction.contentPage.findMany({ where: { body: { contains: oldUrl } }, select: { id: true, body: true } }),
      transaction.siteContent.findMany({ where: { value: { contains: oldUrl } }, select: { key: true, value: true } }),
    ]);
    await Promise.all([
      transaction.article.updateMany({ where: { featuredImage: oldUrl }, data: { featuredImage: newUrl } }),
      transaction.article.updateMany({ where: { openGraphImage: oldUrl }, data: { openGraphImage: newUrl } }),
      transaction.article.updateMany({ where: { twitterImage: oldUrl }, data: { twitterImage: newUrl } }),
      transaction.contentPage.updateMany({ where: { featuredImage: oldUrl }, data: { featuredImage: newUrl } }),
      transaction.contentPage.updateMany({ where: { openGraphImage: oldUrl }, data: { openGraphImage: newUrl } }),
      transaction.contentPage.updateMany({ where: { twitterImage: oldUrl }, data: { twitterImage: newUrl } }),
      transaction.contentCategory.updateMany({ where: { imageUrl: oldUrl }, data: { imageUrl: newUrl } }),
      transaction.product.updateMany({ where: { imageUrl: oldUrl }, data: { imageUrl: newUrl } }),
      transaction.affiliateProduct.updateMany({ where: { imageUrl: oldUrl }, data: { imageUrl: newUrl } }),
      transaction.legacyAffiliateLink.updateMany({ where: { imageUrl: oldUrl }, data: { imageUrl: newUrl } }),
      transaction.gamePurchaseLink.updateMany({ where: { imageUrl: oldUrl }, data: { imageUrl: newUrl } }),
      ...articleBodies.map((item) => transaction.article.update({ where: { id: item.id }, data: { body: item.body.replaceAll(oldUrl, newUrl) } })),
      ...pageBodies.map((item) => transaction.contentPage.update({ where: { id: item.id }, data: { body: item.body.replaceAll(oldUrl, newUrl) } })),
      ...siteValues.map((item) => transaction.siteContent.update({ where: { key: item.key }, data: { value: item.value.replaceAll(oldUrl, newUrl) } })),
    ]);
    await transaction.mediaAsset.delete({ where: { id } });
  });
  return asset;
}

export async function getMediaFolders(): Promise<MediaFolderRecord[]> {
  return (await prisma.mediaFolder.findMany({ orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { media: true } } } })).map(serializeMediaFolder);
}

export async function saveMediaFolder(input: { name: string }, id?: string) {
  const name = input.name.trim().slice(0, 80); const slug = createSlug(name);
  if (!name || !slug) throw new AdminDataError('Folder name is required.', 400);
  const duplicate = await prisma.mediaFolder.findFirst({ where: { slug, ...(id ? { id: { not: id } } : {}) } });
  if (duplicate) throw new AdminDataError('A media folder with that name already exists.', 409);
  if (id) return prisma.mediaFolder.update({ where: { id }, data: { name, slug } });
  const maximum = await prisma.mediaFolder.aggregate({ _max: { displayOrder: true } });
  return prisma.mediaFolder.create({ data: { name, slug, displayOrder: (maximum._max.displayOrder ?? 0) + 10 } });
}

export async function deleteMediaFolder(id: string) {
  const folder = await prisma.mediaFolder.findUnique({ where: { id }, include: { _count: { select: { media: true } } } });
  if (!folder) throw new AdminDataError('Media folder not found.', 404);
  if (folder._count.media) throw new AdminDataError('Move images out of this folder before deleting it.', 409);
  await prisma.mediaFolder.delete({ where: { id } });
}

export async function getCmsSummary() {
  const [articles, publishedArticles, pages, categories, tags, media, redirects, subscribers, products] = await Promise.all([
    prisma.article.count(), prisma.article.count({ where: publicArticleWhere(new Date()) }), prisma.contentPage.count(), prisma.contentCategory.count(), prisma.contentTag.count(), prisma.mediaAsset.count(), prisma.redirect.count({ where: { enabled: true } }), prisma.emailSubscriber.count(), prisma.product.count(),
  ]);
  return { articles, publishedArticles, pages, categories, tags, media, redirects, subscribers, products };
}

export async function getIndexableContent() {
  const now = new Date();
  const [articles, pages, categories, tags] = await Promise.all([
    prisma.article.findMany({ where: { ...publicArticleWhere(now), noindex: false, robotsIndex: true }, select: { slug: true, updatedAt: true, featuredImage: true } }),
    prisma.contentPage.findMany({ where: { status: 'published', enabled: true, noindex: false, robotsIndex: true }, select: { slug: true, requiredPageKey: true, updatedAt: true, featuredImage: true } }),
    prisma.contentCategory.findMany({ where: { articles: { some: { article: publicArticleWhere(now) } } }, select: { slug: true, updatedAt: true } }),
    prisma.contentTag.findMany({ where: { articles: { some: { article: publicArticleWhere(now) } } }, select: { slug: true, updatedAt: true } }),
  ]);
  return { articles, pages, categories, tags };
}

export async function getNewsArticles() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  return prisma.article.findMany({
    where: {
      contentType: 'news',
      noindex: false,
      robotsIndex: true,
      AND: [publicArticleWhere(new Date()), { OR: [{ publishedAt: { gte: cutoff } }, { scheduledAt: { gte: cutoff } }] }],
    },
    orderBy: { publishedAt: 'desc' },
    select: { slug: true, title: true, publishedAt: true, scheduledAt: true },
  });
}

function articleFields(input: ArticleInput, publishedAt: Date | null) {
  return {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    body: input.body,
    featuredImage: input.featuredImage,
    authorName: input.authorName,
    status: input.status,
    publishedAt,
    scheduledAt: input.scheduledAt,
    featured: input.featured,
    contentType: input.contentType,
    seoTitle: input.seoTitle,
    metaDescription: input.metaDescription,
    canonicalUrl: input.canonicalUrl,
    openGraphTitle: input.openGraphTitle,
    openGraphDescription: input.openGraphDescription,
    openGraphImage: input.openGraphImage,
    twitterTitle: input.twitterTitle,
    twitterDescription: input.twitterDescription,
    twitterImage: input.twitterImage,
    robotsIndex: input.robotsIndex,
    robotsFollow: input.robotsFollow,
    focusKeyword: input.focusKeyword,
    schemaType: input.schemaType,
    noindex: input.noindex,
  };
}

function pageFields(input: PageInput, publishedAt: Date | null) {
  return {
    title: input.title,
    slug: input.slug,
    body: input.body,
    excerpt: input.excerpt,
    featuredImage: input.featuredImage,
    status: input.status,
    pageTemplate: input.pageTemplate,
    navigationLabel: input.navigationLabel,
    showInNavigation: input.showInNavigation,
    navigationOrder: input.navigationOrder,
    enabled: input.enabled,
    showInFooter: input.showInFooter,
    footerLabel: input.footerLabel,
    footerOrder: input.footerOrder,
    footerGroup: input.footerGroup,
    publishedAt,
    seoTitle: input.seoTitle,
    metaDescription: input.metaDescription,
    canonicalUrl: input.canonicalUrl,
    openGraphTitle: input.openGraphTitle,
    openGraphDescription: input.openGraphDescription,
    openGraphImage: input.openGraphImage,
    twitterTitle: input.twitterTitle,
    twitterDescription: input.twitterDescription,
    twitterImage: input.twitterImage,
    robotsIndex: input.robotsIndex,
    robotsFollow: input.robotsFollow,
    focusKeyword: input.focusKeyword,
    schemaType: input.schemaType,
    noindex: input.noindex,
  };
}

function faqEntryFields(entries: PageInput['faqEntries']) {
  return entries.map((entry) => ({
    question: entry.question,
    answer: entry.answer,
    category: entry.category,
    displayOrder: entry.displayOrder,
    enabled: entry.enabled,
  }));
}

function faqSnapshot(entries: Array<{ question: string; answer: string; category: string; displayOrder: number; enabled: boolean }>) {
  return JSON.stringify(entries.map(({ question, answer, category, displayOrder, enabled }) => ({ question, answer, category, displayOrder, enabled })));
}

function parseFaqSnapshot(value: string | null): PageInput['faqEntries'] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.map((item, index) => {
      const entry = typeof item === 'object' && item !== null ? item as Record<string, unknown> : {};
      return {
        id: null,
        question: typeof entry.question === 'string' ? entry.question : '',
        answer: typeof entry.answer === 'string' ? entry.answer : '',
        category: typeof entry.category === 'string' ? entry.category : 'General',
        displayOrder: typeof entry.displayOrder === 'number' ? entry.displayOrder : (index + 1) * 10,
        enabled: entry.enabled !== false,
      };
    }).filter((entry) => entry.question && entry.answer);
  } catch {
    return null;
  }
}

function publicArticleWhere(now: Date): Prisma.ArticleWhereInput {
  return { OR: [{ status: 'published' }, { status: 'scheduled', scheduledAt: { lte: now } }] };
}

async function ensureUniqueSlug(kind: 'article' | 'page', slug: string, excludeId?: string) {
  const duplicate = kind === 'article'
    ? await prisma.article.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })
    : await prisma.contentPage.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
  if (duplicate) throw new AdminDataError(`That ${kind} slug is already in use.`, 409);
}

async function availableSlug(kind: 'article' | 'page', base: string) {
  for (let index = 0; index < 100; index += 1) {
    const candidate = index ? `${base}-${index + 1}` : base;
    try { await ensureUniqueSlug(kind, candidate); return candidate; } catch (error) { if (!(error instanceof AdminDataError) || error.status !== 409) throw error; }
  }
  throw new AdminDataError('Could not create a unique slug.', 409);
}

async function validateRelatedArticles(articleId: string, ids: string[]) {
  if (ids.includes(articleId)) throw new AdminDataError('An article cannot relate to itself.', 400);
  if (!ids.length) return;
  const count = await prisma.article.count({ where: { id: { in: ids } } });
  if (count !== ids.length) throw new AdminDataError('One or more related articles no longer exist.', 400);
}

async function assertRedirectSafe(sourcePath: string, destinationPath: string, excludeId?: string) {
  if (sourcePath === destinationPath) throw new AdminDataError('A redirect cannot point to itself.', 400);
  const redirects = await prisma.redirect.findMany({ where: { enabled: true, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { sourcePath: true, destinationPath: true } });
  const map = new Map(redirects.map((item) => [item.sourcePath, item.destinationPath]));
  map.set(sourcePath, destinationPath);
  let current = destinationPath;
  const visited = new Set([sourcePath]);
  for (let step = 0; step < 100; step += 1) {
    if (visited.has(current)) throw new AdminDataError('This redirect would create a loop.', 409);
    visited.add(current);
    const next = map.get(current);
    if (!next) return;
    current = next;
  }
  throw new AdminDataError('This redirect chain is too long.', 409);
}

async function trimRevisions(kind: 'article' | 'page', contentId: string) {
  const expired = await prisma.contentRevision.findMany({ where: { contentKind: kind, contentId }, orderBy: { createdAt: 'desc' }, skip: 20, select: { id: true } });
  if (expired.length) await prisma.contentRevision.deleteMany({ where: { id: { in: expired.map((item) => item.id) } } });
}

async function getMediaUsage(url: string): Promise<MediaUsageRecord[]> {
  const [articles, pages, categories, products, legacyProducts, siteContent] = await Promise.all([
    prisma.article.findMany({ where: { OR: [{ featuredImage: url }, { openGraphImage: url }, { twitterImage: url }, { body: { contains: url } }] }, select: { id: true, title: true, featuredImage: true, openGraphImage: true, twitterImage: true, body: true } }),
    prisma.contentPage.findMany({ where: { OR: [{ featuredImage: url }, { openGraphImage: url }, { twitterImage: url }, { body: { contains: url } }] }, select: { id: true, title: true, featuredImage: true, openGraphImage: true, twitterImage: true, body: true } }),
    prisma.contentCategory.findMany({ where: { imageUrl: url }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { imageUrl: url }, select: { id: true, title: true } }),
    prisma.affiliateProduct.findMany({ where: { imageUrl: url }, select: { id: true, title: true } }),
    prisma.siteContent.findMany({ where: { value: { contains: url } }, select: { key: true, label: true } }),
  ]);
  const usages: MediaUsageRecord[] = [];
  const addContent = (kind: 'article' | 'page', item: typeof articles[number] | typeof pages[number]) => {
    const adminUrl = `/admin/${kind}s`; const prefix = `${kind}:${item.id}`;
    if (item.featuredImage === url) usages.push({ id: `${prefix}:featured`, kind, location: 'Featured image', label: item.title, adminUrl });
    if (item.openGraphImage === url) usages.push({ id: `${prefix}:og`, kind, location: 'Open Graph image', label: item.title, adminUrl });
    if (item.twitterImage === url) usages.push({ id: `${prefix}:twitter`, kind, location: 'Twitter image', label: item.title, adminUrl });
    if (item.body.includes(url)) usages.push({ id: `${prefix}:body`, kind, location: 'Body image', label: item.title, adminUrl });
  };
  articles.forEach((item) => addContent('article', item)); pages.forEach((item) => addContent('page', item));
  categories.forEach((item) => usages.push({ id: `category:${item.id}`, kind: 'category', location: 'Category image', label: item.name, adminUrl: '/admin/categories' }));
  products.forEach((item) => usages.push({ id: `product:${item.id}`, kind: 'affiliate-product', location: 'Product image', label: item.title, adminUrl: '/admin/products' }));
  legacyProducts.forEach((item) => usages.push({ id: `affiliate-product:${item.id}`, kind: 'affiliate-product', location: 'Legacy recommendation product', label: item.title, adminUrl: '/admin/recommendations' }));
  siteContent.forEach((item) => usages.push({ id: `site-content:${item.key}`, kind: 'site-content', location: 'Site content', label: item.label, adminUrl: '/admin/site-content' }));
  return usages;
}

async function serializeMedia(item: MediaWithFolder): Promise<MediaAssetRecord> {
  const usages = await getMediaUsage(item.url);
  return { ...item, sourceType: item.sourceType === 'external' ? 'external' : 'upload', storageProvider: normalizeStorageProvider(item.storageProvider), folder: item.folder ? { ...item.folder, mediaCount: 0, createdAt: item.folder.createdAt.toISOString(), updatedAt: item.folder.updatedAt.toISOString() } : null, usageCount: usages.length, usages, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() };
}

function serializeMediaFolder(item: MediaFolderWithCount): MediaFolderRecord { return { id: item.id, name: item.name, slug: item.slug, displayOrder: item.displayOrder, mediaCount: item._count.media, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }; }
async function requireMediaFolder(id: string) { if (!(await prisma.mediaFolder.findUnique({ where: { id }, select: { id: true } }))) throw new AdminDataError('Media folder not found.', 400); }
function externalFilename(value: string) { try { const raw = decodeURIComponent(new URL(value).pathname.split('/').filter(Boolean).pop() ?? 'external-image'); return raw.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 180) || 'external-image'; } catch { return 'external-image'; } }
function normalizeStorageProvider(value: string): MediaAssetRecord['storageProvider'] { return value === 'vercel-blob' || value === 'cloudinary' || value === 's3' || value === 'external' ? value : 'local'; }

function serializeArticle(article: ArticleWithRelations, revisions: Prisma.ContentRevisionGetPayload<Record<string, never>>[] = []): ArticleRecord {
  return {
    ...article,
    status: article.status as ArticleRecord['status'],
    contentType: article.contentType as ArticleRecord['contentType'],
    categories: article.categories.map((item) => ({ ...serializeCategory(item.category), isPrimary: item.isPrimary })),
    tags: article.tags.map((item) => serializeTag(item.tag)),
    relatedArticleIds: article.relatedArticles.map((item) => item.relatedArticleId),
    revisions: revisions.map(serializeRevision),
    publishedAt: article.publishedAt?.toISOString() ?? null,
    scheduledAt: article.scheduledAt?.toISOString() ?? null,
    createdAt: article.createdAt.toISOString(), updatedAt: article.updatedAt.toISOString(),
  };
}

function serializePage(page: PageWithFaqs, revisions: Prisma.ContentRevisionGetPayload<Record<string, never>>[] = []): PageRecord {
  return {
    ...page,
    status: page.status as PageRecord['status'],
    pageTemplate: page.pageTemplate as PageRecord['pageTemplate'],
    requiredPageKey: isRequiredPageKey(page.requiredPageKey ?? '') ? page.requiredPageKey as RequiredPageKey : null,
    footerGroup: page.footerGroup as PageRecord['footerGroup'],
    faqEntries: page.faqEntries.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    })),
    revisions: revisions.map(serializeRevision),
    publishedAt: page.publishedAt?.toISOString() ?? null,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}

function serializeCategory(category: CategoryWithCount): ContentCategoryRecord {
  return { ...category, articleCount: category._count.articles, createdAt: category.createdAt.toISOString(), updatedAt: category.updatedAt.toISOString() };
}

function serializeTag(tag: TagWithCount): ContentTagRecord {
  return { ...tag, articleCount: tag._count.articles, createdAt: tag.createdAt.toISOString(), updatedAt: tag.updatedAt.toISOString() };
}

function serializeRevision(revision: Prisma.ContentRevisionGetPayload<Record<string, never>>): ContentRevisionRecord {
  return { ...revision, contentKind: revision.contentKind as ContentRevisionRecord['contentKind'], createdAt: revision.createdAt.toISOString() };
}

function serializeRedirect(item: Prisma.RedirectGetPayload<Record<string, never>>): RedirectRecord {
  return { ...item, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() };
}

function isEverPublished(status: string, publishedAt: Date | null) { return status === 'published' || Boolean(publishedAt); }

function toArticleInput(source: ArticleWithRelations): ArticleInput {
  return { ...source, status: source.status as ArticleInput['status'], contentType: source.contentType as ArticleInput['contentType'], categoryIds: source.categories.map((item) => item.categoryId), primaryCategoryId: source.categories.find((item) => item.isPrimary)?.categoryId ?? null, tagIds: source.tags.map((item) => item.tagId), relatedArticleIds: source.relatedArticles.map((item) => item.relatedArticleId) };
}

function toPageInput(source: PageWithFaqs): PageInput {
  return {
    ...source,
    status: source.status as PageInput['status'],
    pageTemplate: source.pageTemplate as PageInput['pageTemplate'],
    footerGroup: source.footerGroup as PageInput['footerGroup'],
    faqEntries: source.faqEntries.map((entry) => ({ ...entry, id: entry.id })),
  };
}
