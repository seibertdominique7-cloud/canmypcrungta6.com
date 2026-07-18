'use client';

import { useEffect, useMemo, useState } from 'react';

import type {
  AffiliateProductRecord,
  PublicMonetizationPayload,
  PublicRecommendationSection,
  RecommendationDebugInfo,
} from '../lib/affiliate-types';
import type { CompatibilityResult } from '../lib/compatibility';
import { allocateInitialProductCardLimits } from '../lib/monetization-policy';
import { determineRecommendationScenario } from '../lib/recommendation-scenario';

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
  }, [scenarioCode]);

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

  if (!payload || displaySections.length === 0) {
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
      {displaySections.map(({ section, initiallyOpen, initialProductLimit }, index) => (
        <div className="contents" key={section.id}>
          <RecommendationSection
            initialProductLimit={initialProductLimit}
            initiallyOpen={initiallyOpen}
            section={section}
          />
          {index === 0 && <AffiliateDisclosure />}
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
      {debug?.databaseScenarioCode && debug.databaseScenarioCode !== detectedScenario && (
        <p className="mt-2">Database Scenario: {debug.databaseScenarioCode}</p>
      )}
      {debug && !debug.scenarioEnabled && (
        <p className="mt-2">The matching scenario is disabled.</p>
      )}
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
      {error && <p className="mt-2">Request Error: {error}</p>}
    </aside>
  );
}

function RecommendationSection({
  section,
  initiallyOpen,
  initialProductLimit,
}: {
  section: PublicRecommendationSection;
  initiallyOpen: boolean;
  initialProductLimit: number;
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
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span>
          <span className="block text-xs font-black uppercase tracking-[0.17em] text-violet-300">
            {section.purpose === 'GAME_PURCHASE'
              ? 'Game purchase'
              : section.purpose === 'PREBUILT'
                ? 'Complete gaming PCs'
                : 'Recommended for this result'}
          </span>
          <span className="mt-1 block text-xl font-black text-white">{section.title}</span>
          <span className="mt-1 block text-sm leading-6 text-slate-400">{section.description}</span>
        </span>
        <span aria-hidden="true" className="text-xl text-slate-400">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-white/10 p-4 sm:p-5">
          <div className={layoutClass(section.layout)}>
            {productsToRender.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {hasMore && (
            <button
              className="mt-4 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
              onClick={() => setShowAll(true)}
              type="button"
            >
              View more options
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function ProductCard({ product }: { product: AffiliateProductRecord }) {
  return (
    <article className="flex min-h-64 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#090d17] p-4">
      {product.imageUrl && (
        // Admin-entered remote URLs intentionally use a normal img element.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="mb-4 h-32 w-full rounded-xl object-cover"
          loading="lazy"
          src={product.imageUrl}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-violet-300">
          {product.badge}
        </span>
        {product.platform && (
          <span className="text-xs font-bold text-cyan-300">{product.platform}</span>
        )}
      </div>
      <h3 className="mt-3 text-lg font-black text-white">{product.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
        {product.shortDescription}
      </p>
      <div className="mt-auto pt-4">
        <div className="mb-3 flex items-end justify-between gap-3 text-sm">
          <span className="font-black text-slate-100">{product.priceText}</span>
          <span className="text-xs text-slate-500">{product.retailer}</span>
        </div>
        <a
          className="inline-flex w-full items-center justify-center rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-violet-400"
          href={product.affiliateUrl}
          rel="sponsored nofollow noopener noreferrer"
          target="_blank"
        >
          {product.buttonText}
        </a>
      </div>
    </article>
  );
}

function AffiliateDisclosure() {
  return (
    <p className="px-1 text-xs leading-5 text-slate-500">
      Disclosure: We may earn a commission when you purchase through links on this page, at no
      additional cost to you.
    </p>
  );
}

function layoutClass(layout: PublicRecommendationSection['layout']) {
  if (layout === 'horizontal') {
    return 'flex snap-x gap-4 overflow-x-auto pb-2 [&>article]:w-[min(82vw,300px)] [&>article]:shrink-0 [&>article]:snap-start';
  }

  if (layout === 'featured') {
    return 'grid gap-4 md:grid-cols-2';
  }

  return 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3';
}
