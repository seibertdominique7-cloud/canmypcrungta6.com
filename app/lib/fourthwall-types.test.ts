import { describe, expect, it } from 'vitest';

import {
  getFourthwallCartSubtotal,
  getFourthwallProductColors,
  getFourthwallStartingPrice,
  isPublishedFourthwallProduct,
  type FourthwallCart,
  type FourthwallProduct,
  type FourthwallVariant,
} from './fourthwall-types';

function createVariant(
  id: string,
  price: number,
  options: {
    color?: string;
    inStock?: number | null;
    stockType?: string;
  } = {},
): FourthwallVariant {
  return {
    id,
    name: id,
    unitPrice: { value: price, currency: 'USD' },
    attributes: options.color
      ? {
          color: {
            name: options.color,
          },
        }
      : null,
    stock: {
      type: options.stockType ?? 'AVAILABLE',
      inStock: options.inStock,
    },
    images: [],
  };
}

function createProduct(variants: FourthwallVariant[]): FourthwallProduct {
  return {
    id: 'product-1',
    name: 'Test product',
    slug: 'test-product',
    state: { type: 'AVAILABLE' },
    access: { type: 'PUBLIC' },
    images: [],
    variants,
  };
}

describe('Fourthwall storefront data helpers', () => {
  it('treats public, available products as published even when temporarily sold out', () => {
    const product = createProduct([createVariant('variant-1', 25)]);

    expect(isPublishedFourthwallProduct(product)).toBe(true);
    expect(isPublishedFourthwallProduct({ ...product, access: { type: 'PRIVATE' } })).toBe(false);
    expect(
      isPublishedFourthwallProduct({
        ...product,
        variants: [createVariant('variant-1', 25, { stockType: 'SOLD_OUT' })],
      }),
    ).toBe(true);
  });

  it('uses the lowest available variant for the starting price', () => {
    const product = createProduct([
      createVariant('sold-out', 10, { stockType: 'SOLD_OUT' }),
      createVariant('higher', 30),
      createVariant('lower', 20),
    ]);

    expect(getFourthwallStartingPrice(product)).toEqual({
      value: 20,
      currency: 'USD',
    });
  });

  it('keeps a published sold-out product visible with its catalog starting price', () => {
    const product = createProduct([
      createVariant('sold-out-higher', 30, { stockType: 'SOLD_OUT' }),
      createVariant('sold-out-lower', 20, { stockType: 'SOLD_OUT' }),
    ]);

    expect(getFourthwallStartingPrice(product)).toEqual({
      value: 20,
      currency: 'USD',
    });
  });

  it('returns unique product colors without changing their display values', () => {
    const product = createProduct([
      createVariant('black-1', 20, { color: 'Black' }),
      createVariant('black-2', 20, { color: 'black' }),
      createVariant('white', 20, { color: 'White' }),
    ]);

    expect(getFourthwallProductColors(product).map((color) => color.name)).toEqual([
      'Black',
      'White',
    ]);
  });

  it('calculates the cart subtotal from live variant prices and quantities', () => {
    const variant = createVariant('variant-1', 22) as FourthwallCart['items'][number]['variant'];
    variant.product = {
      id: 'product-1',
      name: 'Test product',
      slug: 'test-product',
    };

    expect(
      getFourthwallCartSubtotal({
        id: 'cart-1',
        items: [{ variant, quantity: 3 }],
      }),
    ).toEqual({
      value: 66,
      currency: 'USD',
    });
  });
});
