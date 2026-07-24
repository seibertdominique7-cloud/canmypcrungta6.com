import type { MetadataRoute } from 'next';

import { getIndexableContent } from './lib/cms-data';
import { getSiteUrl } from './lib/seo';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const content = await getIndexableContent();

  return [
    { url: site, changeFrequency: 'weekly', priority: 1 },
    { url: `${site}/manual`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${site}/articles`, changeFrequency: 'daily', priority: 0.8 },
    {
      url: `${site}/creator-setup-builder`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${site}/creator-setup-guide`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${site}/affiliate-disclosure`,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    ...content.articles.map((item) => ({
      url: `${site}/articles/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      images: item.featuredImage
        ? [absolute(item.featuredImage, site)]
        : undefined,
    })),
    ...content.pages.map((item) => ({
      url: `${site}${
        item.requiredPageKey ? `/${item.requiredPageKey}` : `/pages/${item.slug}`
      }`,
      lastModified: item.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      images: item.featuredImage
        ? [absolute(item.featuredImage, site)]
        : undefined,
    })),
    ...content.categories.map((item) => ({
      url: `${site}/category/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
    ...content.tags.map((item) => ({
      url: `${site}/tag/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    })),
  ];
}

function absolute(value: string, site: string) {
  return value.startsWith('/') ? `${site}${value}` : value;
}
