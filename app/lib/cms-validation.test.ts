import { describe, expect, it } from 'vitest';

import { createSlug, validateArticleInput, validatePageInput, validatePath } from './cms-validation';

describe('CMS validation', () => {
  it('creates stable SEO slugs', () => {
    expect(createSlug('Best GPUs for GTA VI!')).toBe('best-gpus-for-gta-vi');
  });

  it('requires scheduling data for scheduled articles', () => {
    const result = validateArticleInput({ title: 'Scheduled', status: 'scheduled', contentType: 'news' });
    expect(result.fieldErrors.scheduledAt).toBeTruthy();
  });

  it('retains the selected primary category in the category list', () => {
    const result = validateArticleInput({
      title: 'Categorized',
      status: 'draft',
      contentType: 'standard',
      categoryIds: [],
      primaryCategoryId: 'category-1',
    });
    expect(result.data?.categoryIds).toEqual(['category-1']);
    expect(result.data?.primaryCategoryId).toBe('category-1');
  });

  it('does not offer an unsupported scheduled state for static pages', () => {
    const result = validatePageInput({ title: 'Scheduled page', status: 'scheduled', pageTemplate: 'standard' });
    expect(result.fieldErrors.status).toBeTruthy();
  });

  it('accepts safe internal redirect paths', () => {
    expect(validatePath('/articles/old', 'Source')).toEqual({ value: '/articles/old', error: '' });
    expect(validatePath('https://evil.example', 'Source').error).toBeTruthy();
  });
});
