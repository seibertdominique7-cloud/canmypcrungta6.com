import type { AdPlacementCode } from '../data/ad-placements';

export const AD_PROVIDERS = ['disabled', 'google-adsense', 'custom-html'] as const;
export const AD_FORMATS = ['auto', 'horizontal', 'rectangle', 'vertical', 'fluid'] as const;
export const AD_DEVICE_TARGETS = ['both', 'desktop', 'mobile'] as const;

export type AdProvider = (typeof AD_PROVIDERS)[number];
export type AdFormat = (typeof AD_FORMATS)[number];
export type AdDeviceTarget = (typeof AD_DEVICE_TARGETS)[number];

export interface AdGlobalSettingsRecord {
  id: string;
  masterEnabled: boolean;
  defaultProvider: AdProvider;
  adsenseClient: string;
  debugPlaceholders: boolean;
  defaultLabel: string;
  defaultResponsive: boolean;
  updatedAt: string;
}

export interface AdPlacementRecord {
  id: string;
  code: AdPlacementCode;
  displayName: string;
  description: string;
  enabled: boolean;
  provider: AdProvider;
  useGlobalClient: boolean;
  adClientOverride: string;
  adSlot: string;
  format: AdFormat;
  responsive: boolean;
  deviceTarget: AdDeviceTarget;
  label: string;
  displayOrder: number;
  customHtml: string;
  customHtmlTrusted: boolean;
  updatedAt: string;
  validationStatus: 'disabled' | 'valid' | 'invalid' | 'unavailable';
  validationMessage: string;
}

export interface AdAdminWorkspace {
  global: AdGlobalSettingsRecord;
  placements: AdPlacementRecord[];
  environmentFallback: {
    clientConfigured: boolean;
    slotsConfigured: Record<AdPlacementCode, boolean>;
  };
}

export interface AdAdminSummary {
  masterEnabled: boolean;
  enabledPlacements: number;
  totalPlacements: number;
  validAdsensePlacements: number;
  incompletePlacements: number;
}

export interface PublicAdPlacementConfiguration {
  code: AdPlacementCode;
  displayName: string;
  enabled: boolean;
  provider: AdProvider;
  client: string;
  slot: string;
  format: AdFormat;
  responsive: boolean;
  deviceTarget: AdDeviceTarget;
  label: string;
  valid: boolean;
}

export interface PublicAdConfiguration {
  masterEnabled: boolean;
  debugPlaceholders: boolean;
  defaultLabel: string;
  defaultResponsive: boolean;
  scriptClient: string | null;
  placements: Record<AdPlacementCode, PublicAdPlacementConfiguration>;
}
