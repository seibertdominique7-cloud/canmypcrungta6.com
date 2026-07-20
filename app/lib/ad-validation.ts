import { isAdPlacementCode, type AdPlacementCode } from '../data/ad-placements';
import {
  AD_DEVICE_TARGETS,
  AD_FORMATS,
  AD_PROVIDERS,
  type AdDeviceTarget,
  type AdFormat,
  type AdProvider,
} from './ad-types';

export interface AdGlobalSettingsInput {
  masterEnabled: boolean;
  defaultProvider: AdProvider;
  adsenseClient: string;
  debugPlaceholders: boolean;
  defaultLabel: string;
  defaultResponsive: boolean;
}

export interface AdPlacementInput {
  code: AdPlacementCode;
  enabled: boolean;
  provider: AdProvider;
  useGlobalClient: boolean;
  adClientOverride: string;
  adSlot: string;
  format: AdFormat;
  responsive: boolean;
  deviceTarget: AdDeviceTarget;
  label: string;
  customHtml: string;
  customHtmlTrusted: boolean;
}

export interface AdValidationResult<T> {
  data: T | null;
  fieldErrors: Record<string, string>;
}

export function isValidAdsenseClient(value: string) {
  return /^ca-pub-\d{16}$/.test(value.trim());
}

export function isValidAdsenseSlot(value: string) {
  return /^\d+$/.test(value.trim());
}

export function validateAdGlobalSettings(value: unknown): AdValidationResult<AdGlobalSettingsInput> {
  const record = asRecord(value);
  const data: AdGlobalSettingsInput = {
    masterEnabled: readBoolean(record.masterEnabled),
    defaultProvider: readOption(record.defaultProvider, AD_PROVIDERS, 'disabled'),
    adsenseClient: readString(record.adsenseClient).trim(),
    debugPlaceholders: readBoolean(record.debugPlaceholders),
    defaultLabel: readString(record.defaultLabel).trim() || 'Advertisement',
    defaultResponsive: readBoolean(record.defaultResponsive, true),
  };
  const fieldErrors: Record<string, string> = {};

  if (data.adsenseClient && !isValidAdsenseClient(data.adsenseClient)) {
    fieldErrors.adsenseClient = 'Use a Google publisher ID such as ca-pub-1234567890123456.';
  }
  if (data.defaultLabel.length > 80) {
    fieldErrors.defaultLabel = 'The default label must be 80 characters or fewer.';
  }

  return { data: Object.keys(fieldErrors).length ? null : data, fieldErrors };
}

export function validateAdPlacement(value: unknown): AdValidationResult<AdPlacementInput> {
  const record = asRecord(value);
  const code = readString(record.code);
  const fieldErrors: Record<string, string> = {};

  if (!isAdPlacementCode(code)) {
    fieldErrors.code = 'This is not a supported ad placement.';
  }

  const data: AdPlacementInput = {
    code: isAdPlacementCode(code) ? code : 'homepage',
    enabled: readBoolean(record.enabled),
    provider: readOption(record.provider, AD_PROVIDERS, 'disabled'),
    useGlobalClient: readBoolean(record.useGlobalClient, true),
    adClientOverride: readString(record.adClientOverride).trim(),
    adSlot: readString(record.adSlot).trim(),
    format: readOption(record.format, AD_FORMATS, 'auto'),
    responsive: readBoolean(record.responsive, true),
    deviceTarget: readOption(record.deviceTarget, AD_DEVICE_TARGETS, 'both'),
    label: readString(record.label).trim(),
    customHtml: readString(record.customHtml),
    customHtmlTrusted: readBoolean(record.customHtmlTrusted),
  };

  if (data.code === 'article-sidebar' && data.deviceTarget !== 'desktop') {
    fieldErrors.deviceTarget = 'The article sidebar is desktop-only.';
  }
  if (data.adClientOverride && !isValidAdsenseClient(data.adClientOverride)) {
    fieldErrors.adClientOverride = 'Use a Google publisher ID such as ca-pub-1234567890123456.';
  }
  if (data.adSlot && !isValidAdsenseSlot(data.adSlot)) {
    fieldErrors.adSlot = 'AdSense slot IDs may contain digits only.';
  }
  if (data.label.length > 80) {
    fieldErrors.label = 'The advertisement label must be 80 characters or fewer.';
  }
  if (data.customHtml.length > 20_000) {
    fieldErrors.customHtml = 'Custom HTML must be 20,000 characters or fewer.';
  }
  if (data.customHtml && !data.customHtmlTrusted) {
    fieldErrors.customHtmlTrusted = 'Confirm that you trust this custom code before saving it.';
  }
  if (data.enabled && data.provider === 'disabled') {
    fieldErrors.provider = 'Choose a supported provider before enabling this placement.';
  }
  if (data.enabled && data.provider === 'custom-html') {
    fieldErrors.provider = 'Custom HTML rendering is not available yet. Keep this placement disabled.';
  }

  return { data: Object.keys(fieldErrors).length ? null : data, fieldErrors };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function readOption<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === 'string' && options.includes(value as T) ? value as T : fallback;
}
