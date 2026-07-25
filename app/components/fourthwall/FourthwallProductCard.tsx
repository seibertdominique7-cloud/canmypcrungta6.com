/* eslint-disable @next/next/no-img-element -- Product images are returned at runtime by Fourthwall. */

import Link from 'next/link';

import type { FourthwallProduct } from '../../lib/fourthwall-types';
import {
  formatFourthwallMoney,
  getFourthwallImageUrl,
  getFourthwallProductColors,
  getFourthwallStartingPrice,
} from '../../lib/fourthwall-types';

export function FourthwallProductCard({
  product,
  imagePriority = false,
}: {
  product: FourthwallProduct;
  imagePriority?: boolean;
}) {
  const image = getFourthwallImageUrl(product.images[0] ?? product.variants[0]?.images[0]);
  const startingPrice = getFourthwallStartingPrice(product);
  const colors = getFourthwallProductColors(product);

  return (
    <article className="theme-glass-card group flex h-full min-w-0 flex-col overflow-hidden rounded-3xl">
      <Link
        aria-label={`View ${product.name}`}
        className="relative flex aspect-square items-center justify-center overflow-hidden bg-slate-950/45 p-4"
        href={`/merch/${product.slug}`}
      >
        {image ? (
          <img
            alt={`${product.name} product preview`}
            className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.045]"
            decoding="async"
            fetchPriority={imagePriority ? 'high' : 'auto'}
            loading={imagePriority ? 'eager' : 'lazy'}
            src={image}
          />
        ) : (
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-400">
            View product
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-black leading-6 text-white">
          <Link href={`/merch/${product.slug}`}>{product.name}</Link>
        </h2>
        <p className="mt-2 text-sm font-black text-pink-200">
          {startingPrice ? `From ${formatFourthwallMoney(startingPrice)}` : 'Price at checkout'}
        </p>
        {colors.length ? (
          <div className="mt-3 flex items-center gap-2" aria-label="Available colors">
            <span className="text-xs text-slate-500">Colors</span>
            <div className="flex -space-x-1">
              {colors.slice(0, 5).map((color) => (
                <span
                  aria-label={color.name}
                  className="size-5 rounded-full border-2 border-[#111a33] shadow-sm"
                  key={color.name}
                  style={{ backgroundColor: safeSwatch(color.swatch) }}
                  title={color.name}
                />
              ))}
            </div>
            {colors.length > 5 ? (
              <span className="text-xs text-slate-500">+{colors.length - 5}</span>
            ) : null}
          </div>
        ) : null}
        <Link
          className="theme-primary-button mt-auto rounded-xl px-4 py-2.5 text-center text-sm font-black"
          href={`/merch/${product.slug}`}
        >
          View Product
        </Link>
      </div>
    </article>
  );
}

function safeSwatch(value?: string | null) {
  return value && /^#[0-9a-f]{3,8}$/i.test(value) ? value : '#94a3b8';
}
