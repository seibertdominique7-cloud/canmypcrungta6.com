import {
  DEFAULT_MERCH_STORE_SETTINGS,
  MERCH_PRODUCT_SOURCES,
  MERCH_PRODUCT_TYPES,
  type MerchandiseProductInput,
  type MerchStoreSettings,
  type MerchValidationResult,
} from './merch-types';

export function validateMerchStoreSettings(
  value: unknown,
): MerchValidationResult<MerchStoreSettings> {
  const input = record(value);
  const fieldErrors: Record<string, string> = {};
  const data: MerchStoreSettings = {
    storeEnabled: boolean(input.storeEnabled, false),
    storeUrl: text(input.storeUrl, 500),
    storeSubdomain: text(input.storeSubdomain, 253),
    storeOpenGraphImage: text(input.storeOpenGraphImage, 500),
    navigationLabel: text(input.navigationLabel, 40),
    homepageSectionEnabled: boolean(input.homepageSectionEnabled, false),
    homepageTitle: text(input.homepageTitle, 100),
    homepageDescription: text(input.homepageDescription, 300),
    homepageCtaLabel: text(input.homepageCtaLabel, 50),
    homepageCtaUrl: text(input.homepageCtaUrl, 500),
    openLinksInNewTab: boolean(input.openLinksInNewTab, true),
    showInArticles: boolean(input.showInArticles, false),
    announcementEnabled: boolean(input.announcementEnabled, false),
    announcementText: text(input.announcementText, 180),
    disclaimerText:
      text(input.disclaimerText, 500) || DEFAULT_MERCH_STORE_SETTINGS.disclaimerText,
  };

  if (data.storeUrl && !isPublicHttpsUrl(data.storeUrl)) {
    fieldErrors.storeUrl = 'Store URL must be a valid public HTTPS URL.';
  }
  if (data.homepageCtaUrl && !isPublicHttpsUrl(data.homepageCtaUrl)) {
    fieldErrors.homepageCtaUrl = 'Homepage CTA URL must be a valid public HTTPS URL.';
  }
  if (data.storeOpenGraphImage && !isSafeImageUrl(data.storeOpenGraphImage)) {
    fieldErrors.storeOpenGraphImage =
      'Social preview image must use a local path or public HTTPS URL.';
  }
  if (
    data.storeSubdomain &&
    (!isHostname(data.storeSubdomain) || data.storeSubdomain.includes('://'))
  ) {
    fieldErrors.storeSubdomain = 'Enter a hostname only, such as shop.example.com.';
  }
  if (!data.navigationLabel) fieldErrors.navigationLabel = 'Navigation label is required.';
  if (!data.homepageTitle) fieldErrors.homepageTitle = 'Homepage title is required.';
  if (!data.homepageCtaLabel) fieldErrors.homepageCtaLabel = 'CTA label is required.';
  if (data.storeEnabled && !data.storeUrl) {
    fieldErrors.storeUrl = 'Add a Fourthwall store URL before enabling the store.';
  }
  if (data.announcementEnabled && !data.announcementText) {
    fieldErrors.announcementText = 'Add announcement text before enabling the announcement.';
  }

  return {
    data: Object.keys(fieldErrors).length ? null : data,
    fieldErrors,
  };
}

export function validateMerchandiseProduct(
  value: unknown,
): MerchValidationResult<MerchandiseProductInput> {
  const input = record(value);
  const fieldErrors: Record<string, string> = {};
  const productType = string(input.productType) || 'T-Shirt';
  const source = string(input.source) || 'manual';
  const enabled = boolean(input.enabled, false);
  const data: MerchandiseProductInput = {
    title: text(input.title, 160),
    shortDescription: text(input.shortDescription, 500),
    productUrl: text(input.productUrl, 500),
    imageUrl: text(input.imageUrl, 500) || null,
    productType: productType as MerchandiseProductInput['productType'],
    badge: text(input.badge, 50),
    priceText: text(input.priceText, 80),
    enabled,
    featured: boolean(input.featured, false),
    displayOrder: integer(input.displayOrder, 0, 100000, fieldErrors),
    homepageVisible: boolean(input.homepageVisible, false),
    storeVisible: boolean(input.storeVisible, false),
    articleVisible: boolean(input.articleVisible, false),
    notes: text(input.notes, 1000),
    source: source as MerchandiseProductInput['source'],
  };

  if (!MERCH_PRODUCT_TYPES.includes(data.productType)) {
    fieldErrors.productType = 'Choose a valid merchandise type.';
  }
  if (!MERCH_PRODUCT_SOURCES.includes(data.source)) {
    fieldErrors.source = 'Choose a valid product source.';
  }
  if (data.productUrl && !isPublicHttpsUrl(data.productUrl)) {
    fieldErrors.productUrl = 'Product URL must be a valid public HTTPS URL.';
  }
  if (data.imageUrl && !isSafeImageUrl(data.imageUrl)) {
    fieldErrors.imageUrl = 'Image must use a local path or a valid public HTTPS URL.';
  }

  if (enabled) {
    if (!data.title) fieldErrors.title = 'Title is required before enabling this product.';
    if (!data.shortDescription) {
      fieldErrors.shortDescription = 'Description is required before enabling this product.';
    }
    if (!data.productUrl) {
      fieldErrors.productUrl = 'Product URL is required before enabling this product.';
    }
    if (!data.imageUrl) fieldErrors.imageUrl = 'Image is required before enabling this product.';
    if (!data.priceText) {
      fieldErrors.priceText = 'Price text is required before enabling this product.';
    }
  }

  return {
    data: Object.keys(fieldErrors).length ? null : data,
    fieldErrors,
  };
}

export function isPublicMerchandiseProduct(
  product: Pick<
    MerchandiseProductInput,
    'enabled' | 'title' | 'shortDescription' | 'productUrl' | 'imageUrl' | 'priceText'
  >,
) {
  return Boolean(
    product.enabled &&
      product.title.trim() &&
      product.shortDescription.trim() &&
      isPublicHttpsUrl(product.productUrl) &&
      product.imageUrl &&
      isSafeImageUrl(product.imageUrl) &&
      product.priceText.trim(),
  );
}

export function isPublicMerchStore(settings: MerchStoreSettings) {
  return settings.storeEnabled && isPublicHttpsUrl(settings.storeUrl);
}

export function isPublicHttpsUrl(value: string) {
  if (!value || value !== value.trim()) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function isSafeImageUrl(value: string) {
  return (value.startsWith('/') && !value.startsWith('//')) || isPublicHttpsUrl(value);
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function string(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function text(value: unknown, maximum: number) {
  return string(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maximum);
}

function boolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function integer(
  value: unknown,
  minimum: number,
  maximum: number,
  errors: Record<string, string>,
) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    errors.displayOrder = `Display order must be a whole number from ${minimum} to ${maximum}.`;
    return minimum;
  }
  return parsed;
}

function isHostname(value: string) {
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(
    value,
  );
}
