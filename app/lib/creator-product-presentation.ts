import type {
  AffiliateProductRecord,
  ProductRecord,
} from './affiliate-types';

export function toCreatorCardProduct(
  product: ProductRecord,
  sectionId: string,
): AffiliateProductRecord {
  return {
    id: product.id,
    productId: product.id,
    sectionId,
    title: product.title,
    retailer: product.retailer,
    affiliateUrl: product.affiliateUrl,
    imageUrl: product.imageUrl,
    priceText: product.defaultPriceText,
    badge: badgeForTier(product.valueTier),
    shortDescription: product.shortDescription,
    buttonText:
      product.retailer === 'Other'
        ? 'Check Current Price'
        : `View on ${product.retailer}`,
    componentType: product.componentType,
    platform: product.platform,
    enabled: product.enabled,
    displayOrder: 0,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function badgeForTier(
  tier: ProductRecord['valueTier'],
): AffiliateProductRecord['badge'] {
  if (tier === 'Minimum' || tier === 'Budget') return 'Budget Pick';
  if (tier === 'Best Value') return 'Best Value';
  if (tier === 'Performance') return 'Performance Pick';
  if (tier === 'Premium') return 'Premium Pick';
  if (tier === 'Recommended') return 'Recommended';
  return 'None';
}
