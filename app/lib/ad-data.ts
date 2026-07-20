import 'server-only';

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';

import {
  DEFAULT_AD_PLACEMENTS,
  getAdPlacementDefinition,
  type AdPlacementCode,
} from '../data/ad-placements';
import { AdminDataError } from './admin-data-error';
import { adSlots, adsDebugEnabled, adsEnabled, adsenseClient } from './ad-config';
import {
  AD_DEVICE_TARGETS,
  AD_FORMATS,
  AD_PROVIDERS,
  type AdAdminSummary,
  type AdAdminWorkspace,
  type AdDeviceTarget,
  type AdFormat,
  type AdGlobalSettingsRecord,
  type AdPlacementRecord,
  type AdProvider,
  type PublicAdConfiguration,
  type PublicAdPlacementConfiguration,
} from './ad-types';
import {
  isValidAdsenseClient,
  isValidAdsenseSlot,
  type AdGlobalSettingsInput,
  type AdPlacementInput,
} from './ad-validation';
import { prisma } from './prisma';

const GLOBAL_SETTINGS_ID = 'global';
const AD_CONFIGURATION_TAG = 'public-ad-configuration';

export async function getAdminAdWorkspace(): Promise<AdAdminWorkspace> {
  await ensureAdRecords();
  const [global, placements] = await Promise.all([
    prisma.adGlobalSettings.findUniqueOrThrow({ where: { id: GLOBAL_SETTINGS_ID } }),
    prisma.adPlacement.findMany({ orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }] }),
  ]);
  const mappedGlobal = mapGlobalSettings(global);

  return {
    global: mappedGlobal,
    placements: placements.map((placement) => mapAdminPlacement(mappedGlobal, placement)),
    environmentFallback: {
      clientConfigured: isValidAdsenseClient(adsenseClient),
      slotsConfigured: Object.fromEntries(
        DEFAULT_AD_PLACEMENTS.map(({ code }) => [code, isValidAdsenseSlot(adSlots[code])]),
      ) as Record<AdPlacementCode, boolean>,
    },
  };
}

export async function getAdminAdSummary(): Promise<AdAdminSummary> {
  const workspace = await getAdminAdWorkspace();
  return {
    masterEnabled: workspace.global.masterEnabled,
    enabledPlacements: workspace.placements.filter((placement) => placement.enabled).length,
    totalPlacements: workspace.placements.length,
    validAdsensePlacements: workspace.placements.filter(
      (placement) => placement.provider === 'google-adsense' && placement.validationStatus === 'valid',
    ).length,
    incompletePlacements: workspace.placements.filter(
      (placement) =>
        (placement.enabled || placement.provider !== 'disabled') &&
        (placement.validationStatus === 'invalid' || placement.validationStatus === 'unavailable'),
    ).length,
  };
}

export async function saveAdGlobalSettings(input: AdGlobalSettingsInput) {
  const placements = await prisma.adPlacement.findMany();
  if (input.masterEnabled) {
    for (const placement of placements.filter((item) => item.enabled)) {
      assertPlacementCanActivate(input, placementInputFromDatabase(placement));
    }
  }

  await prisma.adGlobalSettings.update({
    where: { id: GLOBAL_SETTINGS_ID },
    data: input,
  });
  invalidateAdConfiguration();
}

export async function saveAdPlacement(code: AdPlacementCode, input: AdPlacementInput) {
  if (input.code !== code) throw new AdminDataError('Placement codes cannot be changed.', 400);
  const global = await prisma.adGlobalSettings.findUniqueOrThrow({ where: { id: GLOBAL_SETTINGS_ID } });
  const mappedGlobal = mapGlobalSettings(global);

  if (input.enabled) assertPlacementCanActivate(mappedGlobal, input);

  await prisma.adPlacement.update({
    where: { code },
    data: {
      enabled: input.enabled,
      provider: input.provider,
      useGlobalClient: input.useGlobalClient,
      adClientOverride: input.adClientOverride,
      adSlot: input.adSlot,
      format: input.format,
      responsive: input.responsive,
      deviceTarget: code === 'article-sidebar' ? 'desktop' : input.deviceTarget,
      label: input.label,
      customHtml: input.customHtml,
      customHtmlTrusted: input.customHtmlTrusted,
    },
  });
  invalidateAdConfiguration();
}

export async function resetAdPlacement(code: AdPlacementCode) {
  const definition = getAdPlacementDefinition(code);
  await prisma.adPlacement.update({
    where: { code },
    data: {
      enabled: false,
      provider: 'disabled',
      useGlobalClient: true,
      adClientOverride: '',
      adSlot: '',
      format: definition.defaultFormat,
      responsive: true,
      deviceTarget: definition.defaultDeviceTarget,
      label: '',
      customHtml: '',
      customHtmlTrusted: false,
    },
  });
  invalidateAdConfiguration();
}

