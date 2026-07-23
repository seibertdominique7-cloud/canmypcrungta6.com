export type CreatorAnalyticsEvent =
  | 'creator_section_viewed'
  | 'creator_cta_clicked'
  | 'creator_product_clicked'
  | 'creator_guide_clicked';

export function trackCreatorRecommendationEvent(
  event: CreatorAnalyticsEvent,
  detail: Record<string, string>,
) {
  if (typeof window === 'undefined') return;

  const payload = { event, ...detail };
  window.dispatchEvent(new CustomEvent('creator-recommendation-event', { detail: payload }));

  const analyticsWindow = window as Window & {
    dataLayer?: Array<Record<string, string>>;
  };
  analyticsWindow.dataLayer?.push(payload);
}
