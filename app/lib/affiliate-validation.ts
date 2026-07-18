import {
  AFFILIATE_BADGES,
  AFFILIATE_COMPONENT_TYPES,
  AFFILIATE_RETAILERS,
  GAME_PURCHASE_PLATFORMS,
  GAME_RELEASE_STATUSES,
  type AffiliateBadge,
  type AffiliateComponentType,
  type AffiliateRetailer,
  type GamePurchasePlatform,
  type GameReleaseStatus,
  type RecommendationSectionLayout,
  type RecommendationSectionPurpose,
} from './affiliate-types';
import {
  RECOMMENDATION_SECTION_LAYOUTS,
  RECOMMENDATION_SECTION_PURPOSES,
} from '../data/recommendation-sections';

export interface ScenarioInput {
  code: string;
  displayName: string;
  resultHeading: string;
  resultDescription: string;
  enabled: boolean;
}

export interface RecommendationSectionInput {
  scenarioId: string;
  title: string;
  description: string;
  enabled: boolean;
  maxProducts: number;
  collapsedByDefault: boolean;
  layout: RecommendationSectionLayout;
  purpose: RecommendationSectionPurpose;
}

export interface AffiliateProductInput {
  title: string;
  retailer: AffiliateRetailer;
  affiliateUrl: string;
  imageUrl: string | null;
  priceText: string;
  badge: AffiliateBadge;
  shortDescription: string;
  buttonText: string;
  componentType: AffiliateComponentType;
  platform: GamePurchasePlatform | null;
  enabled: boolean;
  sectionId: string;
}

export interface GamePurchaseLinkInput {
  enabled: boolean;
  title: string;
  description: string;
  platform: GamePurchasePlatform;
  retailer: AffiliateRetailer;
  affiliateUrl: string;
  buttonText: string;
  imageUrl: string | null;
  releaseStatus: GameReleaseStatus;
}

export interface ValidationResult<T> {
  data: T | null;
  errors: string[];
  warnings: string[];
}

export function validateScenarioInput(value: unknown): ValidationResult<ScenarioInput> {
  const input = asRecord(value);
  const errors: string[] = [];
  const code = sanitizeText(readString(input, 'code'), 64).toUpperCase();
  const displayName = requiredText(input, 'displayName', 'Display name', 100, errors);
  const resultHeading = requiredText(input, 'resultHeading', 'Result heading', 140, errors);
  const resultDescription = requiredText(
    input,
    'resultDescription',
    'Result description',
    500,
    errors,
  );

  if (!/^[A-Z][A-Z0-9_]{2,63}$/.test(code)) {
    errors.push('Code must use 3–64 uppercase letters, numbers, or underscores.');
  }

  return {
    data:
      errors.length === 0
        ? {
            code,
            displayName,
            resultHeading,
            resultDescription,
            enabled: readBoolean(input, 'enabled', true),
          }
        : null,
    errors,
    warnings: [],
  };
}

export function validateRecommendationSectionInput(
  value: unknown,
): ValidationResult<RecommendationSectionInput> {
  const input = asRecord(value);
  const errors: string[] = [];
  const scenarioId = requiredText(input, 'scenarioId', 'Scenario', 100, errors);
  const title = requiredText(input, 'title', 'Section title', 140, errors);
  const description = requiredText(input, 'description', 'Section description', 500, errors);
  const layout = readString(input, 'layout');
  const purpose = readString(input, 'purpose');
  const maxProducts = readInteger(input, 'maxProducts', 3);

  if (!RECOMMENDATION_SECTION_LAYOUTS.includes(layout as RecommendationSectionLayout)) {
    errors.push('Choose a valid section layout.');
  }

  if (!RECOMMENDATION_SECTION_PURPOSES.includes(purpose as RecommendationSectionPurpose)) {
    errors.push('Choose a valid section type.');
  }

  if (maxProducts < 1 || maxProducts > 12) {
    errors.push('Maximum products must be between 1 and 12.');
  }

  return {
    data:
      errors.length === 0
        ? {
            scenarioId,
            title,
            description,
            enabled: readBoolean(input, 'enabled', true),
            maxProducts,
            collapsedByDefault: readBoolean(input, 'collapsedByDefault', false),
            layout: layout as RecommendationSectionLayout,
            purpose: purpose as RecommendationSectionPurpose,
          }
        : null,
    errors,
    warnings: [],
  };
}

export function validateAffiliateLinkInput(
  value: unknown,
): ValidationResult<AffiliateProductInput> {
  const input = asRecord(value);
  const errors: string[] = [];
  const warnings: string[] = [];
  const title = requiredText(input, 'title', 'Title', 140, errors);
  const retailer = readString(input, 'retailer');
  const affiliateUrl = readString(input, 'affiliateUrl');
  const imageUrlValue = readString(input, 'imageUrl');
  const priceText = requiredText(input, 'priceText', 'Price text', 80, errors);
  const badge = readString(input, 'badge');
  const shortDescription = requiredText(
    input,
    'shortDescription',
    'Short description',
    500,
    errors,
  );
  const buttonText = requiredText(input, 'buttonText', 'Button text', 60, errors);
  const componentType = readString(input, 'componentType');
  const sectionId = requiredText(input, 'sectionId', 'Section', 100, errors);
  const platformValue = readString(input, 'platform');
  const urlInspection = inspectAffiliateUrl(affiliateUrl, retailer);

  errors.push(...urlInspection.errors);
  warnings.push(...urlInspection.warnings);

  if (!AFFILIATE_RETAILERS.includes(retailer as AffiliateRetailer)) {
    errors.push('Choose a valid retailer.');
  }

  if (!AFFILIATE_BADGES.includes(badge as AffiliateBadge)) {
    errors.push('Choose a valid badge.');
  }

  if (!AFFILIATE_COMPONENT_TYPES.includes(componentType as AffiliateComponentType)) {
    errors.push('Choose a valid component type.');
  }

  if (
    platformValue &&
    !GAME_PURCHASE_PLATFORMS.includes(platformValue as GamePurchasePlatform)
  ) {
    errors.push('Choose a valid platform.');
  }

  if (imageUrlValue) {
    const imageInspection = inspectHttpsUrl(imageUrlValue, 'Image URL');
    errors.push(...imageInspection.errors);
  }

  return {
    data:
      errors.length === 0
        ? {
            title,
            retailer: retailer as AffiliateRetailer,
            affiliateUrl,
            imageUrl: imageUrlValue || null,
            priceText,
            badge: badge as AffiliateBadge,
            shortDescription,
            buttonText,
            componentType: componentType as AffiliateComponentType,
            platform: platformValue
              ? (platformValue as GamePurchasePlatform)
              : null,
            enabled: readBoolean(input, 'enabled', true),
            sectionId,
          }
        : null,
    errors,
    warnings,
  };
}

