import { describe, expect, it } from 'vitest';

import { articleFixture } from '../test/ai-seo-fixture';
import type { AiSeoProviderInput } from './ai-seo-types';
import {
  AiSeoValidationError,
  parseGeneratedArticleResponse,
  validateAiSeoGenerationInput,
} from './ai-seo-validation';

describe('AI SEO response validation', () => {
  it('accepts a complete strict generated article', () => {
    const generated = articleFixture();
    expect(parseGeneratedArticleResponse(JSON.stringify(generated), context())).toEqual(generated);
  });

  it('rejects invented product and article IDs', () => {
    expect(() =>
      parseGeneratedArticleResponse(
        { ...articleFixture(), productRecommendations: [{ productId: 'invented', heading: 'No', rationale: 'No' }] },
        context(),
      ),
    ).toThrow(AiSeoValidationError);
    expect(() =>
      parseGeneratedArticleResponse(
        { ...articleFixture(), suggestedRelatedArticleIds: ['invented'] },
        context(),
      ),
    ).toThrow(AiSeoValidationError);
  });

  it('rejects incomplete output before it can be saved', () => {
    expect(() =>
      parseGeneratedArticleResponse({ ...articleFixture(), sections: [] }, context()),
    ).toThrow('3–16 complete H2 sections');
  });

  it('normalizes an authenticated draft-only generation request', () => {
    expect(
      validateAiSeoGenerationInput({
        topic: 'Best GPU for GTA 6',
        primaryKeyword: '',
        secondaryKeywords: ['RTX for GTA 6'],
        articleType: 'Buying Guide',
        targetWordCount: 2000,
        productCategories: ['GPU'],
        specificProductIds: ['product-1'],
        relatedArticleIds: ['article-1'],
        saveAsDraft: true,
      }),
    ).toMatchObject({
      primaryKeyword: 'Best GPU for GTA 6',
      productCategories: ['GPU'],
      saveAsDraft: true,
    });
  });
});

function context(): Pick<AiSeoProviderInput, 'products' | 'existingArticles'> {
  return {
    products: [
      {
        id: 'product-1',
        title: 'RTX GPU',
        category: 'GPU',
        componentType: 'GPU',
        valueTier: 'Best Value',
        badge: 'Best Value',
        notes: 'Existing catalog product.',
      },
    ],
    existingArticles: [
      {
        id: 'article-1',
        title: 'Existing Guide',
        slug: 'existing-guide',
        excerpt: 'Existing published article.',
        focusKeyword: 'existing guide',
        categories: ['Hardware'],
      },
    ],
  };
}
