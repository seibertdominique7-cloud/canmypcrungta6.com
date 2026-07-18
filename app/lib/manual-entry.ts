import { gtaViRequirements } from './gta6-requirements';
import {
  createEmptyDetectedSpecs,
  createEmptyEditableSpecs,
  type DetectedHardwareSpecs,
  type EditableHardwareSpecs,
  type HardwareFieldKey,
} from './hardware-types';
import { isManualStorageType, parseManualStorageCapacity } from './manual-storage';

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

const MANUAL_RAM_PATTERN = /^(\d+(?:[.,]\d+)?)\s*(GB)$/i;

export const MANUAL_CPU_SUGGESTIONS = [
  gtaViRequirements.minimum.cpu.intel,
  gtaViRequirements.minimum.cpu.amd,
  gtaViRequirements.recommended.cpu.intel,
  gtaViRequirements.recommended.cpu.amd,
  'Intel Core i5-12400F',
  'AMD Ryzen 5 5600X',
  'Intel Core i7-14700K',
  'AMD Ryzen 7 7800X3D',
].filter((value): value is string => Boolean(value));

export const MANUAL_GPU_SUGGESTIONS = [
  gtaViRequirements.minimum.gpu.nvidia,
  gtaViRequirements.minimum.gpu.amd,
  gtaViRequirements.recommended.gpu.nvidia,
  gtaViRequirements.recommended.gpu.amd,
  'NVIDIA RTX 4060',
  'AMD RX 7600',
  'Intel Iris Xe Graphics',
  'AMD Radeon 780M Graphics',
].filter((value): value is string => Boolean(value));

export const MANUAL_RAM_SUGGESTIONS = ['8 GB', '16 GB', '32 GB', '64 GB'];

export const MANUAL_STORAGE_CAPACITY_SUGGESTIONS = ['256 GB', '512 GB', '1 TB', '2 TB'];

export const MANUAL_WINDOWS_OPTIONS = ['Windows 10', 'Windows 11'];

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
    errors.push('RAM should look like 8 GB, 16 GB, 32 GB, or 64 GB.');
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
    errors.push('Choose Windows 10, Windows 11, or leave the field blank.');
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

  if (/^Windows\s*(10|11)$/i.test(value)) {
    return value.replace(/\s+/g, ' ').replace(/Windows\s*(10|11)/i, 'Windows $1');
  }

  return null;
}

function normalizeRamValue(value: string) {
  if (!value) {
    return '';
  }

  const match = value.match(MANUAL_RAM_PATTERN);

  if (!match) {
    return null;
  }

  return `${match[1]} GB`;
}

function getNumericGb(key: HardwareFieldKey, displayValue: string) {
  if (key === 'ram') {
    const match = displayValue.match(MANUAL_RAM_PATTERN);

    if (!match) {
      return null;
    }

    const amount = Number.parseFloat(match[1].replace(',', '.'));
    return Number.isFinite(amount) ? amount : null;
  }

  if (key === 'storage') {
    const parsed = parseManualStorageCapacity(displayValue);
    return parsed?.numericGb ?? null;
  }

  return null;
}
