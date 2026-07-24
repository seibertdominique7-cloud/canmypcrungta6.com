import { describe, expect, it } from 'vitest';

import {
  buildValueTierMapping,
  isHighConfidenceTitleMatch,
  normalizeProductTitle,
  type ValueTierCsvRow,
  type ValueTierProductCandidate,
} from './product-value-tier-matching';

const row: ValueTierCsvRow = {
  rowNumber: 2,
  category: 'GPU',
  valueTier: 'Recommended',
  productTitle: 'NVIDIA GeForce RTX 3070',
};

describe('product value-tier title matching', () => {
  it('normalizes only harmless case, spacing, trademark, and punctuation differences', () => {
    expect(normalizeProductTitle(' Intel®   Core™ i7-12700K ')).toBe('intel core i7 12700k');
  });

  it('recognizes a full model signature inside a longer retailer title', () => {
    expect(
      isHighConfidenceTitleMatch(
        'NVIDIA GeForce GTX 1660',
        'MSI Gaming NVIDIA GeForce GTX 1660 Graphics Card',
      ),
    ).toBe(true);
  });

  it('does not accept a partial model or a different suffix', () => {
    expect(isHighConfidenceTitleMatch('Intel Core i7-12700K', 'Intel Core i7-12700KF')).toBe(false);
    expect(isHighConfidenceTitleMatch('Redragon K552 Kumara', 'Redragon K552P Keyboard')).toBe(false);
  });

  it('rejects conflicting measured specs and unlisted model revisions', () => {
    expect(
      isHighConfidenceTitleMatch(
        'Samsung Odyssey G5 27" 1440p 165Hz',
        'Samsung Odyssey G5 27" 1440p 180Hz Gaming Monitor',
      ),
    ).toBe(false);
    expect(
      isHighConfidenceTitleMatch('Elgato Wave:3', 'Elgato Wave:3 MK.2 USB Microphone'),
    ).toBe(false);
    expect(isHighConfidenceTitleMatch('16GB DDR4 Kit', '32 GB DDR4 kit')).toBe(false);
  });

  it('skips ambiguous model matches instead of choosing one product', () => {
    const products: ValueTierProductCandidate[] = [
      { id: 'one', title: 'NVIDIA GeForce RTX 3070 Founders Edition', componentType: 'GPU' },
      { id: 'two', title: 'MSI GeForce RTX 3070 Gaming GPU', componentType: 'GPU' },
    ];

    const report = buildValueTierMapping([row], products);

    expect(report.exactMatches).toHaveLength(0);
    expect(report.highConfidenceMatches).toHaveLength(0);
    expect(report.ambiguousMatches).toHaveLength(1);
    expect(report.ambiguousMatches[0].candidates).toHaveLength(2);
  });

  it('prefers an exact title and leaves unrelated products unmatched', () => {
    const products: ValueTierProductCandidate[] = [
      { id: 'exact', title: row.productTitle, componentType: 'GPU' },
      { id: 'other', title: 'NVIDIA GeForce RTX 4070', componentType: 'GPU' },
    ];

    const report = buildValueTierMapping([row], products);

    expect(report.exactMatches[0]).toMatchObject({
      product: { id: 'exact' },
      matchKind: 'exact-title',
    });
    expect(report.existingProductsWithoutCsvMatches).toEqual([products[1]]);
  });

  it('treats spacing between a capacity and unit as a harmless title difference', () => {
    const report = buildValueTierMapping(
      [{
        rowNumber: 18,
        category: 'RAM',
        valueTier: 'Recommended',
        productTitle: '32GB DDR4 Kit',
      }],
      [{ id: 'ram', title: '32 GB DDR4 kit', componentType: 'RAM' }],
    );

    expect(report.exactMatches).toHaveLength(1);
    expect(report.exactMatches[0].product.id).toBe('ram');
  });
});
