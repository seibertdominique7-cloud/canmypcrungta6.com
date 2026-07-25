import type { AffiliateRetailer, ProductComponentType } from './affiliate-types';
import type { FooterGroup, RequiredPageKey } from '../data/required-pages';

export const CONTENT_STATUSES = ['draft', 'published', 'scheduled', 'archived'] as const;
export const ARTICLE_CONTENT_TYPES = ['standard', 'news', 'hardware-guide', 'comparison', 'faq', 'deals', 'tutorial'] as const;
export const PAGE_TEMPLATES = ['standard', 'landing-page', 'legal', 'contact', 'faq', 'deals'] as const;
export const ARTICLE_SCHEMA_TYPES = ['Article', 'NewsArticle', 'TechArticle', 'FAQPage', 'HowTo'] as const;
export const PAGE_SCHEMA_TYPES = ['WebPage', 'AboutPage', 'ContactPage', 'FAQPage', 'CollectionPage'] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];
export type ArticleContentType = (typeof ARTICLE_CONTENT_TYPES)[number];
export type PageTemplate = (typeof PAGE_TEMPLATES)[number];
export type ContentKind = 'article' | 'page';

export interface SeoFields {
  seoTitle: string;
  metaDescription: string;
  canonicalUrl: string | null;
  openGraphTitle: string;
  openGraphDescription: string;
  openGraphImage: string | null;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string | null;
  robotsIndex: boolean;
  robotsFollow: boolean;
  focusKeyword: string;
  schemaType: string;
  noindex: boolean;
}

export interface ContentCategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  displayOrder: number;
  seoTitle: string;
  metaDescription: string;
  articleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentTagRecord {
  id: string;
  name: string;
  slug: string;
  articleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentRevisionRecord {
  id: string;
  contentId: string;
  contentKind: ContentKind;
  titleSnapshot: string;
  bodySnapshot: string;
  structuredSnapshot: string | null;
  editorIdentifier: string | null;
  createdAt: string;
}

export interface ArticleRecord extends SeoFields {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  featuredImage: string | null;
  featuredImagePrompt: string;
  authorName: string;
  status: ContentStatus;
  publishedAt: string | null;
  scheduledAt: string | null;
  featured: boolean;
  contentType: ArticleContentType;
  secondaryKeywords: string[];
  categories: Array<ContentCategoryRecord & { isPrimary: boolean }>;
  tags: ContentTagRecord[];
  relatedArticleIds: string[];
  revisions: ContentRevisionRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface PageRecord extends SeoFields {
  id: string;
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
  requiredPageKey: RequiredPageKey | null;
  showInFooter: boolean;
  footerLabel: string;
  footerOrder: number;
  footerGroup: FooterGroup;
  faqEntries: FaqEntryRecord[];
  publishedAt: string | null;
  revisions: ContentRevisionRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface FaqEntryRecord {
  id: string;
  pageId: string;
  question: string;
  answer: string;
  category: string;
  displayOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAssetRecord {
  id: string;
  filename: string;
  originalFilename: string;
  url: string;
  sourceType: 'upload' | 'external';
  storageProvider: 'local' | 'vercel-blob' | 'cloudinary' | 's3' | 'external';
  mimeType: string;
  width: number | null;
  height: number | null;
  fileSize: number;
  altText: string;
  title: string;
  storageKey: string;
  folderId: string | null;
  folder: MediaFolderRecord | null;
  usageCount: number;
  usages: MediaUsageRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface MediaFolderRecord {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  mediaCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaUsageRecord {
  id: string;
  kind: 'article' | 'page' | 'affiliate-product' | 'merchandise-product' | 'category' | 'site-content';
  location: string;
  label: string;
  adminUrl: string;
}

export interface MediaStorageStatus {
  provider: 'local' | 'vercel-blob' | 'cloudinary' | 's3';
  configured: boolean;
  persistent: boolean;
  message: string;
  maxUploadMb: number;
}

export interface SiteContentRecord {
  key: string;
  label: string;
  value: string;
  contentType: string;
  group: string;
  updatedAt: string;
}

export interface RedirectRecord {
  id: string;
  sourcePath: string;
  destinationPath: string;
  statusCode: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContentWorkspace {
  articles: ArticleRecord[];
  pages: PageRecord[];
  categories: ContentCategoryRecord[];
  tags: ContentTagRecord[];
  media: MediaAssetRecord[];
  mediaFolders: MediaFolderRecord[];
  affiliateProducts: Array<{
    id: string;
    title: string;
    enabled: boolean;
    retailer: AffiliateRetailer;
    affiliateUrl: string;
    imageUrl: string | null;
    priceText: string;
    badge: string;
    shortDescription: string;
    componentType: ProductComponentType;
  }>;
  merchandiseProducts: import('./merch-types').MerchandiseProductRecord[];
}

export function getPagePublicPath(page: Pick<PageRecord, 'requiredPageKey' | 'slug'>) {
  return page.requiredPageKey ? `/${page.requiredPageKey}` : `/pages/${page.slug}`;
}
