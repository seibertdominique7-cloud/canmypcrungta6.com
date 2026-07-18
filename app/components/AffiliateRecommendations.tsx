'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';

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
import { RecommendationProductCard } from './RecommendationProductCard';

export function AffiliateRecommendations({ result }: { result: CompatibilityResult }) {
  const scenarioCode = determineRecommendationScenario(result);
  const [requestState, setRequestState] = useState<{
    scenarioCode: string;
    payload: PublicMonetizationPayload;
    loaded: boolean;
    error: string | null;
  }>({ scenarioCode: '', payload: null, loaded: false, error: null });

  useEffect(() => {
    const controller = new AbortController();

    console.info(`[recommendations] Detected scenario: ${scenarioCode}`);

    fetch(`/api/monetization?scenario=${encodeURIComponent(scenarioCode)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Recommendations are unavailable.');
        return (await response.json()) as PublicMonetizationPayload;
      })
      .then((payload) => {
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
  }, [result, scenarioCode]);

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
  const prebuiltSections = (payload?.sections ?? []).filter(
    (section) => section.purpose === 'PREBUILT',
  );
  const purchaseSections = isPassingRecommendationScenario(scenarioCode)
    ? (payload?.sections ?? []).filter((section) => section.purpose === 'GAME_PURCHASE')
    : [];
  const [primarySection, ...secondaryGeneralSections] = generalSections;
  const monetizedBlocks: Array<{ key: string; node: ReactNode }> = [];

  if (primarySection) {
    monetizedBlocks.push({
      key: primarySection.section.id,
      node: (
        <RecommendationSection
          description={getScenarioRecommendationContext(result)}
          initialProductLimit={primarySection.initialProductLimit}
          initiallyOpen={primarySection.initiallyOpen}
          section={primarySection.section}
        />
      ),
    });
  }

  if (prebuiltSections.length > 0) {
    monetizedBlocks.push({
      key: 'complete-gaming-pcs',
      node: <PrebuiltRecommendationSection sections={prebuiltSections} />,
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
        />
      ),
    });
  }

  if (!payload || monetizedBlocks.length === 0) {
    return process.env.NODE_ENV !== 'production' ? (
      <RecommendationDebug
        debug={payload?.debug}
        detectedScenario={scenarioCode}
        error={loadingError}
      />
    ) : null;
  }

  return (
    <section aria-label="Recommendations" className="grid gap-4">
      {monetizedBlocks.map((block, index) => (
        <div className="contents" key={block.key}>
          {block.node}
          {index === 0 ? <AffiliateDisclosure /> : null}
        </div>
      ))}
    </section>
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
}: {
  section: PublicRecommendationSection;
  initiallyOpen: boolean;
  initialProductLimit: number;
  description?: string;
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

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.025] shadow-xl shadow-black/10">
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-white/[0.025] sm:p-6"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span>
          <span className="block text-xs font-black uppercase tracking-[0.17em] text-violet-300">
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
              <RecommendationProductCard key={product.id} product={product} />
            ))}
          </div>
          {hasMore ? (
            <button
              className="mt-4 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
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
}: {
  sections: PublicRecommendationSection[];
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
    <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-4 shadow-lg shadow-black/10 sm:p-5">
      <p className="text-xs font-black uppercase tracking-[0.17em] text-cyan-300">
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
    <section className="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.035] p-4 shadow-xl shadow-black/10 sm:p-5">
      <p className="text-xs font-black uppercase tracking-[0.17em] text-violet-300">
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
    <p className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs leading-5 text-slate-400">
      Disclosure: We may earn a commission when you purchase through links on this page, at no
      additional cost to you.
    </p>
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
