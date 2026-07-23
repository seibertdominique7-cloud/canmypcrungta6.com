import type { AffiliateRetailer } from './affiliate-types';

export type ProductImportField = 'title' | 'imageUrl' | 'retailer';

export interface ImportableProductFields {
  title: string;
  imageUrl: string | null;
  retailer: AffiliateRetailer;
}

export interface ImportedProductFields {
  title: string | null;
  imageUrl: string | null;
  retailer: AffiliateRetailer;
}

export function planProductImport(
  current: ImportableProductFields,
  imported: ImportedProductFields,
  options: { existingProduct: boolean; manuallyEdited: ReadonlySet<ProductImportField> },
) {
  const automaticUpdates: Partial<ImportableProductFields> = {};
  const conflicts: ProductImportField[] = [];
  const candidates: Array<[ProductImportField, ImportableProductFields[ProductImportField] | null]> = [
    ['title', imported.title],
    ['imageUrl', imported.imageUrl],
    ['retailer', imported.retailer === 'Other' ? null : imported.retailer],
  ];

  for (const [field, value] of candidates) {
    if (value === null || value === '' || current[field] === value) continue;
    const hasCurrentValue = field === 'retailer' ? current[field] !== 'Other' : Boolean(current[field]);
    if (options.existingProduct || options.manuallyEdited.has(field) || hasCurrentValue) {
      conflicts.push(field);
    } else {
      Object.assign(automaticUpdates, { [field]: value });
    }
  }

  return { automaticUpdates, conflicts };
}
