export interface RequirementOption {
  intel?: string;
  amd?: string;
  nvidia?: string;
}

export interface RequirementProfile {
  label: string;
  cpu: RequirementOption;
  gpu: RequirementOption;
  ramGb: number;
  storageGb: number;
  storageType: 'hdd' | 'nvme';
  os: 'Windows 10' | 'Windows 11';
}

export interface GtaViRequirements {
  minimum: RequirementProfile;
  recommended: RequirementProfile;
}

export const gtaViRequirements: GtaViRequirements = {
  minimum: {
    label: 'Minimum',
    cpu: {
      intel: 'Intel Core i5-9600K',
      amd: 'AMD Ryzen 5 3600',
    },
    gpu: {
      nvidia: 'NVIDIA GTX 1660',
      amd: 'AMD RX 5600 XT',
    },
    ramGb: 16,
    storageGb: 150,
    storageType: 'hdd',
    os: 'Windows 10',
  },
  recommended: {
    label: 'Recommended',
    cpu: {
      intel: 'Intel Core i7-12700K',
      amd: 'AMD Ryzen 7 5800X',
    },
    gpu: {
      nvidia: 'NVIDIA RTX 3070',
      amd: 'AMD RX 6700 XT',
    },
    ramGb: 32,
    storageGb: 150,
    storageType: 'nvme',
    os: 'Windows 11',
  },
};
