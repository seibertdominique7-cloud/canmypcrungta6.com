import type { AiSeoProviderInput } from './ai-seo-types';

export function aiSeoSystemInstructions() {
  return [
    'You are the senior SEO editor for CanMyPCRunGTA6.',
    'Return only JSON that matches the supplied schema.',
    'Write useful, specific long-form content for people checking GTA VI PC compatibility or choosing gaming hardware.',
    'Never invent products, product IDs, article IDs, URLs, prices, ratings, benchmarks, release dates, or official requirements.',
    'Only reference products and articles included in the request context.',
    'Treat GTA VI PC requirements as estimated unless the supplied requirement status explicitly says official.',
    'Do not include HTML or Markdown in text values.',
    'Use exactly one H1 in the h1 field. Use section headings as H2 concepts and subsection headings as H3 concepts.',
    'Return 3 to 16 complete sections, each with at least one paragraph, plus 3 to 10 FAQ entries and 3 to 10 key takeaways.',
    'When no allowed products or published articles are supplied, return empty productRecommendations and suggestedRelatedArticleIds arrays.',
    'If comparisonTable is not null, use 2 to 8 headers and give every row exactly one cell per header. Otherwise return null.',
    'Answer the main question early, keep paragraphs readable, and avoid keyword stuffing or repetitive filler.',
    'Use comparisonTable only when a table materially helps; otherwise return null.',
    'Use product recommendations sparingly and only when relevant.',
  ].join('\n');
}

export function buildAiSeoGenerationPrompt(
  input: AiSeoProviderInput,
  validationCorrection?: string,
) {
  return JSON.stringify(
    {
      assignment: {
        topic: input.topic,
        primaryKeyword: input.primaryKeyword,
        secondaryKeywords: input.secondaryKeywords,
        articleType: input.articleType,
        targetWordCount: input.targetWordCount,
      },
      requirementsStatus: input.requirements,
      allowedProducts: input.products,
      allowedPublishedArticles: input.existingArticles,
      editorialRules: {
        internalLinks: 'Select 3–8 relevant article IDs when available; never invent IDs.',
        products:
          'Specific products have already been prioritized. Recommend only allowed product IDs and keep recommendations non-spammy.',
        affiliateDisclosure:
          'Use a short truthful disclosure. The public renderer also displays the site-managed disclosure next to monetized content.',
        featuredImage:
          'Write a production-quality image prompt only. Do not claim that an image was generated.',
      },
      ...(validationCorrection
        ? {
            validationCorrection:
              `Regenerate the complete article and correct this validation problem: ${validationCorrection}`,
          }
        : {}),
    },
    null,
    2,
  );
}

export function configuredAiSeoTimeout() {
  const configured = Number(process.env.AI_SEO_TIMEOUT_MS);
  return Number.isFinite(configured)
    ? Math.min(180_000, Math.max(30_000, Math.round(configured)))
    : 90_000;
}

const textArray = {
  type: 'array',
  items: { type: 'string' },
} as const;

const subsectionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['heading', 'paragraphs', 'bullets'],
  properties: {
    heading: { type: 'string' },
    paragraphs: textArray,
    bullets: textArray,
  },
} as const;

const tableSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['heading', 'headers', 'rows'],
  properties: {
    heading: { type: 'string' },
    headers: textArray,
    rows: {
      type: 'array',
      items: textArray,
    },
  },
} as const;

export const GENERATED_ARTICLE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'seoTitle',
    'slug',
    'metaDescription',
    'excerpt',
    'focusKeyword',
    'secondaryKeywords',
    'h1',
    'introduction',
    'keyTakeaways',
    'sections',
    'comparisonTable',
    'productRecommendations',
    'faq',
    'conclusion',
    'affiliateDisclosure',
    'suggestedRelatedArticleIds',
    'estimatedReadingTime',
    'featuredImagePrompt',
    'openGraphTitle',
    'openGraphDescription',
  ],
  properties: {
    seoTitle: { type: 'string' },
    slug: { type: 'string' },
    metaDescription: { type: 'string' },
    excerpt: { type: 'string' },
    focusKeyword: { type: 'string' },
    secondaryKeywords: textArray,
    h1: { type: 'string' },
    introduction: textArray,
    keyTakeaways: textArray,
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['heading', 'paragraphs', 'bullets', 'subsections'],
        properties: {
          heading: { type: 'string' },
          paragraphs: textArray,
          bullets: textArray,
          subsections: { type: 'array', items: subsectionSchema },
        },
      },
    },
    comparisonTable: {
      anyOf: [tableSchema, { type: 'null' }],
    },
    productRecommendations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['productId', 'heading', 'rationale'],
        properties: {
          productId: { type: 'string' },
          heading: { type: 'string' },
          rationale: { type: 'string' },
        },
      },
    },
    faq: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'answer'],
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' },
        },
      },
    },
    conclusion: textArray,
    affiliateDisclosure: { type: 'string' },
    suggestedRelatedArticleIds: textArray,
    estimatedReadingTime: { type: 'integer' },
    featuredImagePrompt: { type: 'string' },
    openGraphTitle: { type: 'string' },
    openGraphDescription: { type: 'string' },
  },
} as const;