export const getPublicAdConfiguration = unstable_cache(
  queryPublicAdConfiguration,
  ['public-ad-configuration-v1'],
  { tags: [AD_CONFIGURATION_TAG], revalidate: 60 },
);

async function queryPublicAdConfiguration(): Promise<PublicAdConfiguration> {
  const [databaseGlobal, databasePlacements] = await Promise.all([
    prisma.adGlobalSettings.findUnique({ where: { id: GLOBAL_SETTINGS_ID } }),
    prisma.adPlacement.findMany(),
  ]);
  const global = databaseGlobal ? mapGlobalSettings(databaseGlobal) : environmentGlobalFallback();
  const databaseMap = new Map(databasePlacements.map((placement) => [placement.code, placement]));
  const placementEntries = DEFAULT_AD_PLACEMENTS.map((definition) => {
    const databasePlacement = databaseMap.get(definition.code);
    const provider = databasePlacement
      ? asProvider(databasePlacement.provider)
      : adsEnabled && adSlots[definition.code]
        ? 'google-adsense'
        : 'disabled';
    const enabled = databasePlacement?.enabled ?? (adsEnabled && provider === 'google-adsense');
    const useGlobalClient = databasePlacement?.useGlobalClient ?? true;
    const client = useGlobalClient
      ? global.adsenseClient || adsenseClient
      : databasePlacement?.adClientOverride.trim() ?? '';
    const slot = databasePlacement?.adSlot.trim() || adSlots[definition.code];
    const format = databasePlacement
      ? asFormat(databasePlacement.format)
      : definition.defaultFormat;
    const deviceTarget = definition.code === 'article-sidebar'
      ? 'desktop'
      : databasePlacement
        ? asDeviceTarget(databasePlacement.deviceTarget)
        : definition.defaultDeviceTarget;
    const valid =
      provider === 'google-adsense' &&
      isValidAdsenseClient(client) &&
      isValidAdsenseSlot(slot);
    const publicPlacement: PublicAdPlacementConfiguration = {
      code: definition.code,
      displayName: definition.displayName,
      enabled: global.masterEnabled && enabled && valid,
      provider,
      client,
      slot,
      format,
      responsive: databasePlacement?.responsive ?? global.defaultResponsive,
      deviceTarget,
      label: databasePlacement?.label.trim() || global.defaultLabel,
      valid,
    };
    return [definition.code, publicPlacement] as const;
  });
  const placements = Object.fromEntries(placementEntries) as PublicAdConfiguration['placements'];
  const firstEnabledAdsense = DEFAULT_AD_PLACEMENTS
    .map(({ code }) => placements[code])
    .find((placement) => placement.enabled && placement.valid);

  return {
    masterEnabled: global.masterEnabled,
    debugPlaceholders:
      process.env.NODE_ENV !== 'production' && global.debugPlaceholders,
    defaultLabel: global.defaultLabel,
    defaultResponsive: global.defaultResponsive,
    scriptClient: firstEnabledAdsense?.client ?? null,
    placements,
  };
}

async function ensureAdRecords() {
  await prisma.adGlobalSettings.upsert({
    where: { id: GLOBAL_SETTINGS_ID },
    update: {},
    create: {
      id: GLOBAL_SETTINGS_ID,
      masterEnabled: false,
      defaultProvider: 'disabled',
      adsenseClient: '',
      debugPlaceholders: false,
      defaultLabel: 'Advertisement',
      defaultResponsive: true,
    },
  });

  await Promise.all(
    DEFAULT_AD_PLACEMENTS.map((definition) =>
      prisma.adPlacement.upsert({
        where: { code: definition.code },
        update: {
          displayName: definition.displayName,
          description: definition.description,
          displayOrder: definition.displayOrder,
        },
        create: {
          id: `ad-${definition.code}`,
          code: definition.code,
          displayName: definition.displayName,
          description: definition.description,
          enabled: false,
          provider: 'disabled',
          useGlobalClient: true,
          adClientOverride: '',
          adSlot: '',
          format: definition.defaultFormat,
          responsive: true,
          deviceTarget: definition.defaultDeviceTarget,
          label: '',
          displayOrder: definition.displayOrder,
          customHtml: '',
          customHtmlTrusted: false,
        },
      }),
    ),
  );
}

function mapGlobalSettings(global: {
  id: string;
  masterEnabled: boolean;
  defaultProvider: string;
  adsenseClient: string;
  debugPlaceholders: boolean;
  defaultLabel: string;
  defaultResponsive: boolean;
  updatedAt: Date;
}): AdGlobalSettingsRecord {
  return {
    ...global,
    defaultProvider: asProvider(global.defaultProvider),
    updatedAt: global.updatedAt.toISOString(),
  };
}

