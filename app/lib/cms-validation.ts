import {
  ARTICLE_CONTENT_TYPES,
  CONTENT_STATUSES,
  PAGE_TEMPLATES,
  type ArticleContentType,
  type ContentStatus,
  type PageTemplate,
  type SeoFields,
} from './cms-types';
import { FOOTER_GROUPS, type FooterGroup } from '../data/required-pages';

export interface FaqEntryInput {
  id: string | null;
  question: string;
  answer: string;
  category: string;
  displayOrder: number;
  enabled: boolean;
}

export interface ArticleInput extends SeoFields {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  featuredImage: string | null;
  authorName: string;
  status: ContentStatus;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  featured: boolean;
  contentType: ArticleContentType;
  categoryIds: string[];
  primaryCategoryId: string | null;
  tagIds: string[];
  relatedArticleIds: string[];
}

export interface PageInput extends SeoFields {
  title: string;
  slug: string;
  body: string;
  excerpt: string;
  featuredImage: string | null;
  status: ContentStatus;
  pageTemplate: PageTemplate;
  navigationLabel: string;
  showInNavigation: boolean;
  navigationOrder: number;
  enabled: boolean;
  showInFooter: boolean;
  footerLabel: string;
  footerOrder: number;
  footerGroup: FooterGroup;
  faqEntries: FaqEntryInput[];
  publishedAt: Date | null;
}

export interface ValidationResult<T> {
  data: T | null;
  fieldErrors: Record<string, string>;
  warnings: string[];
}

export function createSlug(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export function validateArticleInput(value: unknown): ValidationResult<ArticleInput> {
  const input = record(value);
  const fieldErrors: Record<string, string> = {};
  const title = text(input.title, 180);
  const slug = createSlug(text(input.slug || input.title, 120));
  const body = text(input.body, 200000, false);
  const excerpt = text(input.excerpt, 500, false);
  const authorName = text(input.authorName, 100) || 'CanMyPCRunGTA6';
  const status = text(input.status, 20) as ContentStatus;
  const contentType = text(input.contentType, 40) as ArticleContentType;
  const scheduledAt = dateValue(input.scheduledAt);
  if (!title) fieldErrors.title = 'Title is required.';
  if (!slug) fieldErrors.slug = 'Slug is required.';
  if (!CONTENT_STATUSES.includes(status)) fieldErrors.status = 'Choose a valid status.';
  if (!ARTICLE_CONTENT_TYPES.includes(contentType)) fieldErrors.contentType = 'Choose a valid content type.';
  if (status === 'scheduled' && !scheduledAt) fieldErrors.scheduledAt = 'Choose a publication date for scheduled content.';
  const seo = validateSeo(input, fieldErrors);
  const warnings = seoWarnings(seo);
  const categoryIds = stringArray(input.categoryIds);
  const primaryCategoryId = text(input.primaryCategoryId, 100, false) || null;
  if (primaryCategoryId && !categoryIds.includes(primaryCategoryId)) categoryIds.unshift(primaryCategoryId);
  return {
    data: Object.keys(fieldErrors).length ? null : {
      title, slug, excerpt, body,
      featuredImage: optionalUrl(input.featuredImage, 'Featured image', fieldErrors),
      authorName, status,
      publishedAt: dateValue(input.publishedAt), scheduledAt,
      featured: bool(input.featured), contentType, categoryIds, primaryCategoryId,
      tagIds: stringArray(input.tagIds), relatedArticleIds: stringArray(input.relatedArticleIds),
      ...seo,
    },
    fieldErrors,
    warnings,
  };
}

export function validatePageInput(value: unknown): ValidationResult<PageInput> {
  const input = record(value);
  const fieldErrors: Record<string, string> = {};
  const title = text(input.title, 180);
  const slug = createSlug(text(input.slug || input.title, 120));
  const status = text(input.status, 20) as ContentStatus;
  const pageTemplate = text(input.pageTemplate, 40) as PageTemplate;
  const footerGroup = text(input.footerGroup, 40) as FooterGroup;
  if (!title) fieldErrors.title = 'Title is required.';
  if (!slug) fieldErrors.slug = 'Slug is required.';
  if (!CONTENT_STATUSES.includes(status) || status === 'scheduled') fieldErrors.status = 'Choose draft, published, or archived for a page.';
  if (!PAGE_TEMPLATES.includes(pageTemplate)) fieldErrors.pageTemplate = 'Choose a valid page template.';
  if (!FOOTER_GROUPS.includes(footerGroup)) fieldErrors.footerGroup = 'Choose a valid footer group.';
  const faqEntries = validateFaqEntries(input.faqEntries, fieldErrors);
  const seo = validateSeo(input, fieldErrors);
  return {
    data: Object.keys(fieldErrors).length ? null : {
      title, slug,
      body: text(input.body, 200000, false), excerpt: text(input.excerpt, 500, false),
      featuredImage: optionalUrl(input.featuredImage, 'Featured image', fieldErrors),
      status, pageTemplate,
      navigationLabel: text(input.navigationLabel, 100, false),
      showInNavigation: bool(input.showInNavigation),
      navigationOrder: integer(input.navigationOrder, 0, 100000),
      enabled: bool(input.enabled, true),
      showInFooter: bool(input.showInFooter),
      footerLabel: text(input.footerLabel, 100, false),
      footerOrder: integer(input.footerOrder, 0, 100000),
      footerGroup,
      faqEntries,
      publishedAt: dateValue(input.publishedAt),
      ...seo,
    },
    fieldErrors,
    warnings: seoWarnings(seo),
  };
}

function validateFaqEntries(value: unknown, fieldErrors: Record<string, string>): FaqEntryInput[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).map((item, index) => {
    const entry = record(item);
    const question = text(entry.question, 300);
    const answer = text(entry.answer, 5000);
    if (!question) fieldErrors[`faqEntries.${index}.question`] = 'Question is required.';
    if (!answer) fieldErrors[`faqEntries.${index}.answer`] = 'Answer is required.';
    return {
      id: text(entry.id, 100, false) || null,
      question,
      answer,
      category: text(entry.category, 80) || 'General',
      displayOrder: integer(entry.displayOrder, 0, 100000),
      enabled: bool(entry.enabled, true),
    };
  });
}

