import { gtaViRequirements, type RequirementProfile } from './gta6-requirements';
import {
  type DetectedHardwareSpecs,
  type EditableHardwareSpecs,
  type HardwareFieldKey,
} from './hardware-types';

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

interface HardwareRank {
  vendor: 'intel' | 'amd' | 'nvidia';
  score: number;
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

const MINIMUM_CPU_RANKS = {
  intel: rankCpu(gtaViRequirements.minimum.cpu.intel ?? ''),
  amd: rankCpu(gtaViRequirements.minimum.cpu.amd ?? ''),
};

const RECOMMENDED_CPU_RANKS = {
  intel: rankCpu(gtaViRequirements.recommended.cpu.intel ?? ''),
  amd: rankCpu(gtaViRequirements.recommended.cpu.amd ?? ''),
};

const MINIMUM_GPU_RANKS = {
  nvidia: rankGpu(gtaViRequirements.minimum.gpu.nvidia ?? ''),
  amd: rankGpu(gtaViRequirements.minimum.gpu.amd ?? ''),
};

const RECOMMENDED_GPU_RANKS = {
  nvidia: rankGpu(gtaViRequirements.recommended.gpu.nvidia ?? ''),
  amd: rankGpu(gtaViRequirements.recommended.gpu.amd ?? ''),
};

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
  const rank = rankCpu(detected);

  if (!detected || !rank) {
    return component('cpu', detected, 'unknown', 'Enter an Intel Core i-series or AMD Ryzen desktop CPU.');
  }

  return compareRankedComponent({
    key: 'cpu',
    detected,
    rank,
    minimumRanks: MINIMUM_CPU_RANKS,
    recommendedRanks: RECOMMENDED_CPU_RANKS,
    minimumDetail: requirementPair(gtaViRequirements.minimum.cpu.intel, gtaViRequirements.minimum.cpu.amd),
    recommendedDetail: requirementPair(
      gtaViRequirements.recommended.cpu.intel,
      gtaViRequirements.recommended.cpu.amd,
    ),
  });
}

function evaluateGpu(value: string): ComponentCompatibility {
  const detected = value.trim();
  const rank = rankGpu(detected);

  if (!detected) {
    return component('gpu', detected, 'unknown', 'Enter an NVIDIA GeForce/RTX/GTX or AMD Radeon RX GPU.');
  }

  if (!rank) {
    if (looksLikeIntegratedGraphics(detected)) {
      return component('gpu', detected, 'below', 'Integrated graphics are below the estimated minimum.');
    }

    return component('gpu', detected, 'unknown', 'GPU model could not be ranked from this text.');
  }

  return compareRankedComponent({
    key: 'gpu',
    detected,
    rank,
    minimumRanks: MINIMUM_GPU_RANKS,
    recommendedRanks: RECOMMENDED_GPU_RANKS,
    minimumDetail: requirementPair(gtaViRequirements.minimum.gpu.nvidia, gtaViRequirements.minimum.gpu.amd),
    recommendedDetail: requirementPair(
      gtaViRequirements.recommended.gpu.nvidia,
      gtaViRequirements.recommended.gpu.amd,
    ),
  });
}

