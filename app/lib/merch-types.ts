export const MERCH_PRODUCT_TYPES = [
  'T-Shirt',
  'Hoodie',
  'Sweatshirt',
  'Hat',
  'Mug',
  'Sticker',
  'Poster',
  'Mouse Pad',
  'Phone Case',
  'Other',
] as const;

export const MERCH_PRODUCT_SOURCES = ['manual', 'fourthwall-api'] as const;

export type MerchProductType = (typeof MERCH_PRODUCT_TYPES)[number];
export type MerchProductSource = (typeof MERCH_PRODUCT_SOURCES)[number];

export interface MerchStoreSettings {
  storeEnabled: boolean;
  storeUrl: string;
  storeSubdomain: string;
  storeOpenGraphImage: string;
  navigationLabel: string;
  homepageSectionEnabled: boolean;
  homepageTitle: string;
  homepageDescription: string;
  homepageCtaLabel: string;
  homepageCtaUrl: string;
  openLinksInNewTab: boolean;
  showInArticles: boolean;
  announcementEnabled: boolean;
  announcementText: string;
  disclaimerText: string;
}

export interface MerchandiseProductRecord {
  id: string;
  title: string;
  shortDescription: string;
  productUrl: string;
  imageUrl: string | null;
  productType: MerchProductType;
  badge: string;
  priceText: string;
  enabled: boolean;
  featured: boolean;
  displayOrder: number;
  homepageVisible: boolean;
  storeVisible: boolean;
  articleVisible: boolean;
  notes: string;
  source: MerchProductSource;
  createdAt: string;
  updatedAt: string;
}

export interface MerchandiseProductInput {
  title: string;
  shortDescription: string;
  productUrl: string;
  imageUrl: string | null;
  productType: MerchProductType;
  badge: string;
  priceText: string;
  enabled: boolean;
  featured: boolean;
  displayOrder: number;
  homepageVisible: boolean;
  storeVisible: boolean;
  articleVisible: boolean;
  notes: string;
  source: MerchProductSource;
}

export interface MerchValidationResult<T> {
  data: T | null;
  fieldErrors: Record<string, string>;
}

export const DEFAULT_MERCH_STORE_SETTINGS: MerchStoreSettings = {
  storeEnabled: false,
  storeUrl: '',
  storeSubdomain: 'shop.canmypcrungta6.com',
  storeOpenGraphImage: '',
  navigationLabel: 'Store',
  homepageSectionEnabled: false,
  homepageTitle: 'GTA VI Launch Gear',
  homepageDescription:
    'Original gaming apparel and accessories made for the road to GTA VI.',
  homepageCtaLabel: 'Shop All Gear',
  homepageCtaUrl: '',
  openLinksInNewTab: true,
  showInArticles: false,
  announcementEnabled: false,
  announcementText: '',
  disclaimerText:
    'Merchandise is sold and fulfilled by Fourthwall. Product availability, pricing, shipping, and returns are handled by Fourthwall.',
};

export function merchExternalLinkProps(openInNewTab: boolean) {
  return openInNewTab
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};
}
