import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { MerchProductCard } from '../components/merch/MerchProductCard';
import { MerchandiseCta } from '../components/merch/MerchandiseCta';
import { getStoreMerchandise } from '../lib/merch-data';
import { isPublicMerchStore } from '../lib/merch-validation';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getStoreMerchandise();
  if (!isPublicMerchStore(settings)) {
    return {
      title: 'Store unavailable',
      robots: { index: false, follow: false },
    };
  }
  const title = `${settings.homepageTitle} | CanMyPCRunGTA6`;
  const description = settings.homepageDescription;
  return {
    title,
    description,
    alternates: { canonical: '/store' },
    openGraph: {
      title,
      description,
      type: 'website',
      url: '/store',
      images: settings.storeOpenGraphImage ? [settings.storeOpenGraphImage] : undefined,
    },
    twitter: {
      card: settings.storeOpenGraphImage ? 'summary_large_image' : 'summary',
      title,
      description,
      images: settings.storeOpenGraphImage ? [settings.storeOpenGraphImage] : undefined,
    },
  };
}

export default async function StorePage() {
  const { settings, products } = await getStoreMerchandise();
  if (!isPublicMerchStore(settings)) notFound();

  return (
    <main className="public-theme min-h-screen px-4 py-10 text-slate-100 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="mx-auto max-w-3xl text-center">
          <p className="theme-kicker text-xs font-black uppercase tracking-[0.22em]">
            CanMyPCRunGTA6 Store
          </p>
          <h1 className="mt-3 text-balance text-4xl font-black sm:text-6xl">
            {settings.homepageTitle}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            {settings.homepageDescription}
          </p>
        </header>

        {products.length ? (
          <section className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <MerchProductCard
                key={product.id}
                openInNewTab={settings.openLinksInNewTab}
                placement="store"
                product={product}
              />
            ))}
          </section>
        ) : (
          <section className="theme-glass-card mx-auto mt-9 max-w-2xl rounded-3xl p-8 text-center">
            <h2 className="text-2xl font-black text-white">The collection is being prepared</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              No individual products are published here yet. Visit the Fourthwall storefront
              for the latest available gear.
            </p>
          </section>
        )}

        <div className="mt-8">
          <MerchandiseCta
            buttonLabel={settings.homepageCtaLabel}
            compact
            description="Purchases, shipping, and returns are completed securely on Fourthwall."
            heading="Visit the Fourthwall storefront"
            href={settings.storeUrl}
            openInNewTab={settings.openLinksInNewTab}
            placement="store"
          />
        </div>
        <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-5 text-slate-500">
          {settings.disclaimerText}
        </p>
      </div>
    </main>
  );
}
