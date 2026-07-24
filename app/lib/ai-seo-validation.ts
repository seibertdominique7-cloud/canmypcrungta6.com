import {
  PRODUCT_COMPONENT_TYPES,
  type ProductComponentType,
} from './affiliate-types';
import {
  AI_SEO_ARTICLE_TYPES,
  AI_SEO_WORD_COUNTS,
  type AiSeoGenerationInput,
  type AiSeoProviderInput,
  type GeneratedArticle,
  type GeneratedArticleFaq,
  type GeneratedArticleProductRecommendation,
  type GeneratedArticleSection,
  type GeneratedArticleSubsection,
  type GeneratedArticleTable,
} from './ai-seo-types';

export class AiSeoValidationError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'AiSeoValidationError';
  }
}

export function validateAiSeoGenerationInput(value: unknown): AiSeoGenerationInput {
  const input = objectValue(value, 'Generation request');
  const fieldErrors: Record<string, string> = {};
  const topic = cleanText(input.topic, 220);
  const primaryKeyword = cleanText(input.primaryKeyword, 120) || topic;
  const articleType = cleanText(input.articleType, 40);
  const targetWordCount = Number(input.targetWordCount);
  const secondaryKeywords = cleanStringArray(input.secondaryKeywords, 20, 120);
  const productCategories = cleanStringArray(input.productCategories, 20, 80).filter(
    (item): item is ProductComponentType =>
      PRODUCT_COMPONENT_TYPES.includes(item as ProductComponentType),
  );
  const specificProductIds = cleanStringArray(input.specificProductIds, 20, 120);
  const relatedArticleIds = cleanStringArray(input.relatedArticleIds, 8, 120);
  const articleId = cleanText(input.articleId, 120);

  if (topic.length < 5) fieldErrors.topic = 'Enter an article topic.';
  if (!AI_SEO_ARTICLE_TYPES.includes(articleType as AiSeoGenerationInput['articleType'])) {
    fieldErrors.articleType = 'Choose a supported article type.';
  }
  if (!AI_SEO_WORD_COUNTS.includes(targetWordCount as AiSeoGenerationInput['targetWordCount'])) {
    fieldErrors.targetWordCount = 'Choose a supported target word count.';
  }
  if (input.saveAsDraft !== true) {
    fieldErrors.saveAsDraft = 'AI SEO Publisher can only create drafts.';
  }
  if (
    Array.isArray(input.productCategories) &&
    input.productCategories.some(
      (item) =>
        typeof item !== 'string' ||
        !PRODUCT_COMPONENT_TYPES.includes(item as ProductComponentType),
    )
  ) {
    fieldErrors.productCategories = 'One or more product categories are invalid.';
  }

  if (Object.keys(fieldErrors).length) {
    throw new AiSeoValidationError('Correct the highlighted generation fields.', fieldErrors);
  }

  return {
    topic,
    primaryKeyword,
    secondaryKeywords,
    articleType: articleType as AiSeoGenerationInput['articleType'],
    targetWordCount: targetWordCount as AiSeoGenerationInput['targetWordCount'],
    productCategories,
    specificProductIds,
    relatedArticleIds,
    saveAsDraft: true,
    ...(articleId ? { articleId } : {}),
  };
}

