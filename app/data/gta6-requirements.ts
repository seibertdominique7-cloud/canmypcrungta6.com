export type StorageType = 'HDD' | 'SSD' | 'NVMe SSD';

export type RequirementStatusType = 'estimated' | 'official';

export interface RequirementStatus {
  type: RequirementStatusType;
  label: string;
  disclaimer: string;
  lastUpdated: string;
}

export interface CpuRequirement {
  intel: string;
  amd: string;
}

export interface GpuRequirement {
  nvidia: string;
  amd: string;
}

export interface RequirementLevel {
  cpu: CpuRequirement;
  gpu: GpuRequirement;
  ramGb: number;
  storageGb: number;
  storageType: StorageType;
  operatingSystem: string;
}

export interface GameRequirementData {
  game: {
    id: string;
    name: string;
    platform: 'PC';
  };
  status: RequirementStatus;
  minimum: RequirementLevel;
  recommended: RequirementLevel;
}

export const gta6Requirements: GameRequirementData = {
  game: {
    id: 'gta-vi',
    name: 'Grand Theft Auto VI',
    platform: 'PC',
  },
  status: {
    type: 'estimated',
    label: 'Estimated PC Requirements',
    disclaimer:
      'Rockstar Games has not published official GTA VI PC requirements. These values are estimates and may change.',
    lastUpdated: '2026-07-17',
  },
  minimum: {
    cpu: {
      intel: 'Intel Core i5-9600K',
      amd: 'AMD Ryzen 5 3600',
    },
    gpu: {
      nvidia: 'NVIDIA GeForce GTX 1660',
      amd: 'AMD Radeon RX 5600 XT',
    },
    ramGb: 16,
    storageGb: 150,
    storageType: 'HDD',
    operatingSystem: 'Windows 10',
  },
  recommended: {
    cpu: {
      intel: 'Intel Core i7-12700K',
      amd: 'AMD Ryzen 7 5800X',
    },
    gpu: {
      nvidia: 'NVIDIA GeForce RTX 3070',
      amd: 'AMD Radeon RX 6700 XT',
    },
    ramGb: 32,
    storageGb: 150,
    storageType: 'NVMe SSD',
    operatingSystem: 'Windows 11',
  },
};

export function getMinimumRequirements() {
  return gta6Requirements.minimum;
}

export function getRecommendedRequirements() {
  return gta6Requirements.recommended;
}

export function getRequirementDisclaimer() {
  return gta6Requirements.status.disclaimer;
}

export function getRequirementLastUpdated() {
  return gta6Requirements.status.lastUpdated;
}

export function getRequirementLabel() {
  return gta6Requirements.status.label;
}

export function getRequirementStatusAdjective() {
  return gta6Requirements.status.type === 'official' ? 'Official' : 'Estimated';
}
