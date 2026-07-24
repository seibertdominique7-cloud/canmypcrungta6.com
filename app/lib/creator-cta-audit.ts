import 'server-only';

import type { CreatorRecommendationInput } from './creator-recommendation-types';
import { prisma } from './prisma';
import {
  VERIFIED_CREATOR_DESTINATIONS,
} from './creator-cta-destinations';

export interface CreatorCtaWarning {
  field: string;
  message: string;
}

const CREATOR_LANGUAGE =
  /\b(?:creator|stream|streaming|obs|recording|webcam|camera|microphone|audio|content creation|capture card|lighting)\b/i;

export async function auditCreatorRecommendationDestinations(
  input: CreatorRecommendationInput,
): Promise<CreatorCtaWarning[]> {
  const destinations = [
    { field: 'Primary CTA', value: input.primaryCtaUrl },
    ...(input.secondaryCtaUrl
      ? [{ field: 'Secondary CTA', value: input.secondaryCtaUrl }]
      : []),
    ...input.guides
      .filter((guide) => guide.enabled)
      .map((guide, index) => ({
        field: `Guide ${index + 1}`,
        value: guide.url,
      })),
  ];

  const warnings = await Promise.all(
    destinations.map(async ({ field, value }) => {
      const warning = await auditDestination(value);
      return warning ? { field, message: warning } : null;
    }),
  );

  return warnings.filter((warning): warning is CreatorCtaWarning => Boolean(warning));
}

async function auditDestination(value: string) {
  const destination = value.trim();
  if (!destination || destination.startsWith('#') || /^https:\/\//i.test(destination)) {
    return '';
  }

  const path = destination.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  if (VERIFIED_CREATOR_DESTINATIONS.includes(
    path as (typeof VERIFIED_CREATOR_DESTINATIONS)[number],
  )) {
    return '';
  }
  if (path === '/articles') {
    return 'points to the general article index rather than a creator setup page.';
  }
  if (path.startsWith('/articles/')) {
    const slug = decodeURIComponent(path.slice('/articles/'.length));
    const article = await prisma.article.findUnique({
      where: { slug },
      select: {
        title: true,
        excerpt: true,
        focusKeyword: true,
        status: true,
        scheduledAt: true,
      },
    });
    if (!article) return 'points to an article route that does not exist.';

    const publicNow =
      article.status === 'published' ||
      (
        article.status === 'scheduled' &&
        article.scheduledAt !== null &&
        article.scheduledAt <= new Date()
      );
    if (!publicNow) return 'points to an article that is not currently published.';
    if (!CREATOR_LANGUAGE.test(`${article.title} ${article.excerpt} ${article.focusKeyword}`)) {
      return 'points to a published article that does not appear to be creator-related.';
    }
    return '';
  }

  const contentPage = path.startsWith('/pages/')
    ? await prisma.contentPage.findUnique({
        where: { slug: decodeURIComponent(path.slice('/pages/'.length)) },
        select: { enabled: true, status: true, title: true, excerpt: true },
      })
    : await prisma.contentPage.findUnique({
        where: { requiredPageKey: decodeURIComponent(path.slice(1)) },
        select: { enabled: true, status: true, title: true, excerpt: true },
      });

  if (!contentPage) return 'points to a route that could not be found.';
  if (!contentPage.enabled || contentPage.status !== 'published') {
    return 'points to a CMS page that is disabled or unpublished.';
  }
  if (!CREATOR_LANGUAGE.test(`${contentPage.title} ${contentPage.excerpt}`)) {
    return 'points to a published page that does not appear to be creator-related.';
  }
  return '';
}
