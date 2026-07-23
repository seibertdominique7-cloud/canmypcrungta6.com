import { describe, expect, it } from 'vitest';

import { planProductImport, type ProductImportField } from './product-import-fields';

describe('product import field planning', () => {
  const imported = {
    title: 'GeForce RTX 4070',
    imageUrl: 'https://cdn.example/rtx-4070.jpg',
    retailer: 'Best Buy' as const,
  };

  it('fills every empty field on a new product', () => {
    expect(planProductImport(
      { title: '', imageUrl: null, retailer: 'Other' },
      imported,
      { existingProduct: false, manuallyEdited: new Set<ProductImportField>() },
    )).toEqual({ automaticUpdates: imported, conflicts: [] });
  });

  it('preserves nonempty and manually edited fields until the admin confirms them', () => {
    const result = planProductImport(
      { title: 'Manual title', imageUrl: null, retailer: 'Other' },
      imported,
      { existingProduct: false, manuallyEdited: new Set<ProductImportField>(['title', 'imageUrl']) },
    );
    expect(result.automaticUpdates).toEqual({ retailer: 'Best Buy' });
    expect(result.conflicts).toEqual(['title', 'imageUrl']);
  });

  it('puts every changed field on an existing product into the review step', () => {
    const result = planProductImport(
      { title: 'Existing title', imageUrl: null, retailer: 'Amazon' },
      imported,
      { existingProduct: true, manuallyEdited: new Set<ProductImportField>() },
    );
    expect(result.automaticUpdates).toEqual({});
    expect(result.conflicts).toEqual(['title', 'imageUrl', 'retailer']);
  });

  it('does not replace a retailer with an unknown metadata result', () => {
    const result = planProductImport(
      { title: '', imageUrl: null, retailer: 'Amazon' },
      { title: null, imageUrl: null, retailer: 'Other' },
      { existingProduct: false, manuallyEdited: new Set<ProductImportField>() },
    );
    expect(result).toEqual({ automaticUpdates: {}, conflicts: [] });
  });
});
