import { parseCapacity } from './capacity';

export const MANUAL_STORAGE_TYPES = ['NVMe SSD', 'SSD', 'HDD'] as const;

export type ManualStorageType = (typeof MANUAL_STORAGE_TYPES)[number];

export interface ManualStorageCapacity {
  displayValue: string;
  numericGb: number;
}

export function parseManualStorageCapacity(source: string): ManualStorageCapacity | null {
  const trimmed = source.trim();
  const parsed = parseCapacity(trimmed);

  if (
    !parsed ||
    parsed.matchedText.length !== trimmed.length ||
    parsed.unit === 'MB' ||
    parsed.numericAmount <= 0
  ) {
    return null;
  }

  return {
    displayValue: parsed.displayValue,
    numericGb: parsed.numericGb,
  };
}

export function isManualStorageType(value: string): value is ManualStorageType {
  return MANUAL_STORAGE_TYPES.some((storageType) => storageType === value);
}
