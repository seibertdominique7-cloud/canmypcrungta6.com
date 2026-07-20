import { CPU_PERFORMANCE_TIERS } from './cpu-tiers';
import { GPU_PERFORMANCE_TIERS } from './gpu-tiers';
import {
  getMinimumRequirements,
  getRecommendedRequirements,
} from '../data/gta6-requirements';
import {
  createEmptyDetectedSpecs,
  createEmptyEditableSpecs,
  type DetectedHardwareSpecs,
  type EditableHardwareSpecs,
  type HardwareFieldKey,
} from './hardware-types';
import { isManualStorageType, parseManualStorageCapacity } from './manual-storage';
import { parseCapacity } from './capacity';

export interface ManualEntryInput {
  cpu: string;
  gpu: string;
  ram: string;
  storageCapacity: string;
  storageType: string;
  windowsVersion: string;
}

export interface NormalizedManualEntry {
  specs: EditableHardwareSpecs;
  errors: string[];
}

const minimumRequirements = getMinimumRequirements();
const recommendedRequirements = getRecommendedRequirements();

export const MANUAL_CPU_SUGGESTIONS = CPU_PERFORMANCE_TIERS.map(
  (entry) => entry.canonicalName,
);

export const MANUAL_GPU_SUGGESTIONS = GPU_PERFORMANCE_TIERS.map(
  (entry) => entry.canonicalName,
);

export const MANUAL_RAM_SUGGESTIONS = [
  '8 GB',
  `${minimumRequirements.ramGb} GB`,
  `${recommendedRequirements.ramGb} GB`,
  '64 GB',
];

export const MANUAL_STORAGE_CAPACITY_SUGGESTIONS = ['256 GB', '512 GB', '1 TB', '2 TB'];

export const MANUAL_WINDOWS_OPTIONS = Array.from(
  new Set([
    minimumRequirements.operatingSystem,
    recommendedRequirements.operatingSystem,
  ]),
);

export function normalizeManualEntry(input: ManualEntryInput): NormalizedManualEntry {
  const specs = createEmptyEditableSpecs();
  const errors: string[] = [];

  const cpu = normalizeText(input.cpu);
  const gpu = normalizeText(input.gpu);
  const ram = normalizeText(input.ram);
  const storageCapacity = normalizeText(input.storageCapacity);
  const storageType = normalizeText(input.storageType);
  const windowsVersion = normalizeText(input.windowsVersion);

  specs.cpu = cpu;
  specs.gpu = gpu;
  specs.ram = normalizeRamValue(ram) ?? ram;
  specs.windowsVersion = normalizeWindowsVersion(windowsVersion) ?? windowsVersion;

  const parsedStorage = storageCapacity ? parseManualStorageCapacity(storageCapacity) : null;
  specs.storage = parsedStorage?.displayValue ?? storageCapacity;
  specs.storageType = storageType;

  if (!cpu) {
    errors.push('CPU is required.');
  }

  if (!gpu) {
    errors.push('GPU is required.');
  }

  if (!ram) {
    errors.push('RAM is required.');
  } else if (!normalizeRamValue(ram)) {
    errors.push(`RAM should look like ${MANUAL_RAM_SUGGESTIONS.join(', ')}.`);
  }

  if (storageCapacity && !parsedStorage) {
    errors.push('Storage capacity should look like 512 GB or 1 TB.');
  }

  if (storageType && !isManualStorageType(storageType)) {
    errors.push('Choose NVMe SSD, SSD, or HDD for storage type.');
  }

  if (storageCapacity && !storageType) {
    errors.push('Select a storage type or leave both storage fields blank.');
  }

  if (storageType && !storageCapacity) {
    errors.push('Enter a storage capacity or leave both storage fields blank.');
  }

  if (windowsVersion && !normalizeWindowsVersion(windowsVersion)) {
    errors.push(`Choose ${MANUAL_WINDOWS_OPTIONS.join(', ')}, or leave the field blank.`);
  }

  return { specs, errors };
}

export function createManualDetectedSpecs(specs: EditableHardwareSpecs): DetectedHardwareSpecs {
  const detected = createEmptyDetectedSpecs();

  (Object.keys(specs) as HardwareFieldKey[]).forEach((key) => {
    const displayValue = specs[key].trim();

    if (!displayValue) {
      return;
    }

    detected[key] = {
      displayValue,
      numericGb: getNumericGb(key, displayValue),
      confidence: 'high',
    };
  });

  return detected;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeWindowsVersion(value: string) {
  if (!value) {
    return '';
  }

  const match = value.match(/^Windows\s*(\d{1,2})$/i);

  if (!match) {
    return null;
  }

  const normalized = `Windows ${match[1]}`;
  return (
    MANUAL_WINDOWS_OPTIONS.find(
      (option) => option.toLowerCase() === normalized.toLowerCase(),
    ) ?? null
  );
}

function normalizeRamValue(value: string) {
  if (!value) {
    return '';
  }

  const parsed = parseManualRam(value);

  if (!parsed) {
    return null;
  }

  return parsed.displayValue;
}

function getNumericGb(key: HardwareFieldKey, displayValue: string) {
  if (key === 'ram') {
    return parseManualRam(displayValue)?.numericGb ?? null;
  }

  if (key === 'storage') {
    const parsed = parseManualStorageCapacity(displayValue);
    return parsed?.numericGb ?? null;
  }

  return null;
}

function parseManualRam(value: string) {
  const trimmed = value.trim();
  const parsed = parseCapacity(trimmed);

  if (!parsed || parsed.unit !== 'GB' || parsed.matchedText.length !== trimmed.length) {
    return null;
  }

  return parsed;
}
