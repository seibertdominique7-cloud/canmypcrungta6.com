import Link from 'next/link';

import type { FourthwallProduct } from '../../lib/fourthwall-types';
import { FourthwallProductCard } from './FourthwallProductCard';

export function HomepageFourthwallMerch({
  products,
}: {
  products: FourthwallProduct[];
}) {
  if (!products.length) return null;

  return (
    <section
      aria-labelledby="homepage-fourthwall-title"
      className="my-10 w-full max-w-5xl sm:my-14"
    >
      <div className="text-center">
        <p className="theme-kicker text-xs font-black uppercase tracking-[0.2em]">
          Official CanMyPCRunGTA6 merchandise
        </p>
        <h2
          className="mt-2 text-balance text-3xl font-black text-white sm:text-4xl"
          id="homepage-fourthwall-title"
        >
          Launch Day Gear
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
          Gear up for launch day with products fulfilled securely by Fourthwall.
        </p>
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.slice(0, 3).map((product, index) => (
          <FourthwallProductCard
            imagePriority={index === 0}
            key={product.id}
            product={product}
          />
        ))}
      </div>
      <div className="mt-6 text-center">
        <Link
          className="theme-secondary-button inline-flex rounded-xl px-5 py-3 text-sm font-black"
          href="/merch"
        >
          Shop All Launch Day Gear
        </Link>
      </div>
    </section>
  );
}
