export interface FourthwallMoney {
  value: number;
  currency: string;
}

export interface FourthwallImage {
  id: string;
  url: string;
  transformedUrl?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface FourthwallVariantAttributes {
  description?: string | null;
  color?: {
    name: string;
    swatch?: string | null;
  } | null;
  size?: {
    name: string;
  } | null;
}

export interface FourthwallStock {
  type: string;
  inStock?: number | null;
}

export interface FourthwallProductSummary {
  id: string;
  name: string;
  slug: string;
}

export interface FourthwallVariant {
  id: string;
  name: string;
  sku?: string | null;
  unitPrice: FourthwallMoney;
  compareAtPrice?: FourthwallMoney | null;
  attributes?: FourthwallVariantAttributes | null;
  stock?: FourthwallStock | null;
  images: FourthwallImage[];
}

export interface FourthwallProduct {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  state?: {
    type: string;
  } | null;
  access?: {
    type: string;
  } | null;
  images: FourthwallImage[];
  variants: FourthwallVariant[];
  createdAt?: string;
  updatedAt?: string;
  additionalInformation?: Array<{
    type: string;
    title: string;
    bodyHtml: string;
  }>;
  sizeGuide?: {
    fitGuideUrls?: string[];
    previewUrl?: string | null;
    fileUrl?: string | null;
    description?: string | null;
    fitGuideDescription?: string | null;
  } | null;
}

export interface FourthwallProductsResponse {
  results: FourthwallProduct[];
  paging: {
    pageNumber: number;
    pageSize: number;
    elementsSize: number;
    elementsTotal: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

export interface FourthwallCartVariant extends FourthwallVariant {
  product: FourthwallProductSummary;
}

export interface FourthwallCartItem {
  variant: FourthwallCartVariant;
  quantity: number;
}

export interface FourthwallCart {
  id: string;
  items: FourthwallCartItem[];
  metadata?: Record<string, string>;
}

export interface FourthwallCartRequestItem {
  variantId: string;
  quantity: number;
}

export function isPublishedFourthwallProduct(product: FourthwallProduct) {
  return (
    product.state?.type?.toUpperCase() === 'AVAILABLE' &&
    product.access?.type?.toUpperCase() === 'PUBLIC'
  );
}

export function isFourthwallVariantAvailable(variant: FourthwallVariant) {
  const stockType = variant.stock?.type?.toUpperCase();
  if (stockType === 'OUT_OF_STOCK' || stockType === 'SOLD_OUT' || stockType === 'UNAVAILABLE') {
    return false;
  }
  return variant.stock?.inStock == null || variant.stock.inStock > 0;
}

export function getFourthwallStartingPrice(product: FourthwallProduct) {
  const validPrices = product.variants
    .map((variant) => variant.unitPrice)
    .filter((price) => Number.isFinite(Number(price.value)));
  const availablePrices = product.variants
    .filter(isFourthwallVariantAvailable)
    .map((variant) => variant.unitPrice)
    .filter((price) => Number.isFinite(Number(price.value)));
  const prices = availablePrices.length ? availablePrices : validPrices;

  if (!prices.length) return null;
  return prices.reduce((lowest, price) =>
    Number(price.value) < Number(lowest.value) ? price : lowest,
  );
}

export function getFourthwallProductColors(product: FourthwallProduct) {
  const colors = new Map<string, { name: string; swatch?: string | null }>();
  for (const variant of product.variants) {
    const color = variant.attributes?.color;
    if (color?.name && !colors.has(color.name.toLowerCase())) {
      colors.set(color.name.toLowerCase(), color);
    }
  }
  return Array.from(colors.values());
}

export function getFourthwallImageUrl(image?: FourthwallImage | null) {
  return image?.transformedUrl || image?.url || '';
}

export function formatFourthwallMoney(money?: FourthwallMoney | null) {
  if (!money || !Number.isFinite(Number(money.value))) return 'Price unavailable';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: money.currency || 'USD',
    }).format(Number(money.value));
  } catch {
    return `${Number(money.value).toFixed(2)} ${money.currency || 'USD'}`;
  }
}

export function getFourthwallCartSubtotal(cart: FourthwallCart | null) {
  if (!cart) return null;
  const firstMoney = cart.items[0]?.variant.unitPrice;
  if (!firstMoney) return null;
  const value = cart.items.reduce(
    (total, item) => total + Number(item.variant.unitPrice.value) * item.quantity,
    0,
  );
  return {
    value,
    currency: firstMoney.currency,
  } satisfies FourthwallMoney;
}
