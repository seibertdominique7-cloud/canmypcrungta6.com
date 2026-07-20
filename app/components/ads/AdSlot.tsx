'use client';

import { useEffect, useRef, useState } from 'react';

import { isAdPlacementCode } from '../../data/ad-placements';
import type { AdDeviceTarget } from '../../lib/ad-types';
import { isValidAdsenseClient, isValidAdsenseSlot } from '../../lib/ad-validation';
import { useAdConfiguration } from './AdConfigurationProvider';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, never>>;
  }
}

export interface AdSlotProps {
  placement: string;
  slot?: string;
  format?: string;
  responsive?: boolean;
  className?: string;
  label?: string;
  enabled?: boolean;
}

export function AdSlot({
  placement,
  slot,
  format,
  responsive,
  className = '',
  label,
  enabled,
}: AdSlotProps) {
  const { configuration, previewPlacement, ready } = useAdConfiguration();
  const initializedSlot = useRef<string | null>(null);
  const placementConfiguration = isAdPlacementCode(placement)
    ? configuration.placements[placement]
    : null;
  const effectiveClient = placementConfiguration?.client ?? '';
  const effectiveSlot = slot ?? placementConfiguration?.slot ?? '';
  const effectiveFormat = format ?? placementConfiguration?.format ?? 'auto';
  const effectiveResponsive = responsive ?? placementConfiguration?.responsive ?? configuration.defaultResponsive;
  const effectiveLabel = label ?? placementConfiguration?.label ?? configuration.defaultLabel;
  const deviceTarget = placementConfiguration?.deviceTarget ?? 'both';
  const deviceMatches = useDeviceTarget(deviceTarget);
  const valid =
    isValidAdsenseClient(effectiveClient) &&
    isValidAdsenseSlot(effectiveSlot) &&
    placementConfiguration?.provider === 'google-adsense';
  const isAdminPreview = previewPlacement === placement;
  const shouldRenderAd =
    ready &&
    !previewPlacement &&
    deviceMatches &&
    configuration.masterEnabled &&
    placementConfiguration?.enabled === true &&
    enabled !== false &&
    valid;

  useEffect(() => {
    if (!shouldRenderAd || initializedSlot.current === effectiveSlot) return;
    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
      initializedSlot.current = effectiveSlot;
    } catch {
      initializedSlot.current = effectiveSlot;
    }
  }, [effectiveSlot, shouldRenderAd]);

  if (!ready || !deviceMatches) return null;

  if (!shouldRenderAd) {
    const showDebug = isAdminPreview || (!previewPlacement && configuration.debugPlaceholders);
    if (!showDebug) return null;
    return (
      <aside
        aria-label={`Ad debug placeholder: ${placement}`}
        className={`rounded-xl border border-dashed border-slate-500/40 bg-slate-950/25 px-4 py-3 text-center text-xs leading-5 text-slate-500 ${className}`}
        data-ad-debug="true"
        data-ad-placement={placement}
      >
        <p>Ad placeholder: {placement}</p>
        <p>
          Provider: {placementConfiguration?.provider ?? 'missing'} / Slot:{' '}
          {isValidAdsenseSlot(effectiveSlot) ? 'configured' : 'missing or invalid'}
        </p>
      </aside>
    );
  }

  return (
    <aside
      aria-label={`${effectiveLabel}: ${placement}`}
      className={`text-center ${className}`}
      data-ad-placement={placement}
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
        {effectiveLabel}
      </p>
      <ins
        className="adsbygoogle block w-full"
        data-ad-client={effectiveClient}
        data-ad-format={effectiveFormat}
        data-ad-slot={effectiveSlot}
        data-full-width-responsive={effectiveResponsive ? 'true' : 'false'}
        style={{ display: 'block' }}
      />
    </aside>
  );
}

function useDeviceTarget(target: AdDeviceTarget) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (target === 'both') return;
    const query = window.matchMedia('(min-width: 1280px)');
    const update = () => setMatches(target === 'desktop' ? query.matches : !query.matches);
    const updateTimer = window.setTimeout(update, 0);
    query.addEventListener('change', update);
    return () => {
      window.clearTimeout(updateTimer);
      query.removeEventListener('change', update);
    };
  }, [target]);

  return target === 'both' ? true : matches;
}
