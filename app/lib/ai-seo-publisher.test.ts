import { describe, expect, it } from 'vitest';

import { affiliateProductIds } from './rich-text-shared';
import { buildGeneratedArticleBody } from './ai-seo-content';
import { createAiSeoDraftInput } from './ai-seo-draft';
import {
  createAvailableSlug,
  runAiSeoBatch,
  selectProductsForSeo,
} from './ai-seo-selection';
import type {
  AiSeoGenerationInput,
  AiSeoProductContext,
} from './ai-seo-types';
import { articleFixture } from '../test/ai-seo-fixture';

describe('AI SEO draft preparation', () => {
  it('creates clean numeric suffixes for duplicate slugs', async () => {
    const taken = new Set(['best-gpu-for-gta-6', 'best-gpu-for-gta-6-2']);
    await expect(
      createAvailableSlug('Best GPU for GTA 6', async (slug) => taken.has(slug)),
    ).resolves.toBe('best-gpu-for-gta-6-3');
  });

  it('prioritizes selected products and balances catalog tiers', () => {
    const products: AiSeoProductContext[] = [
      product('premium', 'Premium'),
      product('budget', 'Budget'),
      product('value', 'Best Value'),
      product('selected', 'Recommended'),
    ];
    expect(
      selectProductsForSeo(products, {
        topic: 'Best GPU for GTA 6',
        categoryTypes: ['GPU'],
        specificProductIds: ['selected'],
        maximum: 4,
      }).map((item) => item.id),
    ).toEqual(['selected', 'budget', 'value', 'premium']);
  });

  it('stores managed Product IDs without copying affiliate URLs', () => {
    const generated = articleFixture();
    const products = [product('product-1', 'Best Value')];
    const body = buildGeneratedArticleBody(generated, products, [
      {
        id: 'article-1',
        title: 'Existing Guide',
        slug: 'existing-guide',
        excerpt: '',
        focusKeyword: '',
        categories: [],
      },
    ]);
    expect(affiliateProductIds(body)).toEqual(['product-1']);
    expect(body).not.toContain('https://amazon');
    expect(body).not.toMatch(/<h1/i);
  });

  it('always creates an unpublished draft input with editable AI metadata', () => {
    const generated = articleFixture();
    const input = createAiSeoDraftInput({
      generated,
      request: requestFixture(),
      slug: generated.slug,
      body: '<!--cms-rich-text--><p>Complete body</p>',
      relatedArticleIds: ['article-1'],
      categoryIds: ['category-1'],
      primaryCategoryId: 'category-1',
      tagIds: ['tag-1'],
    });
    expect(input).toMatchObject({
      status: 'draft',
      publishedAt: null,
      featuredImage: null,
      featuredImagePrompt: generated.featuredImagePrompt,
      secondaryKeywords: generated.secondaryKeywords,
    });
  });

  it('isolates a failed topic while the rest of the batch saves', async () => {
    const statuses: string[] = [];
    const results = await runAiSeoBatch(
      ['one', 'bad', 'three'],
      async (topic) => {
        if (topic === 'bad') throw new Error('Provider failed');
        return `${topic}-draft`;
      },
      (index, status) => statuses.push(`${index}:${status}`),
      2,
    );
    expect(results.map((item) => item.status)).toEqual(['Saved', 'Failed', 'Saved']);
    expect(results[1].error).toBe('Provider failed');
    expect(statuses).toContain('2:Saved');
  });
});

function product(id: string, valueTier: AiSeoProductContext['valueTier']): AiSeoProductContext {
  return {
    id,
    title: `${id} GPU`,
    category: 'GPU',
    componentType: 'GPU',
    valueTier,
    badge: valueTier ?? 'None',
    notes: '',
  };
}

function requestFixture(): AiSeoGenerationInput {
  return {
    topic: 'Best GPU for GTA 6',
    primaryKeyword: 'best GPU for GTA 6',
    secondaryKeywords: ['GTA 6 graphics card'],
    articleType: 'Buying Guide',
    targetWordCount: 2000,
    productCategories: ['GPU'],
    specificProductIds: ['product-1'],
    relatedArticleIds: ['article-1'],
    saveAsDraft: true,
  };
}
