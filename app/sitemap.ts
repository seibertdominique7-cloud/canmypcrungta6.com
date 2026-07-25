import type { MetadataRoute } from 'next';

import { getIndexableContent } from './lib/cms-data';
import { getSiteUrl } from './lib/seo';
import { getFourthwallProducts, isFourthwallConfigured } from './lib/fourthwall';
import { getMerchStoreSettings } from './lib/merch-data';
import { getStoreSitemapEntry } from './lib/merch-sitemap';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const [content, merchSettings, fourthwallProducts] = await Promise.all([
    getIndexableContent(),
    getMerchStoreSettings(),
    isFourthwallConfigured()
      ? getFourthwallProducts().catch(() => [])
      : Promise.resolve([]),
  ]);

  const storeEntry = getStoreSitemapEntry(merchSettings, site);
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
    ...(storeEntry ? [storeEntry] : []),
    ...(isFourthwallConfigured()
      ? [
          {
            url: `${site}/merch`,
            changeFrequency: 'daily' as const,
            priority: 0.7,
          },
          ...fourthwallProducts.map((product) => ({
            url: `${site}/merch/${product.slug}`,
            lastModified: product.updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.6,
            images: product.images[0]
              ? [product.images[0].transformedUrl || product.images[0].url]
              : undefined,
          })),
        ]
      : []),
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