export function parseGeneratedArticleResponse(
  value: unknown,
  context: Pick<AiSeoProviderInput, 'products' | 'existingArticles'>,
): GeneratedArticle {
  const input = typeof value === 'string' ? parseJson(value) : value;
  const article = objectValue(input, 'Generated article');
  assertKeys(article, [
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
  ], 'Generated article');

  const generated: GeneratedArticle = {
    seoTitle: requiredText(article.seoTitle, 'SEO title', 180),
    slug: requiredText(article.slug, 'Slug', 140),
    metaDescription: requiredText(article.metaDescription, 'Meta description', 320),
    excerpt: requiredText(article.excerpt, 'Excerpt', 500),
    focusKeyword: requiredText(article.focusKeyword, 'Focus keyword', 120),
    secondaryKeywords: requiredStringArray(
      article.secondaryKeywords,
      'Secondary keywords',
      1,
      20,
      120,
    ),
    h1: requiredText(article.h1, 'H1', 180),
    introduction: requiredStringArray(article.introduction, 'Introduction', 1, 8, 1400),
    keyTakeaways: requiredStringArray(article.keyTakeaways, 'Key takeaways', 3, 10, 500),
    sections: parseSections(article.sections),
    comparisonTable: parseTable(article.comparisonTable),
    productRecommendations: parseProductRecommendations(article.productRecommendations),
    faq: parseFaq(article.faq),
    conclusion: requiredStringArray(article.conclusion, 'Conclusion', 1, 6, 1400),
    affiliateDisclosure: requiredText(
      article.affiliateDisclosure,
      'Affiliate disclosure',
      500,
    ),
    suggestedRelatedArticleIds: cleanStringArray(
      article.suggestedRelatedArticleIds,
      8,
      120,
    ),
    estimatedReadingTime: integerValue(
      article.estimatedReadingTime,
      'Estimated reading time',
      1,
      60,
    ),
    featuredImagePrompt: requiredText(
      article.featuredImagePrompt,
      'Featured image prompt',
      2000,
    ),
    openGraphTitle: requiredText(article.openGraphTitle, 'Open Graph title', 180),
    openGraphDescription: requiredText(
      article.openGraphDescription,
      'Open Graph description',
      320,
    ),
  };

  const allowedProductIds = new Set(context.products.map((product) => product.id));
  for (const recommendation of generated.productRecommendations) {
    if (!allowedProductIds.has(recommendation.productId)) {
      throw new AiSeoValidationError(
        `The AI referenced unavailable product ID "${recommendation.productId}".`,
      );
    }
  }

  const allowedArticleIds = new Set(context.existingArticles.map((articleItem) => articleItem.id));
  for (const articleId of generated.suggestedRelatedArticleIds) {
    if (!allowedArticleIds.has(articleId)) {
      throw new AiSeoValidationError(
        `The AI referenced unavailable related article ID "${articleId}".`,
      );
    }
  }

  return generated;
}

function parseSections(value: unknown): GeneratedArticleSection[] {
  if (!Array.isArray(value) || value.length < 3 || value.length > 16) {
    throw new AiSeoValidationError('The generated article needs 3–16 complete H2 sections.');
  }
  return value.map((item, index) => {
    const section = objectValue(item, `Section ${index + 1}`);
    assertKeys(
      section,
      ['heading', 'paragraphs', 'bullets', 'subsections'],
      `Section ${index + 1}`,
    );
    const paragraphs = requiredStringArray(
      section.paragraphs,
      `Section ${index + 1} paragraphs`,
      1,
      12,
      1600,
    );
    const bullets = optionalStringArray(section.bullets, 12, 500);
    const subsections = parseSubsections(section.subsections, index);
    return {
      heading: requiredText(section.heading, `Section ${index + 1} heading`, 180),
      paragraphs,
      bullets,
      subsections,
    };
  });
}

function parseSubsections(value: unknown, sectionIndex: number): GeneratedArticleSubsection[] {
  if (!Array.isArray(value) || value.length > 10) {
    throw new AiSeoValidationError(
      `Section ${sectionIndex + 1} subsections must be an array with at most 10 items.`,
    );
  }
  return value.map((item, index) => {
    const subsection = objectValue(
      item,
      `Section ${sectionIndex + 1}, subsection ${index + 1}`,
    );
    assertKeys(
      subsection,
      ['heading', 'paragraphs', 'bullets'],
      `Section ${sectionIndex + 1}, subsection ${index + 1}`,
    );
    return {
      heading: requiredText(subsection.heading, 'H3 heading', 180),
      paragraphs: requiredStringArray(subsection.paragraphs, 'H3 paragraphs', 1, 8, 1400),
      bullets: optionalStringArray(subsection.bullets, 10, 500),
    };
  });
}

