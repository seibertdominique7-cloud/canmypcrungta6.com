import type { ProductComponentType, ProductValueTier } from './affiliate-types';

export interface ValueTierCsvRow {
  rowNumber: number;
  category: string;
  valueTier: ProductValueTier;
  productTitle: string;
}

export interface ValueTierProductCandidate {
  id: string;
  title: string;
  componentType: string;
}

export type ValueTierMatchKind = 'exact-title' | 'category-normalized-title' | 'high-confidence';

export interface ValueTierMatch {
  row: ValueTierCsvRow;
  product: ValueTierProductCandidate;
  matchKind: ValueTierMatchKind;
}

export interface AmbiguousValueTierMatch {
  row: ValueTierCsvRow;
  candidates: ValueTierProductCandidate[];
  reason: string;
}

export interface ValueTierMappingReport {
  exactMatches: ValueTierMatch[];
  highConfidenceMatches: ValueTierMatch[];
  ambiguousMatches: AmbiguousValueTierMatch[];
  unmatchedCsvRows: ValueTierCsvRow[];
  existingProductsWithoutCsvMatches: ValueTierProductCandidate[];
}

const CATEGORY_COMPONENT_MAP: Record<string, ProductComponentType> = {
  cpu: 'CPU',
  gpu: 'GPU',
  ram: 'RAM',
  storage: 'Storage',
  monitor: 'Monitor',
  keyboard: 'Keyboard',
  mouse: 'Mouse',
  headset: 'Headset',
  'mouse pad': 'Other',
  webcam: 'Other',
  microphone: 'Other',
  'streaming accessory': 'Other',
  ups: 'Other',
};

const TITLE_STOP_WORDS = new Set([
  'amd',
  'amazon',
  'back',
  'card',
  'computer',
  'core',
  'desktop',
  'gaming',
  'geforce',
  'graphics',
  'intel',
  'kit',
  'nvidia',
  'pc',
  'radeon',
  'the',
]);

const GENERIC_UNIT_KEY = /^\d+(?:gb|tb|hz|p)$/;

export function buildValueTierMapping(
  rows: ValueTierCsvRow[],
  products: ValueTierProductCandidate[],
): ValueTierMappingReport {
  const provisionalMatches: ValueTierMatch[] = [];
  const ambiguousMatches: AmbiguousValueTierMatch[] = [];
  const unmatchedCsvRows: ValueTierCsvRow[] = [];

  for (const row of rows) {
    const normalizedCsvTitle = normalizeProductTitle(row.productTitle);
    const exactTitleCandidates = products.filter(
      (product) => normalizeProductTitle(product.title) === normalizedCsvTitle,
    );
    if (exactTitleCandidates.length === 1) {
      provisionalMatches.push({
        row,
        product: exactTitleCandidates[0],
        matchKind: 'exact-title',
      });
      continue;
    }
    if (exactTitleCandidates.length > 1) {
      const expectedComponent = getExpectedComponent(row.category);
      const categoryCandidates = exactTitleCandidates.filter((product) =>
        componentMatches(product.componentType, expectedComponent),
      );
      if (categoryCandidates.length === 1) {
        provisionalMatches.push({
          row,
          product: categoryCandidates[0],
          matchKind: 'category-normalized-title',
        });
        continue;
      }
      ambiguousMatches.push({
        row,
        candidates: categoryCandidates.length > 0 ? categoryCandidates : exactTitleCandidates,
        reason: 'More than one product has the same normalized title.',
      });
      continue;
    }

    const expectedComponent = getExpectedComponent(row.category);
    const highConfidenceCandidates = products.filter(
      (product) =>
        componentMatches(product.componentType, expectedComponent) &&
        isHighConfidenceTitleMatch(row.productTitle, product.title),
    );
    if (highConfidenceCandidates.length === 1) {
      provisionalMatches.push({
        row,
        product: highConfidenceCandidates[0],
        matchKind: 'high-confidence',
      });
      continue;
    }
    if (highConfidenceCandidates.length > 1) {
      ambiguousMatches.push({
        row,
        candidates: highConfidenceCandidates,
        reason: 'Multiple products share the same high-confidence model signature.',
      });
      continue;
    }

    unmatchedCsvRows.push(row);
  }

  const productToMatches = new Map<string, ValueTierMatch[]>();
  for (const match of provisionalMatches) {
    const matches = productToMatches.get(match.product.id) ?? [];
    matches.push(match);
    productToMatches.set(match.product.id, matches);
  }

  const acceptedMatches = provisionalMatches.filter((match) => {
    const collisions = productToMatches.get(match.product.id) ?? [];
    if (collisions.length === 1) return true;
    if (collisions[0] === match) {
      for (const collision of collisions) {
        ambiguousMatches.push({
          row: collision.row,
          candidates: [collision.product],
          reason: 'Multiple CSV rows resolve to the same existing product.',
        });
      }
    }
    return false;
  });

  const matchedProductIds = new Set(acceptedMatches.map((match) => match.product.id));

  return {
    exactMatches: acceptedMatches.filter((match) => match.matchKind !== 'high-confidence'),
    highConfidenceMatches: acceptedMatches.filter(
      (match) => match.matchKind === 'high-confidence',
    ),
    ambiguousMatches,
    unmatchedCsvRows,
    existingProductsWithoutCsvMatches: products.filter(
      (product) => !matchedProductIds.has(product.id),
    ),
  };
}

