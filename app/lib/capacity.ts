export type CapacityUnit = 'GB' | 'MB' | 'TB';

export interface ParsedCapacity {
  displayValue: string;
  matchedText: string;
  numericAmount: number;
  numericGb: number;
  rawAmount: string;
  unit: CapacityUnit;
}

const AMOUNT_SOURCE = String.raw`\d+(?:(?:[\u00a0\u202f ]*[.,][\u00a0\u202f ]*\d+)|(?:[\u00a0\u202f ]+\d{3}))*`;
const CAPACITY_PATTERN = new RegExp(
  String.raw`(${AMOUNT_SOURCE})\s*(GB|MB|TB)\b`,
  'i',
);

/**
 * Extracts one capacity without ever collapsing punctuation into adjacent digits.
 * Decimal commas are normalized only after the complete amount token is captured.
 */
export function parseCapacity(source: string): ParsedCapacity | null {
  const match = source.match(CAPACITY_PATTERN);

  if (!match) {
    return null;
  }

  const rawAmount = match[1];
  const unit = match[2].toUpperCase() as CapacityUnit;
  const numericAmount = parseLocalizedAmount(rawAmount, unit);

  if (numericAmount === null) {
    return null;
  }

  return {
    displayValue: `${rawAmount} ${unit}`,
    matchedText: match[0],
    numericAmount,
    numericGb: toGigabytes(numericAmount, unit),
    rawAmount,
    unit,
  };
}

export function parseCapacityGb(source: string) {
  return parseCapacity(source)?.numericGb ?? null;
}

function parseLocalizedAmount(rawAmount: string, unit: CapacityUnit) {
  const compact = rawAmount.replace(/[\u00a0\u202f ]/g, '');
  const lastDot = compact.lastIndexOf('.');
  const lastComma = compact.lastIndexOf(',');
  const separators = [...compact].filter((character) => character === '.' || character === ',');
  let normalized: string;

  if (separators.length === 0) {
    normalized = compact;
  } else if (lastDot >= 0 && lastComma >= 0) {
    const decimalIndex = Math.max(lastDot, lastComma);
    normalized = `${compact.slice(0, decimalIndex).replace(/[.,]/g, '')}.${compact.slice(decimalIndex + 1)}`;
  } else {
    const separator = lastDot >= 0 ? '.' : ',';
    const parts = compact.split(separator);
    const looksGrouped = isGroupedNumber(parts, unit);
    normalized = looksGrouped ? parts.join('') : `${parts.slice(0, -1).join('')}.${parts.at(-1)}`;
  }

  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function isGroupedNumber(parts: string[], unit: CapacityUnit) {
  if (parts.length < 2 || parts.some((part) => !/^\d+$/.test(part))) {
    return false;
  }

  const groupedTail = parts.slice(1).every((part) => part.length === 3);

  if (!groupedTail) {
    return false;
  }

  if (parts.length > 2) {
    return true;
  }

  // Windows commonly reports total physical memory as 32,768 MB. For GB,
  // a single three-digit fraction is retained unless it is an obvious 1,024-style value.
  if (unit === 'MB') {
    return true;
  }

  return unit === 'GB' && parts[0].length === 1;
}

function toGigabytes(amount: number, unit: CapacityUnit) {
  if (unit === 'TB') {
    return amount * 1024;
  }

  if (unit === 'MB') {
    return amount / 1024;
  }

  return amount;
}
