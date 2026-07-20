import type { AdPlacementCode } from '../data/ad-placements';
import { isValidAdsenseClient, isValidAdsenseSlot } from './ad-validation';

export const adsEnabled = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';
export const adsDebugEnabled = process.env.NEXT_PUBLIC_ADS_DEBUG === 'true';
export const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() ?? '';

export const adSlots: Record<AdPlacementCode, string> = {
  homepage: process.env.NEXT_PUBLIC_ADSENSE_HOMEPAGE_SLOT?.trim() ?? '',
  results: process.env.NEXT_PUBLIC_ADSENSE_RESULTS_SLOT?.trim() ?? '',
  'article-top': process.env.NEXT_PUBLIC_ADSENSE_ARTICLE_TOP_SLOT?.trim() ?? '',
  'article-middle': process.env.NEXT_PUBLIC_ADSENSE_ARTICLE_MIDDLE_SLOT?.trim() ?? '',
  'article-bottom': process.env.NEXT_PUBLIC_ADSENSE_ARTICLE_BOTTOM_SLOT?.trim() ?? '',
  'article-sidebar': process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT?.trim() ?? '',
  footer: process.env.NEXT_PUBLIC_ADSENSE_FOOTER_SLOT?.trim() ?? '',
};

export { isValidAdsenseClient, isValidAdsenseSlot };

export function canLoadAdsense() {
  return adsEnabled && isValidAdsenseClient(adsenseClient);
}
