'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import type {
  PublicMonetizationPayload,
  PublicRecommendationSection,
  RecommendationDebugInfo,
} from '../lib/affiliate-types';
import type { CompatibilityResult } from '../lib/compatibility';
import {
  allocateInitialProductCardLimits,
  isPassingRecommendationScenario,
} from '../lib/monetization-policy';
import { determineRecommendationScenario } from '../lib/recommendation-scenario';
import { trackRecommendationEvent } from '../lib/recommendation-analytics';
import { ResultsAd } from './ads/AdPlacements';
import { RecommendationProductCard } from './RecommendationProductCard';

export function AffiliateRecommendations({
  result,
  onProductsLoaded,
}: {
  result: CompatibilityResult;
  onProductsLoaded?: (productIds: string[]) => void;
}) {
  const scenarioCode = determineRecommendationScenario(result);
  const trackedScenario = useRef('');
  const [requestState, setRequestState] = useState<{
    scenarioCode: string;
    payload: PublicMonetizationPayload;
    loaded: boolean;
    error: string | null;
  }>({ scenarioCode: '', payload: null, loaded: false, error: null });

  useEffect(() => {
    const controller = new AbortController();

    if (process.env.NODE_ENV !== 'production') {
      console.info(`[recommendations] Detected scenario: ${scenarioCode}`);
    }

    fetch(`/api/monetization?scenario=${encodeURIComponent(scenarioCode)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Recommendations are unavailable.');
        return (await response.json()) as PublicMonetizationPayload;
      })
      .then((payload) => {
        if (process.env.NODE_ENV !== 'production') {
          console.info('[recommendations] Database response', {
            detectedScenario: scenarioCode,
            sectionsFound: payload?.debug?.sectionsFound ?? payload?.sections.length ?? 0,
            productsFound:
              payload?.debug?.productsFound ??
              payload?.sections.reduce(
                (total, section) => total + section.products.length,
                0,
              ) ??
              0,
          });
        }
        if (trackedScenario.current !== scenarioCode) {
          trackedScenario.current = scenarioCode;
          trackRecommendationEvent('recommendation_scenario_viewed', {
            scenario: scenarioCode,
          });
        }
        onProductsLoaded?.(
          Array.from(
            new Set(
              (payload?.sections ?? []).flatMap((section) =>
                section.products.map((product) => product.productId ?? product.id),
              ),
            ),
          ),
        );
        setRequestState({ scenarioCode, payload, loaded: true, error: null });
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setRequestState({
            scenarioCode,
            payload: null,
            loaded: true,
            error: error instanceof Error ? error.message : 'Recommendations are unavailable.',
          });
        }
      });

    return () => controller.abort();
  }, [onProductsLoaded, result, scenarioCode]);

  const isCurrentResponse = requestState.scenarioCode === scenarioCode;
  const payload = isCurrentResponse ? requestState.payload : null;
  const loaded = isCurrentResponse && requestState.loaded;
  const loadingError = isCurrentResponse ? requestState.error : null;

  const displaySections = useMemo(() => {
    const sections = payload?.sections ?? [];
    const limits = allocateInitialProductCardLimits(
      sections.map((section) => ({
        collapsedByDefault: section.collapsedByDefault,
        productCount: section.products.length,
      })),
    );

    return sections.map((section, index) => ({
      section,
      initiallyOpen: !section.collapsedByDefault && (limits[index] ?? 0) > 0,
      initialProductLimit: limits[index] ?? 0,
    }));
  }, [payload]);

  if (!loaded) return null;

  const generalSections = displaySections.filter(
    ({ section }) => section.purpose === 'GENERAL',
  );
  const guidanceSections = (payload?.sections ?? []).filter(
    (section) => section.purpose === 'GUIDANCE',
  );
  const prebuiltSections = (payload?.sections ?? []).filter(
    (section) => section.purpose === 'PREBUILT',
  );
  const purchaseSections = isPassingRecommendationScenario(scenarioCode)
    ? (payload?.sections ?? []).filter((section) => section.purpose === 'GAME_PURCHASE')
    : [];
  const [primarySection, ...secondaryGeneralSections] = generalSections;
  const monetizedBlocks: Array<{ key: string; node: ReactNode }> = [];

  for (const section of guidanceSections) {
    monetizedBlocks.push({
      key: section.id,
      node: <GuidanceRecommendationSection scenarioCode={scenarioCode} section={section} />,
    });
  }

  if (primarySection) {
    monetizedBlocks.push({
      key: primarySection.section.id,
      node: (
        <RecommendationSection
          description={getScenarioRecommendationContext(result)}
          initialProductLimit={primarySection.initialProductLimit}
          initiallyOpen={primarySection.initiallyOpen}
          section={primarySection.section}
          scenarioCode={scenarioCode}
        />
      ),
    });
  }

  if (prebuiltSections.length > 0) {
    monetizedBlocks.push({
      key: 'complete-gaming-pcs',
      node: <PrebuiltRecommendationSection scenarioCode={scenarioCode} sections={prebuiltSections} />,
    });
  }

  if (purchaseSections.length > 0) {
    monetizedBlocks.push({
      key: 'gta-vi-purchase',
      node: <GamePurchaseRecommendationSection sections={purchaseSections} />,
    });
  }

  for (const sectionState of secondaryGeneralSections) {
    monetizedBlocks.push({
      key: sectionState.section.id,
      node: (
        <RecommendationSection
          initialProductLimit={sectionState.initialProductLimit}
          initiallyOpen={sectionState.initiallyOpen}
          section={sectionState.section}
          scenarioCode={scenarioCode}
        />
      ),
    });
  }

  if (!payload || monetizedBlocks.length === 0) {
    return (
      <section aria-label="Recommendations" className="grid gap-4">
        {process.env.NODE_ENV !== 'production' ? (
          <RecommendationDebug
            debug={payload?.debug}
            detectedScenario={scenarioCode}
            error={loadingError}
          />
        ) : null}
        <RecommendationFallback unavailable={Boolean(loadingError)} />
      </section>
    );
  }

  return (
    <section aria-label="Recommendations" className="grid gap-4">
      {monetizedBlocks.map((block, index) => (
        <div className="contents" key={block.key}>
          {block.node}
          {index === 0 ? <AffiliateDisclosure /> : null}
          {index === 0 ? <ResultsAd className="my-2 w-full" /> : null}
        </div>
      ))}
    </section>
  );
}

function RecommendationFallback({ unavailable }: { unavailable: boolean }) {
  return (
    <aside className="theme-glass-card rounded-2xl p-4 sm:p-5">
      <h2 className="text-base font-black text-white">
        {unavailable ? 'Product recommendations are temporarily unavailable' : 'No matching product recommendations are available yet'}
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-400">
        {unavailable
          ? 'Your compatibility result above is still valid. You can browse the latest GTA VI hardware guides while recommendations recover.'
          : 'Your compatibility result above is complete. Browse the latest GTA VI hardware guides for practical upgrade and setup advice.'}
      </p>
      <Link className="theme-link mt-3 inline-flex text-sm font-bold" href="/articles">
        Browse GTA VI guides &rarr;
      </Link>
    </aside>
  );
}

function RecommendationDebug({
  detectedScenario,
  debug,
  error,
}: {
  detectedScenario: string;
  debug?: RecommendationDebugInfo;
  error: string | null;
}) {
  const sectionsFound = debug?.sectionsFound ?? 0;
  const productsFound = debug?.productsFound ?? 0;

  return (
    <aside className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs leading-6 text-amber-100">
      <p><strong>Detected Scenario:</strong><br />{detectedScenario}</p>
      <p className="mt-2"><strong>Sections Found:</strong><br />{sectionsFound}</p>
      <p className="mt-2"><strong>Products Found:</strong><br />{productsFound}</p>
      {debug?.databaseScenarioCode && debug.databaseScenarioCode !== detectedScenario ? (
        <p className="mt-2">Database Scenario: {debug.databaseScenarioCode}</p>
      ) : null}
      {debug && !debug.scenarioEnabled ? (
        <p className="mt-2">The matching scenario is disabled.</p>
      ) : null}
      {debug?.disabledSections.length ? (
        <div className="mt-2">
          <strong>Disabled Sections:</strong>
          <ul className="list-inside list-disc">
            {debug.disabledSections.map((section) => (
              <li key={section.title}>
                {section.title} ({section.enabledProducts} enabled products)
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {debug?.sectionsWithoutEnabledProducts.length ? (
        <div className="mt-2">
          <strong>Sections With No Enabled Products:</strong>
          <ul className="list-inside list-disc">
            {debug.sectionsWithoutEnabledProducts.map((title) => <li key={title}>{title}</li>)}
          </ul>
        </div>
      ) : null}
      {debug?.productsRejectedByUrl.length ? (
        <div className="mt-2">
          <strong>Enabled Products Rejected by URL Validation:</strong>
          <ul className="list-inside list-disc">
            {debug.productsRejectedByUrl.map((title) => <li key={title}>{title}</li>)}
          </ul>
        </div>
      ) : null}
      {error ? <p className="mt-2">Request Error: {error}</p> : null}
    </aside>
  );
}

function RecommendationSection({
  section,
  initiallyOpen,
  initialProductLimit,
  description,
  scenarioCode,
}: {
  section: PublicRecommendationSection;
  initiallyOpen: boolean;
  initialProductLimit: number;
  description?: string;
  scenarioCode: string;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [showAll, setShowAll] = useState(false);
  const visibleProducts = showAll
    ? section.products
    : section.products.slice(0, initialProductLimit);
  const productsToRender = open
    ? visibleProducts.length > 0
      ? visibleProducts
      : section.products
    : [];
  const hasMore = open && productsToRender.length < section.products.length;
  const sectionRef = useRef<HTMLElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (!sectionRef.current || tracked.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || tracked.current) return;
      tracked.current = true;
      trackRecommendationEvent('recommendation_section_viewed', {
        scenario: scenarioCode,
        section: section.title,
      });
      observer.disconnect();
    }, { threshold: 0.2 });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [scenarioCode, section.title]);

  return (
    <section className="theme-glass-card overflow-hidden rounded-3xl" ref={sectionRef}>
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-fuchsia-400/[0.045] sm:p-6"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span>
          <span className="theme-kicker block text-xs font-black uppercase tracking-[0.17em]">
            Recommended for this result
          </span>
          <span className="mt-1 block text-xl font-black text-white">{section.title}</span>
          <span className="mt-1 block max-w-3xl text-sm leading-6 text-slate-400">
            {description ?? section.description}
          </span>
        </span>
        <span aria-hidden="true" className="text-xl text-slate-400">
          {open ? <>&minus;</> : '+'}
        </span>
      </button>

      {open ? (
        <div className="border-t border-white/10 p-4 sm:p-5 sm:pt-6">
          <div className={layoutClass(section.layout, productsToRender.length)}>
            {productsToRender.map((product) => (
              <RecommendationProductCard
                key={product.id}
                onAction={() => trackRecommendationEvent('recommendation_product_clicked', {
                  scenario: scenarioCode,
                  section: section.title,
                  productId: product.productId ?? product.id,
                  productTitle: product.title,
                })}
                product={product}
              />
            ))}
          </div>
          {hasMore ? (
            <button
              className="theme-secondary-button mt-4 rounded-xl px-4 py-2 text-sm font-bold"
              onClick={() => setShowAll(true)}
              type="button"
            >
              Show more recommendations
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function PrebuiltRecommendationSection({
  sections,
  scenarioCode,
}: {
  sections: PublicRecommendationSection[];
  scenarioCode: string;
}) {
  const products = sections
    .flatMap((section) =>
      section.products.map((product) => ({
        product,
        categoryLabel: section.title,
      })),
    )
    .slice(0, 4);

  if (products.length === 0) return null;

  return (
    <section className="theme-glass-card rounded-3xl p-4 sm:p-5">
      <p className="theme-kicker text-xs font-black uppercase tracking-[0.17em]">
        Complete systems
      </p>
      <h2 className="mt-1 text-xl font-black text-white">Prefer a Complete Gaming PC?</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
        Choose a complete desktop or laptop instead of replacing individual parts.
      </p>
      <div className="mt-5 grid items-stretch gap-4 md:grid-cols-2">
        {products.map(({ product, categoryLabel }) => (
          <RecommendationProductCard
            categoryLabel={categoryLabel}
            compact
            key={product.id}
            onAction={() => trackRecommendationEvent('recommendation_prebuilt_clicked', {
              scenario: scenarioCode,
              section: categoryLabel,
              productId: product.productId ?? product.id,
              productTitle: product.title,
            })}
            product={product}
          />
        ))}
      </div>
    </section>
  );
}

function GamePurchaseRecommendationSection({
  sections,
}: {
  sections: PublicRecommendationSection[];
}) {
  const products = sections.flatMap((section) => section.products).slice(0, 3);

  if (products.length === 0) return null;

  return (
    <section className="theme-glass-card rounded-3xl p-4 sm:p-5">
      <p className="theme-kicker text-xs font-black uppercase tracking-[0.17em]">
        Purchase links
      </p>
      <h2 className="mt-1 text-xl font-black text-white">Ready for GTA VI?</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
        View the GTA VI listing that has been enabled by the site owner.
      </p>
      <div className={`mt-5 ${layoutClass('featured', products.length)}`}>
        {products.map((product) => (
          <RecommendationProductCard compact key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function AffiliateDisclosure() {
  return (
    <p className="rounded-xl border border-violet-200/10 bg-slate-950/35 px-3 py-2 text-xs leading-5 text-slate-300">
      Some product links are affiliate links. We may earn a commission from qualifying
      purchases at no additional cost to you.
    </p>
  );
}

function GuidanceRecommendationSection({
  section,
  scenarioCode,
}: {
  section: PublicRecommendationSection;
  scenarioCode: string;
}) {
  return (
    <aside className="theme-glass-card rounded-2xl p-4 sm:p-5">
      <p className="theme-kicker text-xs font-black uppercase tracking-[0.17em]">
        Confirm your hardware
      </p>
      <h2 className="mt-1 text-xl font-black text-white">
        {section.emptyStateTitle || section.title}
      </h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
        {section.emptyStateDescription || section.description}
      </p>
      {section.ctaLabel && section.ctaUrl ? (
        <Link
          className="theme-primary-button mt-4 inline-flex rounded-xl px-4 py-2.5 text-sm font-black"
          href={section.ctaUrl}
          onClick={() => trackRecommendationEvent(
            'recommendation_manual_spec_cta_clicked',
            { scenario: scenarioCode, section: section.title },
          )}
        >
          {section.ctaLabel} &rarr;
        </Link>
      ) : null}
    </aside>
  );
}

function getScenarioRecommendationContext(result: CompatibilityResult) {
  const failingComponents = result.components.filter((component) => component.status === 'below');

  if (failingComponents.length === 1) {
    return `Your ${failingComponents[0].label} is below the estimated minimum requirement. These upgrades are stronger options for GTA VI.`;
  }

  if (failingComponents.length > 1) {
    return `Your ${joinComponentLabels(failingComponents.map((component) => component.label))} are below the estimated minimum requirements. These recommendations focus on the parts holding your PC back.`;
  }

  const unknownComponents = result.components.filter(
    (component) => component.status === 'unknown',
  );

  if (unknownComponents.length > 0) {
    return `We could not confirm your ${joinComponentLabels(unknownComponents.map((component) => component.label))}. These options can help you compare supported hardware.`;
  }

  if (result.overall.status === 'recommended') {
    return 'Your PC meets the estimated recommended requirement. These are optional additions for your GTA VI setup.';
  }

  return 'Your PC meets the estimated minimum requirement. These upgrades can provide more headroom for GTA VI.';
}

function joinComponentLabels(labels: string[]) {
  if (labels.length <= 1) return labels[0] ?? 'hardware';
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`;
}

function layoutClass(
  layout: PublicRecommendationSection['layout'],
  productCount: number,
) {
  if (layout === 'horizontal') {
    return 'flex snap-x gap-5 overflow-x-auto pb-3 [&>article]:w-[min(84vw,330px)] [&>article]:shrink-0 [&>article]:snap-start';
  }

  if (productCount >= 3 && layout !== 'featured') {
    return 'grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3';
  }

  if (productCount === 2) {
    return 'grid items-stretch gap-5 md:grid-cols-2';
  }

  return 'grid max-w-2xl items-stretch gap-5';
}
