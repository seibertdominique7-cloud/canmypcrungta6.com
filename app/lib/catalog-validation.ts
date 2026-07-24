import {
  AFFILIATE_BADGES,
  AFFILIATE_RETAILERS,
  PRODUCT_COMPONENT_TYPES,
  PRODUCT_VALUE_TIERS,
  type AffiliateBadge,
  type AffiliateRetailer,
  type GamePurchasePlatform,
  type ProductComponentType,
  type ProductValueTier,
} from './affiliate-types';
import { inspectAffiliateUrl } from './affiliate-validation';

export interface ProductInput {
  title: string;
  componentType: ProductComponentType;
  affiliateUrl: string;
  imageUrl: string | null;
  shortDescription: string;
  retailer: AffiliateRetailer;
  defaultPriceText: string;
  platform: GamePurchasePlatform | null;
  valueTier: ProductValueTier | null;
  enabled: boolean;
}

export interface AssignmentInput {
  productIds: string[];
  sectionIds: string[];
  badge: AffiliateBadge;
  buttonText: string;
  overridePriceText: string | null;
  overrideDescription: string | null;
  enabled: boolean;
  displayOrder: number | null;
}

export interface AssignmentUpdateInput {
  sectionId: string;
  badge: AffiliateBadge;
  buttonText: string;
  overridePriceText: string | null;
  overrideDescription: string | null;
  enabled: boolean;
  displayOrder: number;
}

export interface CatalogValidationResult<T> {
  data: T | null;
  fieldErrors: Record<string, string>;
  warnings: string[];
}

export function validateProductInput(value: unknown): CatalogValidationResult<ProductInput> {
  const input = asRecord(value);
  const fieldErrors: Record<string, string> = {};
  const title = boundedText(input.title, 'Title', 140, fieldErrors, true);
  const componentType = stringValue(input.componentType);
  const affiliateUrl = stringValue(input.affiliateUrl);
  const imageUrl = stringValue(input.imageUrl);
  const shortDescription = boundedText(
    input.shortDescription,
    'Description',
    500,
    fieldErrors,
    false,
  );
  const retailerValue = stringValue(input.retailer) || 'Other';
  const defaultPriceText =
    boundedText(input.defaultPriceText, 'Default price text', 80, fieldErrors, false) ||
    'Check Current Price';
  const platform = stringValue(input.platform) || null;
  const valueTier = stringValue(input.valueTier) || null;
  const urlInspection = inspectAffiliateUrl(affiliateUrl, retailerValue);

  if (!PRODUCT_COMPONENT_TYPES.includes(componentType as ProductComponentType)) {
    fieldErrors.componentType = 'Choose a valid component type.';
  }
  if (!AFFILIATE_RETAILERS.includes(retailerValue as AffiliateRetailer)) {
    fieldErrors.retailer = 'Choose a valid retailer.';
  }
  if (valueTier && !PRODUCT_VALUE_TIERS.includes(valueTier as ProductValueTier)) {
    fieldErrors.valueTier = 'Choose a valid value tier.';
  }
  if (urlInspection.errors.length > 0) {
    fieldErrors.affiliateUrl = urlInspection.errors[0];
  }
  if (imageUrl) {
    const imageError = validateHttpsUrl(imageUrl, 'Image URL');
    if (imageError) fieldErrors.imageUrl = imageError;
  }

  return {
    data:
      Object.keys(fieldErrors).length === 0
        ? {
            title,
            componentType: componentType as ProductComponentType,
            affiliateUrl,
            imageUrl: imageUrl || null,
            shortDescription,
            retailer: retailerValue as AffiliateRetailer,
            defaultPriceText,
            platform: platform as GamePurchasePlatform | null,
            valueTier: valueTier as ProductValueTier | null,
            enabled: booleanValue(input.enabled, true),
          }
        : null,
    fieldErrors,
    warnings: urlInspection.warnings,
  };
}