export function validatePath(value: unknown, label: string) {
  const path = text(value, 500);
  if (!path.startsWith('/') || path.startsWith('//')) return { value: '', error: `${label} must begin with one forward slash.` };
  if (/[?#]/.test(path)) return { value: '', error: `${label} cannot contain a query string or fragment.` };
  return { value: path.replace(/\/{2,}/g, '/'), error: '' };
}

function validateSeo(input: Record<string, unknown>, fieldErrors: Record<string, string>): SeoFields {
  return {
    seoTitle: text(input.seoTitle, 180, false),
    metaDescription: text(input.metaDescription, 320, false),
    canonicalUrl: optionalUrl(input.canonicalUrl, 'Canonical URL', fieldErrors),
    openGraphTitle: text(input.openGraphTitle, 180, false),
    openGraphDescription: text(input.openGraphDescription, 320, false),
    openGraphImage: optionalUrl(input.openGraphImage, 'Open Graph image', fieldErrors),
    twitterTitle: text(input.twitterTitle, 180, false),
    twitterDescription: text(input.twitterDescription, 320, false),
    twitterImage: optionalUrl(input.twitterImage, 'Twitter image', fieldErrors),
    robotsIndex: bool(input.robotsIndex, true), robotsFollow: bool(input.robotsFollow, true),
    focusKeyword: text(input.focusKeyword, 100, false),
    schemaType: text(input.schemaType, 40) || 'Article', noindex: bool(input.noindex),
  };
}

function seoWarnings(seo: SeoFields) {
  const warnings: string[] = [];
  if (seo.seoTitle && (seo.seoTitle.length < 40 || seo.seoTitle.length > 65)) warnings.push('SEO title is outside the usual 50–60 character target.');
  if (seo.metaDescription && (seo.metaDescription.length < 120 || seo.metaDescription.length > 170)) warnings.push('Meta description is outside the usual 140–160 character target.');
  return warnings;
}

function optionalUrl(value: unknown, label: string, errors: Record<string, string>) {
  const raw = text(value, 2000, false);
  if (!raw) return null;
  if (raw.startsWith('/')) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') throw new Error();
    return raw;
  } catch {
    errors[createSlug(label).replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())] = `${label} must be an HTTPS URL or a site-relative path.`;
    return null;
  }
}

function record(value: unknown): Record<string, unknown> { return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}; }
function text(value: unknown, maximum: number, trim = true) { const result = typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') : ''; return (trim ? result.trim() : result).slice(0, maximum); }
function bool(value: unknown, fallback = false) { return typeof value === 'boolean' ? value : fallback; }
function integer(value: unknown, minimum: number, maximum: number) { const parsed = typeof value === 'number' ? value : Number(value); return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : minimum; }
function stringArray(value: unknown) { return Array.isArray(value) ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))).slice(0, 100) : []; }
function dateValue(value: unknown) { if (typeof value !== 'string' || !value) return null; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed; }
