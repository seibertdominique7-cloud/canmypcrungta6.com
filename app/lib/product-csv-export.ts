import { PRODUCT_VALUE_TIERS, type ProductValueTier } from './affiliate-types';

export const PRODUCT_EXPORT_HEADERS = [
  'Product ID',
  'Product Title',
  'Component Type',
  'Category',
  'Value Tier',
  'Retailer',
  'Affiliate URL',
  'Image URL',
  'Badge',
  'Price Text',
  'Enabled',
  'Notes',
] as const;

export interface ProductCsvExportSource {
  id: string;
  title: string;
  componentType: string;
  valueTier: string | null;
  retailer: string;
  affiliateUrl: string;
  imageUrl: string | null;
  defaultPriceText: string;
  enabled: boolean;
  assignments: Array<{ badge: string }>;
}

export function buildProductsCsv(products: ProductCsvExportSource[]) {
  const rows = products.map((product) => {
    assertValidValueTier(product.id, product.valueTier);
    const badges = Array.from(
      new Set(product.assignments.map((assignment) => assignment.badge).filter(Boolean)),
    );

    return [
      product.id,
      product.title,
      product.componentType,
      product.componentType,
      product.valueTier ?? '',
      product.retailer,
      product.affiliateUrl,
      product.imageUrl ?? '',
      badges.join(' | '),
      product.defaultPriceText,
      String(product.enabled),
      '',
    ];
  });

  return `\uFEFF${[
    PRODUCT_EXPORT_HEADERS.map(escapeCsvField).join(','),
    ...rows.map((row) => row.map(escapeCsvField).join(',')),
  ].join('\r\n')}\r\n`;
}

export function escapeCsvField(value: string) {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function assertValidValueTier(productId: string, valueTier: string | null) {
  if (
    valueTier !== null &&
    !PRODUCT_VALUE_TIERS.includes(valueTier as ProductValueTier)
  ) {
    throw new Error(`Product ${productId} contains an unsupported Value Tier.`);
  }
}