export function inspectAffiliateUrl(value: string, retailer = '') {
  const inspection = inspectHttpsUrl(value, 'Affiliate URL');
  const warnings: string[] = [];

  if (
    inspection.domain &&
    (retailer === 'Amazon' || /(^|\.)amazon\.[a-z.]+$/i.test(inspection.domain))
  ) {
    try {
      const parsed = new URL(value);

      if (!parsed.searchParams.get('tag')) {
        warnings.push('Amazon URL does not appear to contain an affiliate tag.');
      }
    } catch {
      // The URL error is already returned by inspectHttpsUrl.
    }
  }

  return { ...inspection, warnings };
}

export function validateGamePurchaseLinkInput(
  value: unknown,
): ValidationResult<GamePurchaseLinkInput> {
  const input = asRecord(value);
  const errors: string[] = [];
  const warnings: string[] = [];
  const title = requiredText(input, 'title', 'Title', 140, errors);
  const description = requiredText(input, 'description', 'Description', 500, errors);
  const platform = readString(input, 'platform');
  const retailer = readString(input, 'retailer');
  const affiliateUrl = readString(input, 'affiliateUrl');
  const buttonText = requiredText(input, 'buttonText', 'Button text', 60, errors);
  const imageUrlValue = readString(input, 'imageUrl');
  const releaseStatus = readString(input, 'releaseStatus');
  const urlInspection = inspectAffiliateUrl(affiliateUrl, retailer);

  errors.push(...urlInspection.errors);
  warnings.push(...urlInspection.warnings);

  if (!GAME_PURCHASE_PLATFORMS.includes(platform as GamePurchasePlatform)) {
    errors.push('Choose a valid platform.');
  }

  if (!AFFILIATE_RETAILERS.includes(retailer as AffiliateRetailer)) {
    errors.push('Choose a valid retailer.');
  }

  if (!GAME_RELEASE_STATUSES.includes(releaseStatus as GameReleaseStatus)) {
    errors.push('Choose a valid release status.');
  }

  if (imageUrlValue) {
    errors.push(...inspectHttpsUrl(imageUrlValue, 'Image URL').errors);
  }

  if (platform === 'PC') {
    warnings.push(
      'Only enable a PC link after an official PC purchase or preorder listing exists.',
    );
  }

  return {
    data:
      errors.length === 0
        ? {
            enabled: readBoolean(input, 'enabled', false),
            title,
            description,
            platform: platform as GamePurchasePlatform,
            retailer: retailer as AffiliateRetailer,
            affiliateUrl,
            buttonText,
            imageUrl: imageUrlValue || null,
            releaseStatus: releaseStatus as GameReleaseStatus,
          }
        : null,
    errors,
    warnings,
  };
}

export function isPlaceholderAffiliateUrl(value: string) {
  try {
    const parsed = new URL(value);
    return (
      parsed.hostname.toLowerCase() === 'example.com' &&
      parsed.pathname.startsWith('/replace-me/')
    );
  } catch {
    return true;
  }
}

export function isPublicHttpsUrl(value: string) {
  return inspectHttpsUrl(value, 'URL').errors.length === 0 && !isPlaceholderAffiliateUrl(value);
}

function inspectHttpsUrl(value: string, label: string) {
  const errors: string[] = [];
  let domain = '';

  if (!value) {
    errors.push(`${label} is required.`);
    return { domain, errors };
  }

  if (value !== value.trim()) {
    errors.push(`${label} cannot contain leading or trailing spaces.`);
    return { domain, errors };
  }

  try {
    const parsed = new URL(value);

    if (parsed.protocol !== 'https:') {
      errors.push(`${label} must use HTTPS.`);
    }

    if (parsed.username || parsed.password) {
      errors.push(`${label} cannot contain embedded credentials.`);
    }

    domain = parsed.hostname.toLowerCase();
  } catch {
    errors.push(`${label} is not a valid URL.`);
  }

  return { domain, errors };
}

function requiredText(
  input: Record<string, unknown>,
  key: string,
  label: string,
  maxLength: number,
  errors: string[],
) {
  const value = sanitizeText(readString(input, key), maxLength);

  if (!value) {
    errors.push(`${label} is required.`);
  }

  return value;
}

function sanitizeText(value: string, maxLength: number) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

function readString(input: Record<string, unknown>, key: string) {
  return typeof input[key] === 'string' ? input[key] : '';
}

function readBoolean(input: Record<string, unknown>, key: string, fallback: boolean) {
  return typeof input[key] === 'boolean' ? input[key] : fallback;
}

function readInteger(input: Record<string, unknown>, key: string, fallback: number) {
  const value = input[key];
  return typeof value === 'number' && Number.isInteger(value) ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}