function parseTable(value: unknown): GeneratedArticleTable | null {
  if (value === null) return null;
  const table = objectValue(value, 'Comparison table');
  assertKeys(table, ['heading', 'headers', 'rows'], 'Comparison table');
  const headers = requiredStringArray(table.headers, 'Comparison table headers', 2, 8, 120);
  if (!Array.isArray(table.rows) || table.rows.length < 1 || table.rows.length > 20) {
    throw new AiSeoValidationError('Comparison table rows must contain 1–20 rows.');
  }
  const rows = table.rows.map((row, index) => {
    const cells = requiredStringArray(row, `Comparison row ${index + 1}`, headers.length, 8, 300);
    if (cells.length !== headers.length) {
      throw new AiSeoValidationError(
        `Comparison row ${index + 1} must have ${headers.length} cells.`,
      );
    }
    return cells;
  });
  return {
    heading: requiredText(table.heading, 'Comparison table heading', 180),
    headers,
    rows,
  };
}

function parseProductRecommendations(
  value: unknown,
): GeneratedArticleProductRecommendation[] {
  if (!Array.isArray(value) || value.length > 8) {
    throw new AiSeoValidationError('Product recommendations must contain at most 8 items.');
  }
  return value.map((item, index) => {
    const recommendation = objectValue(item, `Product recommendation ${index + 1}`);
    assertKeys(
      recommendation,
      ['productId', 'heading', 'rationale'],
      `Product recommendation ${index + 1}`,
    );
    return {
      productId: requiredText(recommendation.productId, 'Product ID', 120),
      heading: requiredText(recommendation.heading, 'Product recommendation heading', 180),
      rationale: requiredText(recommendation.rationale, 'Product recommendation rationale', 800),
    };
  });
}

function parseFaq(value: unknown): GeneratedArticleFaq[] {
  if (!Array.isArray(value) || value.length < 3 || value.length > 10) {
    throw new AiSeoValidationError('The generated article needs 3–10 FAQ entries.');
  }
  return value.map((item, index) => {
    const faq = objectValue(item, `FAQ ${index + 1}`);
    assertKeys(faq, ['question', 'answer'], `FAQ ${index + 1}`);
    return {
      question: requiredText(faq.question, `FAQ ${index + 1} question`, 300),
      answer: requiredText(faq.answer, `FAQ ${index + 1} answer`, 2000),
    };
  });
}

function parseJson(value: string) {
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new AiSeoValidationError('The AI provider returned malformed JSON.');
  }
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new AiSeoValidationError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function assertKeys(value: Record<string, unknown>, keys: string[], label: string) {
  const expected = new Set(keys);
  const missing = keys.filter((key) => !(key in value));
  const unexpected = Object.keys(value).filter((key) => !expected.has(key));
  if (missing.length || unexpected.length) {
    throw new AiSeoValidationError(
      `${label} has an invalid shape.${missing.length ? ` Missing: ${missing.join(', ')}.` : ''}${unexpected.length ? ` Unexpected: ${unexpected.join(', ')}.` : ''}`,
    );
  }
}

function requiredText(value: unknown, label: string, maximum: number) {
  const result = cleanText(value, maximum);
  if (!result) throw new AiSeoValidationError(`${label} is missing.`);
  return result;
}

function cleanText(value: unknown, maximum: number) {
  return typeof value === 'string'
    ? value
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .trim()
        .slice(0, maximum)
    : '';
}

function requiredStringArray(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
  itemMaximum: number,
) {
  const result = optionalStringArray(value, maximum, itemMaximum);
  if (result.length < minimum) {
    throw new AiSeoValidationError(`${label} must contain at least ${minimum} item(s).`);
  }
  return result;
}

function optionalStringArray(value: unknown, maximum: number, itemMaximum: number) {
  if (!Array.isArray(value)) {
    throw new AiSeoValidationError('Expected an array of text values.');
  }
  return Array.from(
    new Set(value.map((item) => cleanText(item, itemMaximum)).filter(Boolean)),
  ).slice(0, maximum);
}

function cleanStringArray(value: unknown, maximum: number, itemMaximum: number) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((item) => cleanText(item, itemMaximum)).filter(Boolean)),
  ).slice(0, maximum);
}

function integerValue(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new AiSeoValidationError(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return result;
}
