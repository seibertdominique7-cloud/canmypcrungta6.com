import { describe, expect, it } from 'vitest';

import {
  buildProductsCsv,
  escapeCsvField,
  PRODUCT_EXPORT_HEADERS,
  type ProductCsvExportSource,
} from './product-csv-export';

const product: ProductCsvExportSource = {
  id: 'existing-product-id',
  title: 'GPU, "Special"\nEdition',
  componentType: 'GPU',
  valueTier: 'Best Value',
  retailer: 'Amazon',
  affiliateUrl: 'https://example.com/product?tag=exact-20&note=a,b',
  imageUrl: null,
  defaultPriceText: 'Check "Current" Price',
  enabled: true,
  assignments: [{ badge: 'Recommended' }, { badge: 'Recommended' }, { badge: 'None' }],
};

describe('Affiliate Products CSV export', () => {
  it('exports the requested columns and exact database values with a UTF-8 BOM', () => {
    const csv = buildProductsCsv([product]);
    const rows = parseCsv(csv.replace(/^\uFEFF/, ''));

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(rows[0]).toEqual(PRODUCT_EXPORT_HEADERS);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual([
      product.id,
      product.title,
      product.componentType,
      product.componentType,
      'Best Value',
      product.retailer,
      product.affiliateUrl,
      '',
      'Recommended | None',
      product.defaultPriceText,
      'true',
      '',
    ]);
  });

  it('leaves a missing Value Tier blank', () => {
    const rows = parseCsv(
      buildProductsCsv([{ ...product, valueTier: null }]).replace(/^\uFEFF/, ''),
    );

    expect(rows[1][4]).toBe('');
  });

  it('escapes commas, quotes, and line breaks without changing the value', () => {
    expect(escapeCsvField('plain')).toBe('plain');
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('a"b')).toBe('"a""b"');
    expect(escapeCsvField('a\nb')).toBe('"a\nb"');
  });

  it('refuses to export unsupported stored tiers', () => {
    expect(() => buildProductsCsv([{ ...product, valueTier: 'Entry Level' }])).toThrow(
      'unsupported Value Tier',
    );
  });
});

function parseCsv(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\r' || character === '\n') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  return rows;
}
