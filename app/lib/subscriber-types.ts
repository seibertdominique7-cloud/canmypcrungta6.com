import type { CoreRecommendationScenarioCode } from '../data/recommendation-scenarios';

export const EMAIL_SIGNUP_SOURCES = [
  'homepage',
  'screenshot-result',
  'manual-result',
  'article',
] as const;

export const EMAIL_SUBSCRIBER_STATUSES = [
  'active',
  'unsubscribed',
  'suppressed',
] as const;

export const SUBSCRIBER_DATE_SORTS = ['newest', 'oldest'] as const;
export const CONSENT_FILTER_VALUES = ['all', 'true', 'false'] as const;

export type EmailSignupSource = (typeof EMAIL_SIGNUP_SOURCES)[number];
export type EmailSubscriberStatus = (typeof EMAIL_SUBSCRIBER_STATUSES)[number];
export type SubscriberDateSort = (typeof SUBSCRIBER_DATE_SORTS)[number];
export type ConsentFilterValue = (typeof CONSENT_FILTER_VALUES)[number];

export interface SubscriberSignupInput {
  email: string;
  normalizedEmail: string;
  gtaUpdatesConsent: true;
  marketingConsent: true;
  scenario: CoreRecommendationScenarioCode | null;
  signupSource: EmailSignupSource;
}

export interface EmailSubscriberRecord {
  id: string;
  email: string;
  normalizedEmail: string;
  gtaUpdatesConsent: boolean;
  marketingConsent: boolean;
  scenario: CoreRecommendationScenarioCode | null;
  signupSource: EmailSignupSource;
  status: EmailSubscriberStatus;
  createdAt: string;
  updatedAt: string;
  unsubscribedAt: string | null;
  lastEmailSentAt: string | null;
}

export interface SubscriberAdminFilters {
  search: string;
  status: EmailSubscriberStatus | 'all';
  gtaUpdatesConsent: ConsentFilterValue;
  marketingConsent: ConsentFilterValue;
  scenario: CoreRecommendationScenarioCode | 'all';
  signupSource: EmailSignupSource | 'all';
  sort: SubscriberDateSort;
}

export interface SubscriberAdminSummary {
  totalActive: number;
  gtaUpdatesSubscribers: number;
  marketingSubscribers: number;
  unsubscribed: number;
  sourceCounts: Record<EmailSignupSource, number>;
  scenarioCounts: Partial<Record<CoreRecommendationScenarioCode, number>>;
}

export interface SubscriberAdminPayload {
  subscribers: EmailSubscriberRecord[];
  filteredTotal: number;
  resultLimit: number;
  summary: SubscriberAdminSummary;
}
