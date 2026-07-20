'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { AdPlacementCode } from '../../data/ad-placements';
import { AD_PREVIEW_HINT_COOKIE } from '../../lib/ad-preview';
import type { PublicAdConfiguration } from '../../lib/ad-types';

interface AdConfigurationContextValue {
  configuration: PublicAdConfiguration;
  previewPlacement: AdPlacementCode | null;
  ready: boolean;
}

const AdConfigurationContext = createContext<AdConfigurationContextValue | null>(null);

export function AdConfigurationProvider({
  children,
  initialConfiguration,
}: {
  children: ReactNode;
  initialConfiguration: PublicAdConfiguration;
}) {
  const [ready, setReady] = useState(false);
  const [previewPlacement, setPreviewPlacement] = useState<AdPlacementCode | null>(null);

  useEffect(() => {
    const hasPreviewHint = document.cookie
      .split('; ')
      .some((entry) => entry.startsWith(`${AD_PREVIEW_HINT_COOKIE}=`));

    if (!hasPreviewHint) {
      const readyTimer = window.setTimeout(() => setReady(true), 0);
      return () => window.clearTimeout(readyTimer);
    }

    fetch('/api/admin/ads/preview-state', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as { placement?: AdPlacementCode | null };
      })
      .then((payload) => setPreviewPlacement(payload?.placement ?? null))
      .finally(() => {
        document.cookie = `${AD_PREVIEW_HINT_COOKIE}=; Max-Age=0; Path=/; SameSite=Strict`;
        setReady(true);
      });
  }, []);

  const value = useMemo(
    () => ({ configuration: initialConfiguration, previewPlacement, ready }),
    [initialConfiguration, previewPlacement, ready],
  );

  return <AdConfigurationContext.Provider value={value}>{children}</AdConfigurationContext.Provider>;
}

export function useAdConfiguration() {
  const value = useContext(AdConfigurationContext);
  if (!value) throw new Error('Ad slots must be rendered inside AdConfigurationProvider.');
  return value;
}
