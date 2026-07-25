export type MerchAnalyticsEvent =
  | 'merch_store_link_clicked'
  | 'merch_product_clicked'
  | 'merch_cta_clicked'
  | 'merch_announcement_clicked'
  | 'merch_announcement_dismissed';

export function trackMerchEvent(
  event: MerchAnalyticsEvent,
  detail: Record<string, string>,
) {
  if (typeof window === 'undefined') return;
  const payload = { event, ...detail };
  window.dispatchEvent(new CustomEvent('merch-event', { detail: payload }));
  const analyticsWindow = window as Window & {
    dataLayer?: Array<Record<string, string>>;
  };
  analyticsWindow.dataLayer?.push(payload);
}
