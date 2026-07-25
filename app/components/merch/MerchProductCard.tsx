/* eslint-disable @next/next/no-img-element -- Fourthwall product images use administrator-managed runtime hosts. */
'use client';

import { useState } from 'react';

import type { MerchandiseProductRecord } from '../../lib/merch-types';
import { merchExternalLinkProps } from '../../lib/merch-types';
import { trackMerchEvent } from '../../lib/merch-analytics';

export function MerchProductCard({
  product,
  openInNewTab,
  placement,
}: {
  product: MerchandiseProductRecord;
  openInNewTab: boolean;
  placement: 'homepage' | 'store' | 'article';
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const external = merchExternalLinkProps(openInNewTab);
  return (
    <article className="theme-glass-card group flex h-full min-w-0 flex-col overflow-hidden rounded-3xl">
      <a
        aria-label={`View ${product.title}`}
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-slate-950/45 p-4"
        href={product.productUrl}
        onClick={() =>
          trackMerchEvent('merch_product_clicked', {
            productId: product.id,
            productType: product.productType,
            placement,
          })
        }
        {...external}
      >
        {!imageFailed && product.imageUrl ? (
          <img
            alt={`${product.title} merchandise`}
            className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.04]"
            loading="lazy"
            onError={() => setImageFailed(true)}
            src={product.imageUrl}
          />
        ) : (
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-400">
            View product
          </span>
        )}
      </a>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-violet-300/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-violet-200">
            {product.productType}
          </span>
          {product.badge ? (
            <span className="rounded-full border border-pink-300/20 bg-pink-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-pink-200">
              {product.badge}
            </span>
          ) : null}
        </div>
        <h3 className="mt-3 text-lg font-black leading-6 text-white">{product.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">
          {product.shortDescription}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="text-sm font-black text-slate-200">{product.priceText}</span>
          <a
            className="theme-primary-button rounded-xl px-4 py-2.5 text-center text-xs font-black"
            href={product.productUrl}
            onClick={() =>
              trackMerchEvent('merch_product_clicked', {
                productId: product.id,
                productType: product.productType,
                placement,
              })
            }
            {...external}
          >
            View on Fourthwall
          </a>
        </div>
      </div>
    </article>
  );
}
