'use client';

import { AdSlot, type AdSlotProps } from './AdSlot';

type PlacementProps = Pick<AdSlotProps, 'className' | 'enabled'>;

export function HomepageAd(props: PlacementProps) {
  return <AdSlot placement="homepage" {...props} />;
}

export function ResultsAd(props: PlacementProps) {
  return <AdSlot placement="results" {...props} />;
}

export function ArticleTopAd(props: PlacementProps) {
  return <AdSlot placement="article-top" {...props} />;
}

export function ArticleMiddleAd(props: PlacementProps) {
  return <AdSlot placement="article-middle" {...props} />;
}

export function ArticleBottomAd(props: PlacementProps) {
  return <AdSlot placement="article-bottom" {...props} />;
}

export function SidebarAd(props: PlacementProps) {
  return <AdSlot placement="article-sidebar" {...props} />;
}

export function FooterAd(props: PlacementProps) {
  return <AdSlot placement="footer" {...props} />;
}
