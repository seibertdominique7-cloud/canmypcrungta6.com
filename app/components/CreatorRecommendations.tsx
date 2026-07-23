'use client';

import { useEffect, useRef, useState } from 'react';

import { getCreatorFallbackPayload } from '../lib/creator-recommendation-data-client';
import { trackCreatorRecommendationEvent } from '../lib/creator-analytics';
import type { CompatibilityResult } from '../lib/compatibility';
import type { PublicCreatorRecommendationPayload } from '../lib/creator-recommendation-types';
import { determineRecommendationScenario } from '../lib/recommendation-scenario';
import { RecommendationProductCard } from './RecommendationProductCard';

export function CreatorRecommendations({ result }: { result: CompatibilityResult }) {
  const scenarioCode = determineRecommendationScenario(result);
  const [loadedPayload, setLoadedPayload] = useState<PublicCreatorRecommendationPayload | null>(null);
  const payload =
    loadedPayload?.scenarioCode === scenarioCode
      ? loadedPayload
      : getCreatorFallbackPayload(scenarioCode);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/creator-recommendations?scenario=${encodeURIComponent(scenarioCode)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Creator recommendations could not be loaded.');
        return (await response.json()) as PublicCreatorRecommendationPayload;
      })
      .then(setLoadedPayload)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setLoadedPayload(null);
        }
      });

    return () => controller.abort();
  }, [scenarioCode]);

  return <CreatorRecommendationSection payload={payload} />;
}

export function CreatorRecommendationSection({
  payload,
  preview = false,
}: {
  payload: PublicCreatorRecommendationPayload;
  preview?: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackedView = useRef('');
  const trackingKey = payload.scenarioCode;

  useEffect(() => {
    if (preview || trackedView.current === trackingKey || !sectionRef.current) return;

    const section = sectionRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || trackedView.current === trackingKey) {
          return;
        }
        trackedView.current = trackingKey;
        trackCreatorRecommendationEvent('creator_section_viewed', {
          scenario: payload.scenarioCode,
          source: payload.source,
        });
        observer.disconnect();
      },
      { threshold: 0.2 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [payload.scenarioCode, payload.source, preview, trackingKey]);

  const track = (
    event: 'creator_cta_clicked' | 'creator_product_clicked' | 'creator_guide_clicked',
    detail: Record<string, string>,
  ) => {
    if (preview) return;
    trackCreatorRecommendationEvent(event, {
      scenario: payload.scenarioCode,
      source: payload.source,
      ...detail,
    });
  };

  return (
    <section
      className="relative overflow-hidden border-t border-fuchsia-300/15 bg-gradient-to-br from-fuchsia-950/25 via-slate-950/70 to-violet-950/30 px-4 py-8 sm:px-6 sm:py-10"
      id="creator-recommendations"
      ref={sectionRef}
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="relative">
        <p className="theme-kicker text-xs font-black uppercase tracking-[0.18em]">
          Creator setup path
        </p>
        <h2 className="mt-3 max-w-4xl text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
          {payload.headline}
        </h2>
        <p className="mt-3 text-base font-bold text-fuchsia-200 sm:text-lg">
          {payload.subheadline}
        </p>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
          {payload.description}
        </p>

        {payload.warningText ? (
          <p className="mt-5 max-w-4xl rounded-2xl border border-amber-300/20 bg-amber-400/[0.08] px-4 py-3 text-sm leading-6 text-amber-100">
            <span className="font-black">Start here:</span> {payload.warningText}
          </p>
        ) : null}

        {payload.groups.length > 0 ? (
          <div className="mt-8 grid gap-8" id="creator-products">
            {payload.groups.map((group) => (
              <section key={group.id}>
                <div className="mb-4">
                  <h3 className="text-xl font-black text-white sm:text-2xl">{group.title}</h3>
                  {group.description ? (
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
                      {group.description}
                    </p>
                  ) : null}
                </div>
                <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.products.map((product) => (
                    <RecommendationProductCard
                      categoryLabel={group.title}
                      compact
                      key={product.id}
                      onAction={() =>
                        track('creator_product_clicked', {
                          group: group.title,
                          productId: product.productId ?? product.id,
                          productTitle: product.title,
                        })
                      }
                      preview={preview}
                      product={product}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {payload.guides.length > 0 ? (
          <div className="mt-7 flex flex-wrap gap-2" aria-label="Creator setup guides">
            {payload.guides.map((guide) => (
              <a
                className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-fuchsia-300/40 hover:bg-fuchsia-400/10"
                href={guide.url}
                key={guide.id}
                onClick={() =>
                  track('creator_guide_clicked', { guideId: guide.id, guideLabel: guide.label })
                }
                rel={isExternalUrl(guide.url) ? 'noopener noreferrer' : undefined}
                target={isExternalUrl(guide.url) ? '_blank' : undefined}
              >
                {guide.label} <span aria-hidden="true">→</span>
              </a>
            ))}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <a
            className="theme-primary-button inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-black sm:w-auto"
            href={payload.primaryCtaUrl}
            onClick={() => track('creator_cta_clicked', { cta: 'primary' })}
            rel={isExternalUrl(payload.primaryCtaUrl) ? 'noopener noreferrer' : undefined}
            target={isExternalUrl(payload.primaryCtaUrl) ? '_blank' : undefined}
          >
            {payload.primaryCtaLabel} <span aria-hidden="true" className="ml-2">→</span>
          </a>
          {payload.secondaryCtaLabel && payload.secondaryCtaUrl ? (
            <a
              className="inline-flex w-full items-center justify-center rounded-xl border border-fuchsia-300/25 bg-fuchsia-400/[0.07] px-5 py-3 text-sm font-black text-fuchsia-100 transition hover:bg-fuchsia-400/15 sm:w-auto"
              href={payload.secondaryCtaUrl}
              onClick={() => track('creator_cta_clicked', { cta: 'secondary' })}
              rel={isExternalUrl(payload.secondaryCtaUrl) ? 'noopener noreferrer' : undefined}
              target={isExternalUrl(payload.secondaryCtaUrl) ? '_blank' : undefined}
            >
              {payload.secondaryCtaLabel}
            </a>
          ) : null}
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-500">
          Build your setup one piece at a time. Start with the upgrades that solve your biggest bottleneck.
        </p>
      </div>
    </section>
  );
}

function isExternalUrl(value: string) {
  return /^https:\/\//i.test(value);
}
