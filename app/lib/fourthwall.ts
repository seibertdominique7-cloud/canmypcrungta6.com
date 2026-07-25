import 'server-only';

import type {
  FourthwallCart,
  FourthwallCartRequestItem,
  FourthwallProduct,
  FourthwallProductsResponse,
} from './fourthwall-types';
import { isPublishedFourthwallProduct } from './fourthwall-types';

const FOURTHWALL_API_BASE = 'https://storefront-api.fourthwall.com/v1';
const PRODUCT_PAGE_SIZE = 50;
const MAX_PRODUCT_PAGES = 20;

export class FourthwallConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FourthwallConfigurationError';
  }
}

export class FourthwallApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'FourthwallApiError';
    this.status = status;
    this.code = code;
  }
}

export function isFourthwallConfigured() {
  return Boolean(process.env.FOURTHWALL_STOREFRONT_TOKEN?.trim());
}

export function getFourthwallCheckoutBaseUrl() {
  const value = process.env.NEXT_PUBLIC_FOURTHWALL_CHECKOUT_URL?.trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.origin : '';
  } catch {
    return '';
  }
}

export async function getFourthwallProducts() {
  const products: FourthwallProduct[] = [];

  for (let page = 0; page < MAX_PRODUCT_PAGES; page += 1) {
    const response = await fourthwallRequest<FourthwallProductsResponse>(
      `/collections/all/products?page=${page}&size=${PRODUCT_PAGE_SIZE}&currency=USD`,
      { next: { revalidate: 300 } },
    );
    products.push(...response.results);
    if (!response.paging.hasNextPage) break;
  }

  return products.filter(isPublishedFourthwallProduct);
}

export async function getFourthwallProduct(slug: string) {
  const product = await fourthwallRequest<FourthwallProduct>(
    `/products/${encodeURIComponent(slug)}?currency=USD`,
    { next: { revalidate: 300 } },
  );
  return isPublishedFourthwallProduct(product) ? product : null;
}

export async function createFourthwallCart(items: FourthwallCartRequestItem[]) {
  return fourthwallRequest<FourthwallCart>('/carts?currency=USD', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items,
      metadata: { source: 'canmypcrungta6_merch' },
    }),
  });
}

export async function getFourthwallCart(cartId: string) {
  return fourthwallRequest<FourthwallCart>(
    `/carts/${encodeURIComponent(cartId)}?currency=USD`,
    { cache: 'no-store' },
  );
}

export async function addFourthwallCartItems(
  cartId: string,
  items: FourthwallCartRequestItem[],
) {
  return fourthwallRequest<FourthwallCart>(
    `/carts/${encodeURIComponent(cartId)}/add?currency=USD`,
    {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    },
  );
}

export async function changeFourthwallCartItem(
  cartId: string,
  item: FourthwallCartRequestItem,
) {
  const operation = item.quantity === 0 ? 'remove' : 'change';
  return fourthwallRequest<FourthwallCart>(
    `/carts/${encodeURIComponent(cartId)}/${operation}?currency=USD`,
    {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [item] }),
    },
  );
}

async function fourthwallRequest<T>(path: string, init: RequestInit & {
  next?: { revalidate?: number };
} = {}) {
  const token = process.env.FOURTHWALL_STOREFRONT_TOKEN?.trim();
  if (!token) {
    throw new FourthwallConfigurationError(
      'The Fourthwall storefront is not configured.',
    );
  }

  const separator = path.includes('?') ? '&' : '?';
  const response = await fetch(
    `${FOURTHWALL_API_BASE}${path}${separator}storefront_token=${encodeURIComponent(token)}`,
    init,
  );

  if (!response.ok) {
    const payload = await safeJson(response);
    const code =
      typeof payload === 'object' &&
      payload !== null &&
      'code' in payload &&
      typeof payload.code === 'string'
        ? payload.code
        : undefined;
    throw new FourthwallApiError(
      friendlyFourthwallError(response.status, code),
      response.status,
      code,
    );
  }

  return response.json() as Promise<T>;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function friendlyFourthwallError(status: number, code?: string) {
  if (status === 404 || code === 'CART_NOT_FOUND') {
    return 'That Fourthwall item could not be found.';
  }
  if (status === 429) {
    return 'The merchandise service is busy. Please try again shortly.';
  }
  if (code === 'CART_QUANTITY_TOO_HIGH') {
    return 'That quantity is not currently available.';
  }
  if (code === 'CART_OFFER_NOT_AVAILABLE' || code === 'CART_OFFER_NOT_PURCHASABLE_ERROR') {
    return 'That product option is no longer available.';
  }
  return status >= 500
    ? 'Fourthwall is temporarily unavailable. Please try again shortly.'
    : 'The merchandise request could not be completed.';
}
