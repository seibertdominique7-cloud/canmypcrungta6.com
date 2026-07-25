import type { Metadata } from 'next';

import { FourthwallProductCard } from '../components/fourthwall/FourthwallProductCard';
import { getFourthwallProducts } from '../lib/fourthwall';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Launch Day Gear | CanMyPCRunGTA6',
  description:
    'Shop official CanMyPCRunGTA6 launch day merchandise, securely fulfilled by Fourthwall.',
  alternates: { canonical: '/merch' },
  openGraph: {
    title: 'Launch Day Gear | CanMyPCRunGTA6',
    description:
      'Shop official CanMyPCRunGTA6 launch day merchandise, securely fulfilled by Fourthwall.',
    type: 'website',
    url: '/merch',
  },
  twitter: {
    card: 'summary',
    title: 'Launch Day Gear | CanMyPCRunGTA6',
    description: 'Official launch day merchandise fulfilled by Fourthwall.',
  },
};

export default async function MerchPage() {
  const products = await getFourthwallProducts();

  return (
    <main className="public-theme min-h-screen px-4 py-10 text-slate-100 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="mx-auto max-w-3xl text-center">
          <p className="theme-kicker text-xs font-black uppercase tracking-[0.22em]">
            Official CanMyPCRunGTA6 merchandise
          </p>
          <h1 className="mt-3 text-balance text-4xl font-black sm:text-6xl">
            Launch Day Gear
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Live products, prices, options, and availability from our Fourthwall store.
          </p>
        </header>

        {products.length ? (
          <section
            aria-label="Available merchandise"
            className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {products.map((product, index) => (
              <FourthwallProductCard
                imagePriority={index < 2}
                key={product.id}
                product={product}
              />
            ))}
          </section>
        ) : (
          <section className="theme-glass-card mx-auto mt-9 max-w-2xl rounded-3xl p-8 text-center">
            <h2 className="text-2xl font-black text-white">New gear is on the way</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              No published Fourthwall products are available right now. Please check back soon.
            </p>
          </section>
        )}

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-5 text-slate-500">
          Products are sold, fulfilled, and supported by Fourthwall. Final pricing,
          availability, shipping, and taxes are confirmed at checkout.
        </p>
      </div>
    </main>
  );
}
