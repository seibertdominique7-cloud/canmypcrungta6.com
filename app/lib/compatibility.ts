import {
  getMinimumRequirements,
  getRecommendedRequirements,
  getRequirementStatusAdjective,
  type StorageType,
} from '../data/gta6-requirements';
import {
  resolveCpuModel,
  resolveGpuModel,
  type HardwareTierMatch,
} from './hardware-ranking';
import {
  type DetectedHardwareSpecs,
  type EditableHardwareSpecs,
  type HardwareFieldKey,
} from './hardware-types';
import { parseCapacityGb } from './capacity';

export type ComponentStatus = 'recommended' | 'minimum' | 'below' | 'unknown';

export type CompatibilityComponentKey =
  | 'cpu'
  | 'gpu'
  | 'ram'
  | 'storage'
  | 'windowsVersion';

export type OverallResultStatus = 'recommended' | 'minimum' | 'fail' | 'unknown';

export interface ComponentCompatibility {
  key: CompatibilityComponentKey;
  label: string;
  detected: string;
  status: ComponentStatus;
  statusLabel: string;
  detail: string;
}

export interface CompatibilityResult {
  overall: {
    status: OverallResultStatus;
    title: string;
    description: string;
  };
  components: ComponentCompatibility[];
  missingInfo: string[];
  uncertainInfo: string[];
}

const STATUS_LABELS: Record<ComponentStatus, string> = {
  recommended: 'Recommended',
  minimum: 'Minimum',
  below: 'Below Minimum',
  unknown: 'Unknown',
};

const COMPONENT_LABELS: Record<CompatibilityComponentKey, string> = {
  cpu: 'CPU',
  gpu: 'GPU',
  ram: 'RAM',
  storage: 'Storage',
  windowsVersion: 'Windows',
};

const REQUIRED_RESULT_FIELDS: Array<{ key: HardwareFieldKey; label: string }> = [
  { key: 'cpu', label: 'CPU' },
  { key: 'gpu', label: 'GPU' },
  { key: 'ram', label: 'RAM' },
  { key: 'storage', label: 'Storage' },
  { key: 'windowsVersion', label: 'Windows' },
];

const DETERMINING_COMPONENT_KEYS: CompatibilityComponentKey[] = ['cpu', 'gpu', 'ram'];
const minimumRequirements = getMinimumRequirements();
const recommendedRequirements = getRecommendedRequirements();
const requirementStatusAdjective = getRequirementStatusAdjective();
const requirementStatusWord = requirementStatusAdjective.toLowerCase();
const STORAGE_TYPE_TIERS: Record<StorageType, number> = {
  HDD: 1,
  SSD: 2,
  'NVMe SSD': 3,
};

const MINIMUM_CPU_TIER = requirementTier(
  [minimumRequirements.cpu.intel, minimumRequirements.cpu.amd],
  resolveCpuModel,
);
const RECOMMENDED_CPU_TIER = requirementTier(
  [recommendedRequirements.cpu.intel, recommendedRequirements.cpu.amd],
  resolveCpuModel,
);
const MINIMUM_GPU_TIER = requirementTier(
  [minimumRequirements.gpu.nvidia, minimumRequirements.gpu.amd],
  resolveGpuModel,
);
const RECOMMENDED_GPU_TIER = requirementTier(
  [recommendedRequirements.gpu.nvidia, recommendedRequirements.gpu.amd],
  resolveGpuModel,
);

export function evaluateCompatibility(
  specs: EditableHardwareSpecs,
  detectedSpecs: DetectedHardwareSpecs | null,
): CompatibilityResult {
  const components: ComponentCompatibility[] = [
    evaluateCpu(specs.cpu),
    evaluateGpu(specs.gpu),
    evaluateRam(specs.ram),
    evaluateStorage(specs.storage, specs.storageType),
    evaluateWindowsVersion(specs.windowsVersion),
  ];
  const missingInfo = getMissingInfo(specs);
  const uncertainInfo = getUncertainInfo(detectedSpecs);

  return {
    overall: getOverallResult(components),
    components,
    missingInfo,
    uncertainInfo,
  };
}

export function hasEditableSpecs(specs: EditableHardwareSpecs) {
  return Object.values(specs).some((value) => value.trim().length > 0);
}

function evaluateCpu(value: string): ComponentCompatibility {
  const detected = value.trim();
  const match = resolveCpuModel(detected);

  if (!detected) {
    return component('cpu', detected, 'unknown', 'Enter an Intel Core i-series or AMD Ryzen CPU.');
  }

  if (!match) {
    return component(
      'cpu',
      detected,
      'unknown',
      'This exact CPU model is not in the hardware catalog. Check or edit the detected name.',
    );
  }

  return compareTieredComponent({
    key: 'cpu',
    detected,
    match,
    minimumTier: MINIMUM_CPU_TIER,
    recommendedTier: RECOMMENDED_CPU_TIER,
    minimumDetail: requirementPair(minimumRequirements.cpu.intel, minimumRequirements.cpu.amd),
    recommendedDetail: requirementPair(
      recommendedRequirements.cpu.intel,
      recommendedRequirements.cpu.amd,
    ),
  });
}

