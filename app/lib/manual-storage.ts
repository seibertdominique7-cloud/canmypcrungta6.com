export const MANUAL_STORAGE_TYPES = ['NVMe SSD', 'SSD', 'HDD'] as const;

export type ManualStorageType = (typeof MANUAL_STORAGE_TYPES)[number];

export interface ManualStorageCapacity {
  displayValue: string;
  numericGb: number;
}

const MANUAL_STORAGE_CAPACITY_PATTERN = /^(\d+(?:[.,]\d+)?)\s*(GB|TB)$/i;

export function parseManualStorageCapacity(source: string): ManualStorageCapacity | null {
  const match = source.trim().match(MANUAL_STORAGE_CAPACITY_PATTERN);

  if (!match) {
    return null;
  }

  const rawAmount = match[1];
  const amount = Number.parseFloat(rawAmount.replace(',', '.'));
  const unit = match[2].toUpperCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    displayValue: `${rawAmount} ${unit}`,
    numericGb: unit === 'TB' ? amount * 1024 : amount,
  };
}

export function isManualStorageType(value: string): value is ManualStorageType {
  return MANUAL_STORAGE_TYPES.some((storageType) => storageType === value);
}
