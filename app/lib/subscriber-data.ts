import 'server-only';

import type { EmailSubscriber, Prisma } from '../../generated/prisma/client';
import {
  isCoreRecommendationScenarioCode,
  type CoreRecommendationScenarioCode,
} from '../data/recommendation-scenarios';
import { prisma } from './prisma';
import { formatSubscriberCsv } from './subscriber-csv';
import {
  EMAIL_SIGNUP_SOURCES,
  EMAIL_SUBSCRIBER_STATUSES,
  type EmailSignupSource,
  type EmailSubscriberRecord,
  type EmailSubscriberStatus,
  type SubscriberAdminFilters,
  type SubscriberAdminPayload,
  type SubscriberAdminSummary,
  type SubscriberSignupInput,
} from './subscriber-types';

export const SUBSCRIBER_ADMIN_RESULT_LIMIT = 500;

export type SubscribeEmailOutcome = 'subscribed' | 'already-subscribed' | 'suppressed';

export async function subscribeEmail(input: SubscriberSignupInput) {
  try {
    return await prisma.$transaction(async (transaction) => {
      const existing = await transaction.emailSubscriber.findUnique({
        where: { normalizedEmail: input.normalizedEmail },
      });

      if (!existing) {
        await transaction.emailSubscriber.create({
          data: input,
        });
        return 'subscribed' satisfies SubscribeEmailOutcome;
      }

      if (existing.status === 'suppressed') {
        return 'suppressed' satisfies SubscribeEmailOutcome;
      }

      if (existing.status === 'active') {
        await transaction.emailSubscriber.update({
          where: { id: existing.id },
          data: {
            email: input.email,
            gtaUpdatesConsent: true,
            marketingConsent: input.marketingConsent,
            ...(input.scenario
              ? { scenario: input.scenario, signupSource: input.signupSource }
              : {}),
          },
        });
        return 'already-subscribed' satisfies SubscribeEmailOutcome;
      }

      await transaction.emailSubscriber.update({
        where: { id: existing.id },
        data: {
          email: input.email,
          gtaUpdatesConsent: true,
          marketingConsent: input.marketingConsent,
          scenario: input.scenario,
          signupSource: input.signupSource,
          status: 'active',
          unsubscribedAt: null,
        },
      });
      return 'subscribed' satisfies SubscribeEmailOutcome;
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return 'already-subscribed' satisfies SubscribeEmailOutcome;
    }
    throw error;
  }
}

export async function getSubscriberAdminPayload(
  filters: SubscriberAdminFilters,
): Promise<SubscriberAdminPayload> {
  const where = buildSubscriberWhere(filters);
  const [subscribers, filteredTotal, summary] = await Promise.all([
    prisma.emailSubscriber.findMany({
      where,
      orderBy: { createdAt: filters.sort === 'oldest' ? 'asc' : 'desc' },
      take: SUBSCRIBER_ADMIN_RESULT_LIMIT,
    }),
    prisma.emailSubscriber.count({ where }),
    getSubscriberAdminSummary(),
  ]);

  return {
    subscribers: subscribers.map(serializeSubscriber),
    filteredTotal,
    resultLimit: SUBSCRIBER_ADMIN_RESULT_LIMIT,
    summary,
  };
}

export async function createSubscriberCsv(filters: SubscriberAdminFilters) {
  const subscribers = await prisma.emailSubscriber.findMany({
    where: buildSubscriberWhere(filters),
    orderBy: { createdAt: filters.sort === 'oldest' ? 'asc' : 'desc' },
  });
  return formatSubscriberCsv(subscribers);
}

export async function setSubscriberStatus(
  id: string,
  status: Extract<EmailSubscriberStatus, 'active' | 'unsubscribed'>,
) {
  const existing = await prisma.emailSubscriber.findUnique({ where: { id } });
  if (!existing) throw new SubscriberDataError('Subscriber not found.', 404);

  await prisma.emailSubscriber.update({
    where: { id },
    data: {
      status,
      unsubscribedAt: status === 'unsubscribed' ? new Date() : null,
    },
  });
}

export async function deleteSubscriber(id: string) {
  const existing = await prisma.emailSubscriber.findUnique({ where: { id } });
  if (!existing) throw new SubscriberDataError('Subscriber not found.', 404);
  await prisma.emailSubscriber.delete({ where: { id } });
}

export async function unsubscribeSubscriberByKey(unsubscribeKey: string) {
  const subscriber = await prisma.emailSubscriber.findUnique({
    where: { unsubscribeKey },
  });

  if (!subscriber) return 'invalid' as const;
  if (subscriber.status === 'unsubscribed') return 'already-unsubscribed' as const;

  await prisma.emailSubscriber.update({
    where: { id: subscriber.id },
    data: { status: 'unsubscribed', unsubscribedAt: new Date() },
  });
  return 'unsubscribed' as const;
}

export class SubscriberDataError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function getSubscriberAdminSummary(): Promise<SubscriberAdminSummary> {
  const [
    totalActive,
    gtaUpdatesSubscribers,
    marketingSubscribers,
    unsubscribed,
    sourceGroups,
    scenarioGroups,
  ] = await Promise.all([
    prisma.emailSubscriber.count({ where: { status: 'active' } }),
    prisma.emailSubscriber.count({
      where: { status: 'active', gtaUpdatesConsent: true },
    }),
    prisma.emailSubscriber.count({
      where: { status: 'active', marketingConsent: true },
    }),
    prisma.emailSubscriber.count({ where: { status: 'unsubscribed' } }),
    prisma.emailSubscriber.groupBy({
      by: ['signupSource'],
      _count: { _all: true },
    }),
    prisma.emailSubscriber.groupBy({
      by: ['scenario'],
      where: { scenario: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const sourceCounts: Record<EmailSignupSource, number> = {
    homepage: 0,
    'screenshot-result': 0,
    'manual-result': 0,
    article: 0,
  };
  const scenarioCounts: Partial<Record<CoreRecommendationScenarioCode, number>> = {};

  for (const group of sourceGroups) {
    if (isEmailSignupSource(group.signupSource)) {
      sourceCounts[group.signupSource] = group._count._all;
    }
  }

  for (const group of scenarioGroups) {
    if (group.scenario && isCoreRecommendationScenarioCode(group.scenario)) {
      scenarioCounts[group.scenario] = group._count._all;
    }
  }

  return {
    totalActive,
    gtaUpdatesSubscribers,
    marketingSubscribers,
    unsubscribed,
    sourceCounts,
    scenarioCounts,
  };
}

function buildSubscriberWhere(filters: SubscriberAdminFilters): Prisma.EmailSubscriberWhereInput {
  return {
    ...(filters.search
      ? { normalizedEmail: { contains: filters.search } }
      : {}),
    ...(filters.status !== 'all' ? { status: filters.status } : {}),
    ...(filters.gtaUpdatesConsent !== 'all'
      ? { gtaUpdatesConsent: filters.gtaUpdatesConsent === 'true' }
      : {}),
    ...(filters.marketingConsent !== 'all'
      ? { marketingConsent: filters.marketingConsent === 'true' }
      : {}),
    ...(filters.scenario !== 'all' ? { scenario: filters.scenario } : {}),
    ...(filters.signupSource !== 'all' ? { signupSource: filters.signupSource } : {}),
  };
}

function serializeSubscriber(subscriber: EmailSubscriber): EmailSubscriberRecord {
  return {
    id: subscriber.id,
    email: subscriber.email,
    normalizedEmail: subscriber.normalizedEmail,
    gtaUpdatesConsent: subscriber.gtaUpdatesConsent,
    marketingConsent: subscriber.marketingConsent,
    scenario:
      subscriber.scenario && isCoreRecommendationScenarioCode(subscriber.scenario)
        ? subscriber.scenario
        : null,
    signupSource: isEmailSignupSource(subscriber.signupSource)
      ? subscriber.signupSource
      : 'homepage',
    status: isEmailSubscriberStatus(subscriber.status) ? subscriber.status : 'suppressed',
    createdAt: subscriber.createdAt.toISOString(),
    updatedAt: subscriber.updatedAt.toISOString(),
    unsubscribedAt: subscriber.unsubscribedAt?.toISOString() ?? null,
    lastEmailSentAt: subscriber.lastEmailSentAt?.toISOString() ?? null,
  };
}

function isEmailSignupSource(value: string): value is EmailSignupSource {
  return EMAIL_SIGNUP_SOURCES.includes(value as EmailSignupSource);
}

function isEmailSubscriberStatus(value: string): value is EmailSubscriberStatus {
  return EMAIL_SUBSCRIBER_STATUSES.includes(value as EmailSubscriberStatus);
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
