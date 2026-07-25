import type { MetadataRoute } from 'next';

import type { MerchStoreSettings } from './merch-types';
import { isPublicMerchStore } from './merch-validation';

export function getStoreSitemapEntry(
  settings: MerchStoreSettings,
  siteUrl: string,
  lastModified = new Date(),
): MetadataRoute.Sitemap[number] | null {
  if (!isPublicMerchStore(settings)) return null;
  return {
    url: `${siteUrl.replace(/\/$/, '')}/store`,
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.7,
  };
}
