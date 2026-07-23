import type { CoreRecommendationScenarioCode } from '../data/recommendation-scenarios';
import type { AffiliateProductRecord, ProductRecord } from './affiliate-types';

export interface CreatorProductAssignmentRecord {
  id: string;
  productId: string;
  enabled: boolean;
  displayOrder: number;
  product: ProductRecord;
}

export interface CreatorRecommendationGroupRecord {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  displayOrder: number;
  assignments: CreatorProductAssignmentRecord[];
}

export interface CreatorGuideRecord {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
  displayOrder: number;
}

export interface CreatorRecommendationRecord {
  id: string;
  scenarioId: string;
  enabled: boolean;
  headline: string;
  subheadline: string;
  description: string;
  warningText: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  groups: CreatorRecommendationGroupRecord[];
  guides: CreatorGuideRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatorRecommendationWorkspace {
  scenarios: Array<{
    id: string;
    code: CoreRecommendationScenarioCode;
    displayName: string;
    creatorRecommendation: CreatorRecommendationRecord | null;
  }>;
  products: ProductRecord[];
}

export interface CreatorRecommendationInput {
  scenarioId: string;
  enabled: boolean;
  headline: string;
  subheadline: string;
  description: string;
  warningText: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  groups: Array<{
    title: string;
    description: string;
    enabled: boolean;
    productIds: string[];
  }>;
  guides: Array<{
    label: string;
    url: string;
    enabled: boolean;
  }>;
}

export interface PublicCreatorRecommendationPayload {
  scenarioCode: CoreRecommendationScenarioCode;
  source: 'custom' | 'fallback';
  headline: string;
  subheadline: string;
  description: string;
  warningText: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  groups: Array<{
    id: string;
    title: string;
    description: string;
    products: AffiliateProductRecord[];
  }>;
  guides: Array<{
    id: string;
    label: string;
    url: string;
  }>;
}