function evaluateGpu(value: string): ComponentCompatibility {
  const detected = value.trim();
  const match = resolveGpuModel(detected);

  if (!detected) {
    return component('gpu', detected, 'unknown', 'Enter an NVIDIA GeForce/RTX/GTX or AMD Radeon RX GPU.');
  }

  if (!match) {
    return component(
      'gpu',
      detected,
      'unknown',
      'This exact GPU model is not in the hardware catalog. Check or edit the detected name.',
    );
  }

  return compareTieredComponent({
    key: 'gpu',
    detected,
    match,
    minimumTier: MINIMUM_GPU_TIER,
    recommendedTier: RECOMMENDED_GPU_TIER,
    minimumDetail: requirementPair(minimumRequirements.gpu.nvidia, minimumRequirements.gpu.amd),
    recommendedDetail: requirementPair(
      recommendedRequirements.gpu.nvidia,
      recommendedRequirements.gpu.amd,
    ),
  });
}

function evaluateRam(value: string): ComponentCompatibility {
  const detected = value.trim();
  const gb = parseCapacityGb(detected);

  if (!detected || gb === null) {
    return component('ram', detected, 'unknown', 'Enter RAM capacity in GB.');
  }

  if (gb >= recommendedRequirements.ramGb) {
    return component('ram', detected, 'recommended', `${requirementStatusAdjective} recommended: ${recommendedRequirements.ramGb} GB.`);
  }

  if (gb >= minimumRequirements.ramGb) {
    return component('ram', detected, 'minimum', `${requirementStatusAdjective} minimum: ${minimumRequirements.ramGb} GB.`);
  }

  return component('ram', detected, 'below', `${requirementStatusAdjective} minimum: ${minimumRequirements.ramGb} GB.`);
}

function evaluateStorage(value: string, explicitStorageType: string): ComponentCompatibility {
  const capacity = value.trim();
  const storageTypeText = explicitStorageType.trim();
  const detected = formatDetectedStorage(capacity, storageTypeText);
  const gb = parseCapacityGb(capacity);

  if (!capacity || gb === null) {
    return component(
      'storage',
      '',
      'unknown',
      "Storage wasn't detected from this screenshot.",
    );
  }

  if (gb < minimumRequirements.storageGb) {
    return component(
      'storage',
      detected,
      'below',
      `${requirementStatusAdjective} minimum: ${minimumRequirements.storageGb} GB free space.`,
    );
  }

  const storageType = detectStorageKind(`${capacity} ${storageTypeText}`);
  const minimumStorageTypeTier = STORAGE_TYPE_TIERS[minimumRequirements.storageType];

  if (storageType && STORAGE_TYPE_TIERS[storageType] < minimumStorageTypeTier) {
    return component(
      'storage',
      detected,
      'below',
      `${requirementStatusAdjective} minimum storage type: ${minimumRequirements.storageType}.`,
    );
  }

  const meetsRecommendedCapacity = gb >= recommendedRequirements.storageGb;
  const meetsRecommendedType =
    storageType !== null &&
    STORAGE_TYPE_TIERS[storageType] >= STORAGE_TYPE_TIERS[recommendedRequirements.storageType];
  const status: ComponentStatus =
    meetsRecommendedCapacity && meetsRecommendedType ? 'recommended' : 'minimum';

  return component(
    'storage',
    detected,
    status,
    status === 'recommended'
      ? `Meets the ${requirementStatusWord} capacity and ${recommendedRequirements.storageType} recommendation.`
      : `Meets the ${requirementStatusWord} minimum of ${minimumRequirements.storageGb} GB and ${minimumRequirements.storageType}.`,
  );
}

function formatDetectedStorage(capacity: string, storageType: string) {
  if (!capacity) {
    return '';
  }

  if (!storageType || detectStorageKind(capacity)) {
    return capacity;
  }

  return `${capacity} ${storageType}`;
}

function evaluateWindowsVersion(value: string): ComponentCompatibility {
  const detected = value.trim();
  const version = parseWindowsVersion(detected);
  const minimumVersion = parseWindowsVersion(minimumRequirements.operatingSystem);
  const recommendedVersion = parseWindowsVersion(recommendedRequirements.operatingSystem);

  if (!detected || version === null) {
    return component(
      'windowsVersion',
      detected,
      'unknown',
      `Enter ${minimumRequirements.operatingSystem} or ${recommendedRequirements.operatingSystem}.`,
    );
  }

  if (minimumVersion === null || recommendedVersion === null) {
    return component('windowsVersion', detected, 'unknown', 'The Windows requirement is invalid.');
  }

  if (version >= recommendedVersion) {
    return component(
      'windowsVersion',
      detected,
      'recommended',
      `${requirementStatusAdjective} recommended: ${recommendedRequirements.operatingSystem}.`,
    );
  }

  if (version >= minimumVersion) {
    return component(
      'windowsVersion',
      detected,
      'minimum',
      `${requirementStatusAdjective} minimum: ${minimumRequirements.operatingSystem}.`,
    );
  }

  return component(
    'windowsVersion',
    detected,
    'below',
    `${requirementStatusAdjective} minimum: ${minimumRequirements.operatingSystem}.`,
  );
}