export function validateAssignmentInput(
  value: unknown,
): CatalogValidationResult<AssignmentInput> {
  const input = asRecord(value);
  const fieldErrors: Record<string, string> = {};
  const productIds = stringArray(input.productIds, 100);
  const sectionIds = stringArray(input.sectionIds, 100);
  const badge = stringValue(input.badge) || 'None';
  const buttonText = boundedText(input.buttonText, 'Button text', 60, fieldErrors, true);
  const overridePriceText = nullableBoundedText(
    input.overridePriceText,
    'Price override',
    80,
    fieldErrors,
  );
  const overrideDescription = nullableBoundedText(
    input.overrideDescription,
    'Description override',
    500,
    fieldErrors,
  );
  const displayOrder = optionalInteger(input.displayOrder);

  if (productIds.length === 0) fieldErrors.productIds = 'Choose at least one product.';
  if (sectionIds.length === 0) fieldErrors.sectionIds = 'Choose at least one destination section.';
  if (!AFFILIATE_BADGES.includes(badge as AffiliateBadge)) {
    fieldErrors.badge = 'Choose a valid badge.';
  }
  if (displayOrder === 'invalid') {
    fieldErrors.displayOrder = 'Display order must be a whole number from 0 to 100000.';
  }

  return {
    data:
      Object.keys(fieldErrors).length === 0
        ? {
            productIds,
            sectionIds,
            badge: badge as AffiliateBadge,
            buttonText,
            overridePriceText,
            overrideDescription,
            enabled: booleanValue(input.enabled, true),
            displayOrder: displayOrder === 'invalid' ? null : displayOrder,
          }
        : null,
    fieldErrors,
    warnings: [],
  };
}

export function validateAssignmentUpdateInput(
  value: unknown,
): CatalogValidationResult<AssignmentUpdateInput> {
  const input = asRecord(value);
  const result = validateAssignmentInput({
    ...input,
    productIds: ['existing-product'],
    sectionIds: [stringValue(input.sectionId)],
  });

  return {
    data: result.data
      ? {
          sectionId: result.data.sectionIds[0],
          badge: result.data.badge,
          buttonText: result.data.buttonText,
          overridePriceText: result.data.overridePriceText,
          overrideDescription: result.data.overrideDescription,
          enabled: result.data.enabled,
          displayOrder: result.data.displayOrder ?? 0,
        }
      : null,
    fieldErrors: result.fieldErrors,
    warnings: result.warnings,
  };
}

export function canonicalizeProductName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function getAffiliateDomain(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function stringArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0)),
  ).slice(0, limit);
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function boundedText(
  value: unknown,
  label: string,
  maximum: number,
  fieldErrors: Record<string, string>,
  required: boolean,
) {
  const key = fieldKey(label);
  const text = stringValue(value).trim();
  if (required && !text) fieldErrors[key] = `${label} is required.`;
  if (text.length > maximum) fieldErrors[key] = `${label} must be ${maximum} characters or fewer.`;
  return text;
}

function nullableBoundedText(
  value: unknown,
  label: string,
  maximum: number,
  fieldErrors: Record<string, string>,
) {
  const text = boundedText(value, label, maximum, fieldErrors, false);
  return text || null;
}

function fieldKey(label: string) {
  const [first, ...rest] = label.split(' ');
  return first.toLowerCase() + rest.map((part) => part[0].toUpperCase() + part.slice(1)).join('');
}

function validateHttpsUrl(value: string, label: string) {
  if (value !== value.trim()) return `${label} cannot contain leading or trailing spaces.`;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return `${label} must use HTTPS.`;
    if (parsed.username || parsed.password) return `${label} cannot contain embedded credentials.`;
    return '';
  } catch {
    return `${label} must be a valid URL.`;
  }
}

function optionalInteger(value: unknown): number | null | 'invalid' {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 100000 ? parsed : 'invalid';
}