function evaluateRam(value: string): ComponentCompatibility {
  const detected = value.trim();
  const gb = parseCapacityGb(detected);

  if (!detected || gb === null) {
    return component('ram', detected, 'unknown', 'Enter RAM capacity in GB.');
  }

  if (gb >= gtaViRequirements.recommended.ramGb) {
    return component('ram', detected, 'recommended', `Estimated recommended: ${gtaViRequirements.recommended.ramGb} GB.`);
  }

  if (gb >= gtaViRequirements.minimum.ramGb) {
    return component('ram', detected, 'minimum', `Estimated minimum: ${gtaViRequirements.minimum.ramGb} GB.`);
  }

  return component('ram', detected, 'below', `Estimated minimum: ${gtaViRequirements.minimum.ramGb} GB.`);
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

  if (gb < gtaViRequirements.minimum.storageGb) {
    return component(
      'storage',
      detected,
      'below',
      `Estimated minimum: ${gtaViRequirements.minimum.storageGb} GB free space.`,
    );
  }

  const storageType = detectStorageKind(`${capacity} ${storageTypeText}`);
  const status: ComponentStatus = storageType === 'nvme' ? 'recommended' : 'minimum';

  return component(
    'storage',
    detected,
    status,
    storageType === 'nvme'
      ? 'Meets the estimated capacity and NVMe recommendation.'
      : 'Meets the estimated capacity requirement.',
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

  if (!detected || version === null) {
    return component('windowsVersion', detected, 'unknown', 'Enter Windows 10 or Windows 11.');
  }

  if (version >= 11) {
    return component('windowsVersion', detected, 'recommended', 'Estimated recommended: Windows 11.');
  }

  if (version >= 10) {
    return component('windowsVersion', detected, 'minimum', 'Estimated minimum: Windows 10.');
  }

  return component('windowsVersion', detected, 'below', 'Estimated minimum: Windows 10.');
}

function compareRankedComponent({
  key,
  detected,
  rank,
  minimumRanks,
  recommendedRanks,
  minimumDetail,
  recommendedDetail,
}: {
  key: 'cpu' | 'gpu';
  detected: string;
  rank: HardwareRank;
  minimumRanks: Partial<Record<HardwareRank['vendor'], HardwareRank | null>>;
  recommendedRanks: Partial<Record<HardwareRank['vendor'], HardwareRank | null>>;
  minimumDetail: string;
  recommendedDetail: string;
}) {
  const minimumRank = minimumRanks[rank.vendor];
  const recommendedRank = recommendedRanks[rank.vendor];

  if (!minimumRank || !recommendedRank) {
    return component(key, detected, 'unknown', 'This hardware family is not in the current requirement data.');
  }

  if (rank.score >= recommendedRank.score) {
    return component(key, detected, 'recommended', `Estimated recommended: ${recommendedDetail}.`);
  }

  if (rank.score >= minimumRank.score) {
    return component(key, detected, 'minimum', `Estimated minimum: ${minimumDetail}.`);
  }

  return component(key, detected, 'below', `Estimated minimum: ${minimumDetail}.`);
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
      description: 'Your PC does not meet the estimated minimum requirements.',
    };
  }

  const knownComponents = components.filter((item) => item.status !== 'unknown');

  if (knownComponents.every((item) => item.status === 'recommended')) {
    return {
      status: 'recommended',
      title: 'PASS — Recommended',
      description: 'Your PC meets or exceeds the estimated recommended requirements.',
    };
  }

  return {
    status: 'minimum',
    title: 'PASS — Minimum',
    description:
      'Your PC meets the estimated minimum requirements but some settings may need to be lowered.',
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

function rankCpu(value: string): HardwareRank | null {
  const normalized = normalizeHardwareText(value);
  const intel = normalized.match(/\bi\s*([3579])\s*[- ]?\s*(\d{4,5})([a-z]{0,4})\b/i);

  if (intel) {
    const tier = Number.parseInt(intel[1], 10);
    const model = Number.parseInt(intel[2], 10);

    return {
      vendor: 'intel',
      score: getIntelGeneration(model) * 100 + tier * 10 + getCpuSuffixBonus(intel[3]),
    };
  }

  const amd = normalized.match(/\bRyzen\s*([3579])\s+(\d{4,5})([a-z0-9]{0,4})\b/i);

  if (amd) {
    const tier = Number.parseInt(amd[1], 10);
    const model = Number.parseInt(amd[2], 10);

    return {
      vendor: 'amd',
      score: Math.floor(model / 1000) * 100 + tier * 10 + getCpuSuffixBonus(amd[3]),
    };
  }

  return null;
}

function rankGpu(value: string): HardwareRank | null {
  const normalized = normalizeHardwareText(value);
  const nvidia = normalized.match(/\b(RTX|GTX)\s*(\d{3,4})\s*(Ti|SUPER)?\b/i);

  if (nvidia) {
    const model = Number.parseInt(nvidia[2], 10);
    const modifier = nvidia[3] ? 50 : 0;

    return {
      vendor: 'nvidia',
      score: model + modifier,
    };
  }

  const amd = normalized.match(/\bRX\s*(\d{4})\s*(XT)?\b/i);

  if (amd) {
    const model = Number.parseInt(amd[1], 10);
    const modifier = amd[2] ? 50 : 0;

    return {
      vendor: 'amd',
      score: model + modifier,
    };
  }

  return null;
}

function normalizeHardwareText(value: string) {
  return value
    .replace(/\(R\)|\(TM\)/gi, '')
    .replace(/\bIntel\s+Core\s+/gi, 'Intel ')
    .replace(/\bNVIDIA\s+GeForce\s+/gi, 'NVIDIA ')
    .replace(/\bAMD\s+Radeon\s+/gi, 'AMD ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getIntelGeneration(model: number) {
  if (model >= 10000) {
    return Math.floor(model / 1000);
  }

  return Math.floor(model / 1000);
}

function getCpuSuffixBonus(suffix: string | undefined) {
  if (!suffix) {
    return 0;
  }

  if (/x|k/i.test(suffix)) {
    return 5;
  }

  return 0;
}

function parseCapacityGb(value: string) {
  const match = value.match(/(\d+(?:[.,]\d+)?)\s*(TB|GB|MB)\b/i);

  if (!match) {
    return null;
  }

  const amount = Number.parseFloat(match[1].replace(',', '.'));
  const unit = match[2].toUpperCase();

  if (!Number.isFinite(amount)) {
    return null;
  }

  if (unit === 'TB') {
    return amount * 1024;
  }

  if (unit === 'MB') {
    return amount / 1024;
  }

  return amount;
}

function detectStorageKind(value: string) {
  if (/\bNVMe\b/i.test(value)) {
    return 'nvme';
  }

  if (/\bSSD\b|solid state/i.test(value)) {
    return 'ssd';
  }

  if (/\bHDD\b|hard disk|hard drive/i.test(value)) {
    return 'hdd';
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

function looksLikeIntegratedGraphics(value: string) {
  return /\b(Intel|Iris|UHD|HD Graphics|Vega|Radeon(?:\s+\d{3,4}[A-Z]?)?\s+Graphics|integrated)\b/i.test(
    value,
  );
}

function requirementPair(left: string | undefined, right: string | undefined) {
  return [left, right].filter(Boolean).join(' or ');
}

export function getRequirementSummary(profile: RequirementProfile) {
  return {
    cpu: requirementPair(profile.cpu.intel, profile.cpu.amd),
    gpu: requirementPair(profile.gpu.nvidia, profile.gpu.amd),
    ram: `${profile.ramGb} GB`,
    storage: `${profile.storageGb} GB`,
    storageType: profile.storageType === 'nvme' ? 'NVMe SSD' : 'HDD allowed',
    os: profile.os,
  };
}