function compareTieredComponent({
  key,
  detected,
  match,
  minimumTier,
  recommendedTier,
  minimumDetail,
  recommendedDetail,
}: {
  key: 'cpu' | 'gpu';
  detected: string;
  match: HardwareTierMatch;
  minimumTier: number | null;
  recommendedTier: number | null;
  minimumDetail: string;
  recommendedDetail: string;
}) {
  if (minimumTier === null || recommendedTier === null) {
    return component(key, detected, 'unknown', 'The requirement hardware is not in the tier catalog.');
  }

  if (match.entry.performanceTier >= recommendedTier) {
    return component(key, detected, 'recommended', `${requirementStatusAdjective} recommended: ${recommendedDetail}.`);
  }

  if (match.entry.performanceTier >= minimumTier) {
    return component(key, detected, 'minimum', `${requirementStatusAdjective} minimum: ${minimumDetail}.`);
  }

  return component(key, detected, 'below', `${requirementStatusAdjective} minimum: ${minimumDetail}.`);
}

function component(
  key: CompatibilityComponentKey,
  detected: string,
  status: ComponentStatus,
  detail: string,
): ComponentCompatibility {
  return {
    key,
    label: COMPONENT_LABELS[key],
    detected,
    status,
    statusLabel: STATUS_LABELS[status],
    detail,
  };
}

function getOverallResult(components: ComponentCompatibility[]): CompatibilityResult['overall'] {
  const determiningComponents = components.filter((item) =>
    DETERMINING_COMPONENT_KEYS.includes(item.key),
  );

  if (determiningComponents.some((item) => item.status === 'unknown')) {
    return {
      status: 'unknown',
      title: 'Cannot Determine',
      description:
        "We couldn't confidently identify enough hardware. Please edit the detected specs or upload another screenshot.",
    };
  }

  if (components.some((item) => item.status === 'below')) {
    return {
      status: 'fail',
      title: 'FAIL',
      description: `Your PC does not meet the ${requirementStatusWord} minimum requirements.`,
    };
  }

  const knownComponents = components.filter((item) => item.status !== 'unknown');

  if (knownComponents.every((item) => item.status === 'recommended')) {
    return {
      status: 'recommended',
      title: 'PASS — Recommended',
      description: `Your PC meets or exceeds the ${requirementStatusWord} recommended requirements.`,
    };
  }

  return {
    status: 'minimum',
    title: 'PASS — Minimum',
    description:
      `Your PC meets the ${requirementStatusWord} minimum requirements but some settings may need to be lowered.`,
  };
}

function getMissingInfo(specs: EditableHardwareSpecs) {
  return REQUIRED_RESULT_FIELDS.filter((field) => specs[field.key].trim().length === 0).map(
    (field) => field.label,
  );
}

function getUncertainInfo(detectedSpecs: DetectedHardwareSpecs | null) {
  if (!detectedSpecs) {
    return [];
  }

  return REQUIRED_RESULT_FIELDS.filter((field) => {
    const detectedField = detectedSpecs[field.key];
    return detectedField.displayValue && detectedField.confidence === 'low';
  }).map((field) => `${field.label} needs review`);
}

function requirementTier(
  values: Array<string | undefined>,
  resolve: (value: string) => HardwareTierMatch | null,
) {
  const tiers = values
    .filter((value): value is string => Boolean(value))
    .map((value) => resolve(value)?.entry.performanceTier)
    .filter((tier): tier is number => tier !== undefined);

  if (tiers.length === 0) {
    return null;
  }

  // Requirement alternatives are an OR condition, so the lower calibrated tier is the floor.
  return Math.min(...tiers);
}

function detectStorageKind(value: string) {
  if (/\bNVMe\b/i.test(value)) {
    return 'NVMe SSD';
  }

  if (/\bSSD\b|solid state/i.test(value)) {
    return 'SSD';
  }

  if (/\bHDD\b|hard disk|hard drive/i.test(value)) {
    return 'HDD';
  }

  return null;
}

function parseWindowsVersion(value: string) {
  const match = value.match(/Windows\s*(\d{1,2})/i);

  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

function requirementPair(left: string | undefined, right: string | undefined) {
  return [left, right].filter(Boolean).join(' or ');
}
