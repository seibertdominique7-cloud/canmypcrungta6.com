import {
  getMinimumRequirements,
  getRecommendedRequirements,
} from '../data/gta6-requirements';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

export type HardwareFieldKey =
  | 'manufacturer'
  | 'model'
  | 'cpu'
  | 'gpu'
  | 'ram'
  | 'storage'
  | 'storageType'
  | 'windowsVersion';

export interface HardwareFieldDefinition {
  key: HardwareFieldKey;
  label: string;
  placeholder: string;
}

export interface DetectedHardwareField {
  displayValue: string;
  numericGb: number | null;
  confidence: ConfidenceLevel;
}

export type DetectedHardwareSpecs = Record<HardwareFieldKey, DetectedHardwareField>;

export type EditableHardwareSpecs = Record<HardwareFieldKey, string>;

const minimumRequirements = getMinimumRequirements();
const recommendedRequirements = getRecommendedRequirements();

export const HARDWARE_FIELDS: HardwareFieldDefinition[] = [
  {
    key: 'manufacturer',
    label: 'Manufacturer',
    placeholder: 'Dell, HP, Lenovo, ASUS...',
  },
  {
    key: 'model',
    label: 'Model',
    placeholder: 'XPS 8950, Legion 5, custom build...',
  },
  {
    key: 'cpu',
    label: 'CPU',
    placeholder: `${recommendedRequirements.cpu.intel} or ${recommendedRequirements.cpu.amd}`,
  },
  {
    key: 'gpu',
    label: 'GPU',
    placeholder: `${recommendedRequirements.gpu.nvidia} or ${recommendedRequirements.gpu.amd}`,
  },
  {
    key: 'ram',
    label: 'RAM',
    placeholder: `${minimumRequirements.ramGb} GB`,
  },
  {
    key: 'storage',
    label: 'Storage Capacity',
    placeholder: '512 GB or 1 TB',
  },
  {
    key: 'storageType',
    label: 'Storage Type',
    placeholder: 'Select storage type',
  },
  {
    key: 'windowsVersion',
    label: 'Windows Version',
    placeholder: `${minimumRequirements.operatingSystem} or ${recommendedRequirements.operatingSystem}`,
  },
];

export function createEmptyDetectedSpecs(): DetectedHardwareSpecs {
  return HARDWARE_FIELDS.reduce((fields, field) => {
    fields[field.key] = {
      displayValue: '',
      numericGb: null,
      confidence: 'none',
    };

    return fields;
  }, {} as DetectedHardwareSpecs);
}

export function createEmptyEditableSpecs(): EditableHardwareSpecs {
  return HARDWARE_FIELDS.reduce((fields, field) => {
    fields[field.key] = '';

    return fields;
  }, {} as EditableHardwareSpecs);
}

export function detectedToEditableSpecs(
  detectedSpecs: DetectedHardwareSpecs,
): EditableHardwareSpecs {
  return HARDWARE_FIELDS.reduce((fields, field) => {
    fields[field.key] = detectedSpecs[field.key].displayValue;

    return fields;
  }, {} as EditableHardwareSpecs);
}
