export const AFFILIATE_RETAILERS = [
  'Amazon',
  'Best Buy',
  'Newegg',
  'Walmart',
  'Target',
  'eBay',
  'Micro Center',
  'B&H',
  'Other',
] as const;

export const PRODUCT_COMPONENT_TYPES = [
  'GPU',
  'CPU',
  'RAM',
  'Storage',
  'Prebuilt Desktop',
  'Gaming Laptop',
  'Monitor',
  'Controller',
  'Keyboard',
  'Mouse',
  'Headset',
  'Game',
  'Other',
] as const;

// Retained for the rollback-only AffiliateProduct API. New catalog forms use
// PRODUCT_COMPONENT_TYPES exclusively.
export const AFFILIATE_COMPONENT_TYPES = [
  ...PRODUCT_COMPONENT_TYPES,
  'Prebuilt PC',
  'Game Purchase',
] as const;

export const AFFILIATE_BADGES = [
  'Best Value',
  'Budget Pick',
  'Performance Pick',
  'Premium Pick',
  'Recommended',
  'None',
] as const;

export const RECOMMENDATION_GROUP_TYPES = ['SCENARIO', 'PREBUILT'] as const;

export const GAME_PURCHASE_PLATFORMS = [
  'PlayStation 5',
  'Xbox Series X|S',
  'PC',
] as const;

export const GAME_RELEASE_STATUSES = [
  'Announced',
  'Coming Soon',
  'Preorder Available',
  'Available',
] as const;

export type AffiliateRetailer = (typeof AFFILIATE_RETAILERS)[number];
export type AffiliateComponentType = (typeof AFFILIATE_COMPONENT_TYPES)[number];
export type ProductComponentType = (typeof PRODUCT_COMPONENT_TYPES)[number];
export type AffiliateBadge = (typeof AFFILIATE_BADGES)[number];
export type RecommendationGroupType = (typeof RECOMMENDATION_GROUP_TYPES)[number];
export type GamePurchasePlatform = (typeof GAME_PURCHASE_PLATFORMS)[number];
export type GameReleaseStatus = (typeof GAME_RELEASE_STATUSES)[number];

export interface AffiliateProductRecord {
  id: string;
  productId?: string;
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
  displayOrder: number;
  sectionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductUsageRecord {
  assignmentId: string;
  sectionId: string;
  sectionTitle: string;
  scenarioCode: string;
  scenarioName: string;
  assignmentEnabled: boolean;
}

export interface ProductRecord {
  id: string;
  title: string;
  canonicalName: string;
  componentType: ProductComponentType;
  shortDescription: string;
  imageUrl: string | null;
  retailer: AffiliateRetailer;
  affiliateUrl: string;
  defaultPriceText: string;
  platform: GamePurchasePlatform | null;
  enabled: boolean;
  usage: ProductUsageRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationAssignmentRecord {
  id: string;
  productId: string;
  sectionId: string;
  badge: AffiliateBadge;
  buttonText: string;
  overridePriceText: string | null;
  overrideDescription: string | null;
  enabled: boolean;
  displayOrder: number;
  product: ProductRecord;
  createdAt: string;
  updatedAt: string;
}

export type RecommendationSectionLayout = 'grid' | 'horizontal' | 'featured';
export type RecommendationSectionPurpose = 'GENERAL' | 'GAME_PURCHASE' | 'PREBUILT';

export interface RecommendationSectionRecord {
  id: string;
  scenarioId: string;
  title: string;
  description: string;
  enabled: boolean;
  displayOrder: number;
  maxProducts: number;
  collapsedByDefault: boolean;
  layout: RecommendationSectionLayout;
  purpose: RecommendationSectionPurpose;
  isCore: boolean;
  products: AffiliateProductRecord[];
  assignments?: RecommendationAssignmentRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationWorkspace {
  scenarios: RecommendationScenarioRecord[];
  products: ProductRecord[];
}

export interface RecommendationScenarioRecord {
  id: string;
  code: string;
  displayName: string;
  resultHeading: string;
  resultDescription: string;
  enabled: boolean;
  displayOrder: number;
  isCore: boolean;
  groupType: RecommendationGroupType;
  sections: RecommendationSectionRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface GamePurchaseLinkRecord {
  id: string;
  enabled: boolean;
  title: string;
  description: string;
  platform: GamePurchasePlatform;
  retailer: AffiliateRetailer;
  affiliateUrl: string;
  buttonText: string;
  imageUrl: string | null;
  releaseStatus: GameReleaseStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicRecommendationSection {
  id: string;
  title: string;
  description: string;
  maxProducts: number;
  collapsedByDefault: boolean;
  layout: RecommendationSectionLayout;
  purpose: RecommendationSectionPurpose;
  products: AffiliateProductRecord[];
}

export interface PublicRecommendationPayload {
  scenario: {
    code: string;
    resultHeading: string;
    resultDescription: string;
  };
  sections: PublicRecommendationSection[];
  debug?: RecommendationDebugInfo;
}

export interface RecommendationDebugInfo {
  detectedScenario: string;
  databaseScenarioCode: string | null;
  scenarioEnabled: boolean;
  sectionsFound: number;
  productsFound: number;
  renderableProductsFound: number;
  disabledSections: Array<{
    title: string;
    enabledProducts: number;
  }>;
  sectionsWithoutEnabledProducts: string[];
  productsRejectedByUrl: string[];
}

export type PublicMonetizationPayload = PublicRecommendationPayload | null;