function mapAdminPlacement(
  global: AdGlobalSettingsRecord,
  placement: {
    id: string;
    code: string;
    displayName: string;
    description: string;
    enabled: boolean;
    provider: string;
    useGlobalClient: boolean;
    adClientOverride: string;
    adSlot: string;
    format: string;
    responsive: boolean;
    deviceTarget: string;
    label: string;
    displayOrder: number;
    customHtml: string;
    customHtmlTrusted: boolean;
    updatedAt: Date;
  },
): AdPlacementRecord {
  const code = placement.code as AdPlacementCode;
  const provider = asProvider(placement.provider);
  const effectiveClient = placement.useGlobalClient
    ? global.adsenseClient || adsenseClient
    : placement.adClientOverride;
  const effectiveSlot = placement.adSlot || adSlots[code];
  const validation = getPlacementValidation(provider, effectiveClient, effectiveSlot);

  return {
    ...placement,
    code,
    provider,
    format: asFormat(placement.format),
    deviceTarget: code === 'article-sidebar' ? 'desktop' : asDeviceTarget(placement.deviceTarget),
    updatedAt: placement.updatedAt.toISOString(),
    validationStatus: validation.status,
    validationMessage: validation.message,
  };
}

function getPlacementValidation(provider: AdProvider, client: string, slot: string) {
  if (provider === 'disabled') {
    return { status: 'disabled' as const, message: 'No provider selected.' };
  }
  if (provider === 'custom-html') {
    return {
      status: 'unavailable' as const,
      message: 'Stored safely, but public custom HTML rendering is not available.',
    };
  }
  if (!isValidAdsenseClient(client)) {
    return { status: 'invalid' as const, message: 'A valid AdSense client ID is required.' };
  }
  if (!isValidAdsenseSlot(slot)) {
    return { status: 'invalid' as const, message: 'A numeric AdSense slot ID is required.' };
  }
  return { status: 'valid' as const, message: 'Ready for Google AdSense.' };
}

function assertPlacementCanActivate(
  global: Pick<AdGlobalSettingsInput, 'adsenseClient'>,
  placement: AdPlacementInput,
) {
  if (placement.provider === 'custom-html') {
    throw new AdminDataError(
      'Custom HTML rendering is not available yet. Keep this placement disabled.',
      400,
    );
  }
  if (placement.provider !== 'google-adsense') {
    throw new AdminDataError('Choose Google AdSense before enabling this placement.', 400);
  }
  const client = placement.useGlobalClient
    ? global.adsenseClient || adsenseClient
    : placement.adClientOverride;
  const slot = placement.adSlot || adSlots[placement.code];
  if (!isValidAdsenseClient(client)) {
    throw new AdminDataError('A valid AdSense client ID is required before enabling this placement.', 400);
  }
  if (!isValidAdsenseSlot(slot)) {
    throw new AdminDataError('A numeric AdSense slot ID is required before enabling this placement.', 400);
  }
}

function placementInputFromDatabase(placement: {
  code: string;
  enabled: boolean;
  provider: string;
  useGlobalClient: boolean;
  adClientOverride: string;
  adSlot: string;
  format: string;
  responsive: boolean;
  deviceTarget: string;
  label: string;
  customHtml: string;
  customHtmlTrusted: boolean;
}): AdPlacementInput {
  return {
    ...placement,
    code: placement.code as AdPlacementCode,
    provider: asProvider(placement.provider),
    format: asFormat(placement.format),
    deviceTarget: asDeviceTarget(placement.deviceTarget),
  };
}

function environmentGlobalFallback(): AdGlobalSettingsRecord {
  return {
    id: GLOBAL_SETTINGS_ID,
    masterEnabled: adsEnabled,
    defaultProvider: adsEnabled ? 'google-adsense' : 'disabled',
    adsenseClient,
    debugPlaceholders: adsDebugEnabled,
    defaultLabel: 'Advertisement',
    defaultResponsive: true,
    updatedAt: new Date(0).toISOString(),
  };
}

function asProvider(value: string): AdProvider {
  return AD_PROVIDERS.includes(value as AdProvider) ? value as AdProvider : 'disabled';
}

function asFormat(value: string): AdFormat {
  return AD_FORMATS.includes(value as AdFormat) ? value as AdFormat : 'auto';
}

function asDeviceTarget(value: string): AdDeviceTarget {
  return AD_DEVICE_TARGETS.includes(value as AdDeviceTarget) ? value as AdDeviceTarget : 'both';
}

function invalidateAdConfiguration() {
  revalidateTag(AD_CONFIGURATION_TAG, { expire: 0 });
  revalidatePath('/', 'layout');
}
