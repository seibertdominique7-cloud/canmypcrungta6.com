import { describe, expect, it } from 'vitest';

import { normalizeValueTier, parseProductValueTierCsv } from './product-value-tier-csv';

describe('Value Tier CSV parsing', () => {
  it('detects normalized header aliases and handles BOM, quotes, commas, and Windows lines', () => {
    const result = parseProductValueTierCsv(
      '\uFEFF category ,Tier,productTitle\r\nGPU,\"best value\",\"RTX 4060, 8GB\"\r\n',
    );

    expect(result.detectedHeaders).toEqual({
      category: 'category',
      productTitle: 'productTitle',
      valueTier: 'Tier',
    });
    expect(result.rowsRead).toBe(1);
    expect(result.rows[0]).toMatchObject({
      category: 'GPU',
      productTitle: 'RTX 4060, 8GB',
      valueTier: 'Best Value',
    });
    expect(result.invalidRows).toEqual([]);
  });

  it('accepts the supported title and tier header variations', () => {
    for (const headers of [
      'Category,Product Title,Value Tier',
      'Category,product title,value tier',
      'Category,Title,valueTier',
    ]) {
      const result = parseProductValueTierCsv(`${headers}\nCPU,Ryzen 7 5800X,Recommended\n`);
      expect(result.rows).toHaveLength(1);
    }
  });

  it('normalizes only the six permanent tier labels', () => {
    expect(normalizeValueTier(' premium ')).toBe('Premium');
    expect(normalizeValueTier('BEST-VALUE')).toBe('Best Value');
    expect(normalizeValueTier('Entry Level')).toBeNull();
  });
});
