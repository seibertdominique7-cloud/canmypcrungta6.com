import type { ArticleInput } from './cms-validation';
import type {
  AiSeoGenerationInput,
  GeneratedArticle,
} from './ai-seo-types';

export function createAiSeoDraftInput(options: {
  generated: GeneratedArticle;
  request: AiSeoGenerationInput;
  slug: string;
  body: string;
  relatedArticleIds: string[];
  categoryIds: string[];
  primaryCategoryId: string | null;
  tagIds: string[];
}): ArticleInput {
  const { generated, request } = options;
  return {
    title: generated.h1,
    slug: options.slug,
    excerpt: generated.excerpt,
    body: options.body,
    featuredImage: null,
    featuredImagePrompt: generated.featuredImagePrompt,
    secondaryKeywords: generated.secondaryKeywords,
    authorName: 'CanMyPCRunGTA6',
    status: 'draft',
    publishedAt: null,
    scheduledAt: null,
    featured: false,
    contentType: contentTypeFor(request.articleType),
    categoryIds: options.categoryIds,
    primaryCategoryId: options.primaryCategoryId,
    tagIds: options.tagIds,
    relatedArticleIds: options.relatedArticleIds,
    seoTitle: generated.seoTitle,
    metaDescription: generated.metaDescription,
    canonicalUrl: null,
    openGraphTitle: generated.openGraphTitle,
    openGraphDescription: generated.openGraphDescription,
    openGraphImage: null,
    twitterTitle: generated.openGraphTitle,
    twitterDescription: generated.openGraphDescription,
    twitterImage: null,
    robotsIndex: true,
    robotsFollow: true,
    focusKeyword: generated.focusKeyword,
    schemaType:
      request.articleType === 'Troubleshooting Guide' ||
      request.articleType === 'Beginner Guide'
        ? 'HowTo'
        : 'TechArticle',
    noindex: false,
  };
}

function contentTypeFor(
  type: AiSeoGenerationInput['articleType'],
): ArticleInput['contentType'] {
  if (type === 'Comparison') return 'comparison';
  if (type === 'Buying Guide' || type === 'Product Roundup') return 'hardware-guide';
  if (type === 'Troubleshooting Guide' || type === 'Beginner Guide') return 'tutorial';
  return 'standard';
}
