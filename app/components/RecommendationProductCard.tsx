'use client';

import type { AffiliateProductRecord } from '../lib/affiliate-types';

type RecommendationCardProduct = Pick<
  AffiliateProductRecord,
  | 'affiliateUrl'
  | 'badge'
  | 'buttonText'
  | 'componentType'
  | 'imageUrl'
  | 'platform'
  | 'priceText'
  | 'retailer'
  | 'shortDescription'
  | 'title'
>;

export function RecommendationProductCard({
  product,
  preview = false,
  compact = false,
  categoryLabel,
  headingLevel = 'h3',
  onAction,
}: {
  product: RecommendationCardProduct;
  preview?: boolean;
  compact?: boolean;
  categoryLabel?: string;
  headingLevel?: 'h2' | 'h3';
  onAction?: () => void;
}) {
  const Heading = headingLevel;
  const buttonText = getPublicButtonText(product.buttonText, product.retailer);
  const retailerLabel = product.retailer === 'Other' ? 'Retailer link' : product.retailer;
  const callToActionClass =
    'theme-primary-button group/cta inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black';

  return (
    <article
      className={`theme-glass-card group relative flex h-full min-w-0 flex-col overflow-hidden rounded-3xl transition duration-300 hover:-translate-y-1 hover:border-fuchsia-300/40 hover:shadow-2xl hover:shadow-fuchsia-950/30 ${compact ? 'min-h-[22rem]' : 'min-h-[24rem]'}`}
    >
      <div
        className={`relative overflow-hidden border-b border-violet-200/10 bg-gradient-to-br from-fuchsia-950/35 via-slate-950 to-violet-950/50 ${compact ? 'aspect-[16/7]' : 'aspect-[16/10]'}`}
      >
        <ProductImagePlaceholder
          componentType={product.componentType}
          hidden={Boolean(product.imageUrl)}
        />
        {product.imageUrl ? (
          // Admin-entered remote URLs intentionally use a normal img element.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={`${product.title} product`}
            className="absolute inset-0 h-full w-full bg-slate-950/65 object-contain p-4 transition duration-500 group-hover:scale-[1.045] sm:p-5"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
            src={product.imageUrl}
          />
        ) : null}

        {product.badge !== 'None' ? (
          <span
            className={`absolute left-3 top-3 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] shadow-lg backdrop-blur ${badgeClass(product.badge)}`}
          >
            {product.badge}
          </span>
        ) : null}

        <span
          className={`absolute right-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur ${product.retailer === 'Other' ? 'border-white/10 bg-black/40 text-slate-400' : 'border-white/20 bg-black/70 text-white'}`}
        >
          {retailerLabel}
        </span>
      </div>

      <div className={`flex flex-1 flex-col ${compact ? 'p-4 sm:p-5' : 'p-5'}`}>
        {categoryLabel ? (
          <p className="theme-kicker mb-2 text-[10px] font-black uppercase tracking-[0.16em]">
            {categoryLabel}
          </p>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <Heading
            className={`${compact ? 'text-lg' : 'text-xl'} font-black leading-tight tracking-tight text-white`}
          >
            {product.title || 'Product title'}
          </Heading>
          {product.platform ? (
            <span className="shrink-0 rounded-lg bg-violet-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-violet-200">
              {product.platform}
            </span>
          ) : null}
        </div>

        <p
          className={`${compact ? 'line-clamp-2' : 'line-clamp-3'} mt-3 text-sm leading-6 text-slate-400`}
        >
          {product.shortDescription || 'View current specifications, availability, and pricing from the retailer.'}
        </p>

        <div className="mt-auto pt-5">
          <div className="mb-4 flex items-end justify-between gap-3 border-t border-white/8 pt-4">
            <span className="text-base font-black text-white">
              {product.priceText || 'Check current price'}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {product.componentType}
            </span>
          </div>

          {preview ? (
            <span className={callToActionClass}>
              {buttonText}
              <span
                aria-hidden="true"
                className="transition group-hover/cta:translate-x-0.5"
              >
                &rarr;
              </span>
            </span>
          ) : (
            <a
              className={callToActionClass}
              data-analytics-product-category={categoryLabel || product.componentType}
              data-analytics-product-name={product.title}
              href={product.affiliateUrl}
              onClick={onAction}
              rel="sponsored nofollow noopener noreferrer"
              target="_blank"
            >
              {buttonText}
              <span
                aria-hidden="true"
                className="transition group-hover/cta:translate-x-0.5"
              >
                &rarr;
              </span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductImagePlaceholder({
  componentType,
  hidden,
}: {
  componentType: string;
  hidden: boolean;
}) {
  return (
    <div
      aria-hidden={hidden}
      className="absolute inset-0 flex items-center justify-center px-6 text-center"
    >
      <div>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-fuchsia-200/15 bg-fuchsia-400/[0.07] text-fuchsia-100 shadow-inner">
          <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path
              d="M5 7.5h14v9H5zM8 4.5h8l1.5 3h-11zM8.5 19.5h7"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        </span>
        <p className="mt-3 text-xs font-bold text-slate-300">Product image unavailable</p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
          {componentType}
        </p>
      </div>
    </div>
  );
}

function getPublicButtonText(
  buttonText: string,
  retailer: AffiliateProductRecord['retailer'],
) {
  const selectedText = buttonText.trim();
  const vagueLabel = /^(?:view|see)(?:\s+\w+){0,2}\s+options?$/i.test(selectedText);

  if (selectedText && !vagueLabel) {
    return selectedText;
  }

  if (retailer !== 'Other') {
    return `View on ${retailer}`;
  }

  return 'Check Current Price';
}

function badgeClass(badge: AffiliateProductRecord['badge']) {
  if (badge === 'Best Value') return 'border-emerald-300/30 bg-emerald-400/90 text-emerald-950';
  if (badge === 'Budget Pick') return 'border-orange-300/30 bg-orange-300/90 text-orange-950';
  if (badge === 'Performance Pick') return 'border-violet-300/30 bg-violet-400/90 text-violet-950';
  if (badge === 'Premium Pick') return 'border-amber-200/30 bg-amber-300/90 text-amber-950';
  return 'border-fuchsia-300/30 bg-fuchsia-400/90 text-fuchsia-950';
}
