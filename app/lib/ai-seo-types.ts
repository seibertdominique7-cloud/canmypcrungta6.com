import type {
  ProductComponentType,
  ProductValueTier,
} from './affiliate-types';

export const AI_SEO_ARTICLE_TYPES = [
  'Buying Guide',
  'Comparison',
  'Informational Guide',
  'Troubleshooting Guide',
  'Beginner Guide',
  'Product Roundup',
] as const;

export const AI_SEO_WORD_COUNTS = [1500, 2000, 2500, 3000] as const;

export type AiSeoArticleType = (typeof AI_SEO_ARTICLE_TYPES)[number];
export type AiSeoWordCount = (typeof AI_SEO_WORD_COUNTS)[number];

export interface AiSeoGenerationInput {
  topic: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  articleType: AiSeoArticleType;
  targetWordCount: AiSeoWordCount;
  productCategories: ProductComponentType[];
  specificProductIds: string[];
  relatedArticleIds: string[];
  saveAsDraft: true;
  articleId?: string;
}

export interface AiSeoProductContext {
  id: string;
  title: string;
  category: ProductComponentType;
  componentType: ProductComponentType;
  valueTier: ProductValueTier | null;
  badge: string;
  notes: string;
}

export interface AiSeoArticleContext {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  focusKeyword: string;
  categories: string[];
}

export interface AiSeoProviderInput extends AiSeoGenerationInput {
  products: AiSeoProductContext[];
  existingArticles: AiSeoArticleContext[];
  requirements: {
    label: string;
    disclaimer: string;
  };
}

export interface GeneratedArticleSubsection {
  heading: string;
  paragraphs: string[];
  bullets: string[];
}

export interface GeneratedArticleSection {
  heading: string;
  paragraphs: string[];
  bullets: string[];
  subsections: GeneratedArticleSubsection[];
}

export interface GeneratedArticleTable {
  heading: string;
  headers: string[];
  rows: string[][];
}

export interface GeneratedArticleProductRecommendation {
  productId: string;
  heading: string;
  rationale: string;
}

export interface GeneratedArticleFaq {
  question: string;
  answer: string;
}

export interface GeneratedArticle {
  seoTitle: string;
  slug: string;
  metaDescription: string;
  excerpt: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  h1: string;
  introduction: string[];
  keyTakeaways: string[];
  sections: GeneratedArticleSection[];
  comparisonTable: GeneratedArticleTable | null;
  productRecommendations: GeneratedArticleProductRecommendation[];
  faq: GeneratedArticleFaq[];
  conclusion: string[];
  affiliateDisclosure: string;
  suggestedRelatedArticleIds: string[];
  estimatedReadingTime: number;
  featuredImagePrompt: string;
  openGraphTitle: string;
  openGraphDescription: string;
}

export interface AiSeoSavedDraft {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: 'draft';
  productIds: string[];
  relatedArticleIds: string[];
  estimatedReadingTime: number;
  featuredImagePrompt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiSeoProviderStatus {
  configured: boolean;
  provider: string;
  model: string;
  message: string;
  issue?:
    | 'provider_missing'
    | 'model_missing'
    | 'api_key_missing'
    | 'unsupported_provider'
    | 'initialization_failed';
}

export interface AiSeoWorkspaceProduct extends AiSeoProductContext {
  retailer: string;
  imageUrl: string | null;
}

export interface AiSeoWorkspace {
  providerStatus: AiSeoProviderStatus;
  products: AiSeoWorkspaceProduct[];
  publishedArticles: AiSeoArticleContext[];
  productCategories: ProductComponentType[];
}

export const AI_SEO_TOPIC_PRESETS = [
  'Best GPU for GTA 6',
  'Best CPU for GTA 6',
  'Best SSD for GTA 6',
  'Best RAM for GTA 6',
  'Best Budget PC for GTA 6',
  'Best Prebuilt Gaming PC for GTA 6',
  'Can My Laptop Run GTA 6?',
  'RTX 5060 vs RTX 5070 for GTA 6',
  'Best GTA 6 Streaming Setup',
  'Best Capture Card for GTA 6 Streaming',
  'Best Gaming Monitor for GTA 6',
  'Best Headset for GTA 6',
  'How Much Storage Will GTA 6 Need on PC?',
  'Should You Upgrade Your PC for GTA 6?',
  'GTA 6 Minimum vs Recommended PC Requirements',
] as const;