export function normalizeProductTitle(value: string) {
  return value
    .replace(/[®™©]/g, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(\d+(?:\.\d+)?)\s+(mb|gb|tb|hz|va|w|p)\b/g, '$1$2');
}

export function isHighConfidenceTitleMatch(csvTitle: string, productTitle: string) {
  const normalizedCsv = normalizeProductTitle(csvTitle);
  const normalizedProduct = normalizeProductTitle(productTitle);
  if (!normalizedCsv || !normalizedProduct || normalizedCsv === normalizedProduct) return false;

  const csvKeys = extractModelKeys(normalizedCsv);
  if (csvKeys.length === 0) return false;

  const productCompact = normalizedProduct.replace(/\s+/g, '');
  const productKeys = new Set(extractModelKeys(normalizedProduct));
  const distinctiveKeys = csvKeys.filter((key) => !GENERIC_UNIT_KEY.test(key));
  const requiredKeys = distinctiveKeys.length > 0 ? distinctiveKeys : csvKeys;
  if (!requiredKeys.every((key) => productKeys.has(key))) return false;
  if (hasConflictingMeasuredSpecification(normalizedCsv, normalizedProduct)) return false;
  if (hasUnmatchedRevision(normalizedCsv, normalizedProduct)) return false;

  const csvTokens = significantTokens(normalizedCsv);
  const productTokens = new Set(significantTokens(normalizedProduct));
  if (csvTokens.length === 0) return false;

  const matchedTokens = csvTokens.filter(
    (token) => productTokens.has(token) || productCompact.includes(token),
  ).length;
  return matchedTokens / csvTokens.length >= 0.8;
}

function getExpectedComponent(category: string) {
  return CATEGORY_COMPONENT_MAP[normalizeProductTitle(category)] ?? null;
}

function componentMatches(componentType: string, expected: ProductComponentType | null) {
  return expected === null || componentType === expected;
}

function significantTokens(normalizedTitle: string) {
  return normalizedTitle
    .split(' ')
    .filter(
      (token) =>
        token.length > 1 &&
        !TITLE_STOP_WORDS.has(token) &&
        !GENERIC_UNIT_KEY.test(token),
    );
}

function hasConflictingMeasuredSpecification(csvTitle: string, productTitle: string) {
  const csvUnits = measuredUnits(csvTitle);
  const productUnits = measuredUnits(productTitle);
  for (const [unit, csvValues] of csvUnits) {
    const productValues = productUnits.get(unit);
    if (productValues && csvValues[0] !== productValues[0]) return true;
  }
  return false;
}

function measuredUnits(title: string) {
  const units = new Map<string, string[]>();
  for (const match of title.matchAll(/\b(\d+(?:\.\d+)?)\s*(gb|tb|hz|p|va|w)\b/g)) {
    const values = units.get(match[2]) ?? [];
    values.push(match[1]);
    units.set(match[2], values);
  }
  return units;
}

function hasUnmatchedRevision(csvTitle: string, productTitle: string) {
  const revisionPattern = /\b(?:mk|gen|v)\s*\d+\b/g;
  const csvRevisions = new Set(
    Array.from(csvTitle.matchAll(revisionPattern), (match) => match[0].replace(/\s+/g, '')),
  );
  const productRevisions = Array.from(
    productTitle.matchAll(revisionPattern),
    (match) => match[0].replace(/\s+/g, ''),
  );
  return productRevisions.some((revision) => !csvRevisions.has(revision));
}

function extractModelKeys(normalizedTitle: string) {
  const keys = new Set<string>();
  const compactPatternMatches = [
    ...normalizedTitle.matchAll(/\b(?:rtx|gtx)\s*\d{3,4}(?:\s*(?:ti|super))?\b/g),
    ...normalizedTitle.matchAll(/\brx\s*\d{3,4}(?:\s*(?:xtx|xt))?\b/g),
    ...normalizedTitle.matchAll(/\bi[3579]\s*\d{4,5}[a-z0-9]*\b/g),
    ...normalizedTitle.matchAll(/\b[3579]\s*\d{4}[a-z0-9]*\b/g),
  ];
  for (const match of compactPatternMatches) keys.add(match[0].replace(/\s+/g, ''));

  const tokens = normalizedTitle.split(' ');
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (/[a-z]/.test(token) && /\d/.test(token)) keys.add(token);

    const next = tokens[index + 1];
    if (!next) continue;
    if (/^\d+$/.test(next) && /^[a-z]{2,}$/.test(token) && next.length <= 3) {
      keys.add(`${token}${next}`);
    }
    if (/^\d{3,4}$/.test(token) && /^[a-z]{2,5}$/.test(next)) {
      keys.add(`${token}${next}`);
    }
  }

  return Array.from(keys);
}
