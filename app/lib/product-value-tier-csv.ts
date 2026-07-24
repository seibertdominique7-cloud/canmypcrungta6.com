import { PRODUCT_VALUE_TIERS, type ProductValueTier } from './affiliate-types';
import type { ValueTierCsvRow } from './product-value-tier-matching';

export interface InvalidValueTierCsvRow {
  rowNumber: number;
  productTitle: string;
  rawValueTier: string;
  reason: string;
}

export interface ParsedValueTierCsv {
  detectedHeaders: {
    category: string;
    productTitle: string;
    valueTier: string;
  };
  rowsRead: number;
  rows: ValueTierCsvRow[];
  invalidRows: InvalidValueTierCsvRow[];
}

const HEADER_ALIASES = {
  category: new Set(['category']),
  productTitle: new Set(['producttitle', 'title']),
  valueTier: new Set(['valuetier', 'tier']),
};

const NORMALIZED_TIERS = new Map(
  PRODUCT_VALUE_TIERS.map((tier) => [normalizeIdentifier(tier), tier]),
);

export function parseProductValueTierCsv(source: string): ParsedValueTierCsv {
  const records = parseCsv(source.replace(/^\uFEFF/, ''));
  const rawHeaders = records[0]?.map((header) => header.trim()) ?? [];
  if (rawHeaders.length === 0) throw new Error('ALINKS.CSV is empty.');

  const categoryIndex = findHeaderIndex(rawHeaders, HEADER_ALIASES.category);
  const titleIndex = findHeaderIndex(rawHeaders, HEADER_ALIASES.productTitle);
  const tierIndex = findHeaderIndex(rawHeaders, HEADER_ALIASES.valueTier);
  if (categoryIndex < 0 || titleIndex < 0 || tierIndex < 0) {
    throw new Error(
      `Could not detect the Category, Product Title, and Value Tier columns. Found: ${rawHeaders.join(', ')}`,
    );
  }

  const dataRecords = records.slice(1).filter((record) =>
    record.some((value) => value.trim().length > 0),
  );
  const rows: ValueTierCsvRow[] = [];
  const invalidRows: InvalidValueTierCsvRow[] = [];

  dataRecords.forEach((record, index) => {
    const rowNumber = index + 2;
    const category = record[categoryIndex]?.trim() ?? '';
    const productTitle = record[titleIndex]?.trim() ?? '';
    const rawValueTier = record[tierIndex]?.trim() ?? '';
    const valueTier = normalizeValueTier(rawValueTier);

    if (!productTitle || !category || !valueTier) {
      invalidRows.push({
        rowNumber,
        productTitle,
        rawValueTier,
        reason: !productTitle
          ? 'Product title is blank.'
          : !category
            ? 'Category is blank.'
            : `Value Tier is not one of the six allowed values: ${rawValueTier || '(blank)'}`,
      });
      return;
    }

    rows.push({ rowNumber, category, productTitle, valueTier });
  });

  return {
    detectedHeaders: {
      category: rawHeaders[categoryIndex],
      productTitle: rawHeaders[titleIndex],
      valueTier: rawHeaders[tierIndex],
    },
    rowsRead: dataRecords.length,
    rows,
    invalidRows,
  };
}

export function normalizeValueTier(value: string): ProductValueTier | null {
  return NORMALIZED_TIERS.get(normalizeIdentifier(value)) ?? null;
}

function findHeaderIndex(headers: string[], aliases: Set<string>) {
  return headers.findIndex((header) => aliases.has(normalizeIdentifier(header)));
}

function normalizeIdentifier(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function parseCsv(source: string) {
  const records: string[][] = [];
  let record: string[] = [];
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
      record.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      record.push(field);
      if (record.some((value) => value.length > 0)) records.push(record);
      record = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error('ALINKS.CSV contains an unterminated quoted field.');
  record.push(field);
  if (record.some((value) => value.length > 0)) records.push(record);
  return records;
}
