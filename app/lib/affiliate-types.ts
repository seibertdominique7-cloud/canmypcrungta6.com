export const AFFILIATE_RETAILERS = [
  'Amazon',
  'Best Buy',
  'Newegg',
  'Walmart',
  'Other',
] as const;

export const AFFILIATE_COMPONENT_TYPES = [
  'GPU',
  'CPU',
  'RAM',
  'Storage',
  'Prebuilt PC',
  'Monitor',
  'Controller',
  'Keyboard',
  'Mouse',
  'Headset',
  'Game Purchase',
  'Other',
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
export type AffiliateBadge = (typeof AFFILIATE_BADGES)[number];
export type RecommendationGroupType = (typeof RECOMMENDATION_GROUP_TYPES)[number];
export type GamePurchasePlatform = (typeof GAME_PURCHASE_PLATFORMS)[number];
export type GameReleaseStatus = (typeof GAME_RELEASE_STATUSES)[number];

export interface AffiliateProductRecord {
  id: string;
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
  createdAt: string;
  updatedAt: string;
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
