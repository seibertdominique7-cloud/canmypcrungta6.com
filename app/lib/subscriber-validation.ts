import {
  isCoreRecommendationScenarioCode,
  type CoreRecommendationScenarioCode,
} from '../data/recommendation-scenarios';
import {
  CONSENT_FILTER_VALUES,
  EMAIL_SIGNUP_SOURCES,
  EMAIL_SUBSCRIBER_STATUSES,
  SUBSCRIBER_DATE_SORTS,
  type ConsentFilterValue,
  type EmailSignupSource,
  type EmailSubscriberStatus,
  type SubscriberAdminFilters,
  type SubscriberDateSort,
  type SubscriberSignupInput,
} from './subscriber-types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SubscriberSignupValidation =
  | { data: SubscriberSignupInput; errors: []; isBot: false }
  | { data: null; errors: string[]; isBot: boolean };

export function normalizeSubscriberEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateSubscriberSignup(value: unknown): SubscriberSignupValidation {
  if (!isRecord(value)) {
    return invalid('Enter a valid email address.');
  }

  const honeypot = readString(value.company);
  if (honeypot.trim()) {
    return { data: null, errors: [], isBot: true };
  }

  const email = readString(value.email).trim();
  const normalizedEmail = normalizeSubscriberEmail(email);
  const signupSource = readSignupSource(value.signupSource);
  const scenario = readScenario(value.scenario);
  const gtaUpdatesConsent = value.gtaUpdatesConsent === true;
  const marketingConsent = value.marketingConsent === true;

  if (!email || email.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
    return invalid('Enter a valid email address.');
  }

  if (!gtaUpdatesConsent) {
    return invalid('Agree to receive GTA VI updates before subscribing.');
  }

  if (!signupSource) {
    return invalid('The signup source is invalid.');
  }

  if (signupSource !== 'homepage' && !scenario) {
    return invalid('The compatibility result could not be identified.');
  }

  return {
    data: {
      email,
      normalizedEmail,
      gtaUpdatesConsent: true,
      marketingConsent,
      scenario: signupSource === 'homepage' ? null : scenario,
      signupSource,
    },
    errors: [],
    isBot: false,
  };
}

export function parseSubscriberAdminFilters(
  searchParams: URLSearchParams,
): SubscriberAdminFilters {
  const status = readStatus(searchParams.get('status')) ?? 'all';
  const gtaUpdatesConsent =
    readConsentFilter(searchParams.get('gtaUpdatesConsent')) ?? 'all';
  const marketingConsent =
    readConsentFilter(searchParams.get('marketingConsent')) ?? 'all';
  const scenarioValue = searchParams.get('scenario');
  const scenario =
    scenarioValue && isCoreRecommendationScenarioCode(scenarioValue)
      ? scenarioValue
      : 'all';
  const signupSource = readSignupSource(searchParams.get('signupSource')) ?? 'all';
  const sort = readDateSort(searchParams.get('sort')) ?? 'newest';

  return {
    search: (searchParams.get('search') ?? '').trim().toLowerCase().slice(0, 254),
    status,
    gtaUpdatesConsent,
    marketingConsent,
    scenario,
    signupSource,
    sort,
  };
}

function invalid(message: string): SubscriberSignupValidation {
  return { data: null, errors: [message], isBot: false };
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function readSignupSource(value: unknown): EmailSignupSource | null {
  return typeof value === 'string' && EMAIL_SIGNUP_SOURCES.includes(value as EmailSignupSource)
    ? (value as EmailSignupSource)
    : null;
}

function readStatus(value: unknown): EmailSubscriberStatus | null {
  return typeof value === 'string' &&
    EMAIL_SUBSCRIBER_STATUSES.includes(value as EmailSubscriberStatus)
    ? (value as EmailSubscriberStatus)
    : null;
}

function readConsentFilter(value: unknown): ConsentFilterValue | null {
  return typeof value === 'string' &&
    CONSENT_FILTER_VALUES.includes(value as ConsentFilterValue)
    ? (value as ConsentFilterValue)
    : null;
}

function readDateSort(value: unknown): SubscriberDateSort | null {
  return typeof value === 'string' &&
    SUBSCRIBER_DATE_SORTS.includes(value as SubscriberDateSort)
    ? (value as SubscriberDateSort)
    : null;
}

function readScenario(value: unknown): CoreRecommendationScenarioCode | null {
  return typeof value === 'string' && isCoreRecommendationScenarioCode(value)
    ? value
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
