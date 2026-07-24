export type RecommendationAnalyticsEvent =
  | 'recommendation_scenario_viewed'
  | 'recommendation_section_viewed'
  | 'recommendation_product_clicked'
  | 'recommendation_prebuilt_clicked'
  | 'recommendation_manual_spec_cta_clicked';

export function trackRecommendationEvent(
  event: RecommendationAnalyticsEvent,
  detail: Record<string, string>,
) {
  if (typeof window === 'undefined') return;

  const payload = { event, ...detail };
  window.dispatchEvent(new CustomEvent('recommendation-event', { detail: payload }));
  const analyticsWindow = window as Window & {
    dataLayer?: Array<Record<string, string>>;
  };
  analyticsWindow.dataLayer?.push(payload);
}
