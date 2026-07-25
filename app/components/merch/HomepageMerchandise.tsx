import type {
  MerchandiseProductRecord,
  MerchStoreSettings,
} from '../../lib/merch-types';
import { MerchProductCard } from './MerchProductCard';
import { MerchandiseCta } from './MerchandiseCta';

export function HomepageMerchandise({
  products,
  settings,
}: {
  products: MerchandiseProductRecord[];
  settings: MerchStoreSettings;
}) {
  if (!products.length) return null;
  const ctaUrl = settings.homepageCtaUrl || settings.storeUrl;
  return (
    <section className="my-10 w-full max-w-5xl sm:my-14" aria-labelledby="homepage-merch-title">
      <div className="text-center">
        <p className="theme-kicker text-xs font-black uppercase tracking-[0.2em]">
          Official CanMyPCRunGTA6 merchandise
        </p>
        <h2 className="mt-2 text-balance text-3xl font-black text-white sm:text-4xl" id="homepage-merch-title">
          {settings.homepageTitle}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
          {settings.homepageDescription}
        </p>
      </div>
      <div className={`mt-6 grid gap-5 ${products.length === 1 ? 'mx-auto max-w-md' : products.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        {products.map((product) => (
          <MerchProductCard
            key={product.id}
            openInNewTab={settings.openLinksInNewTab}
            placement="homepage"
            product={product}
          />
        ))}
      </div>
      <div className="mt-6">
        <MerchandiseCta
          buttonLabel={settings.homepageCtaLabel}
          compact
          description={settings.homepageDescription}
          heading="See the full collection"
          href={ctaUrl}
          openInNewTab={settings.openLinksInNewTab}
          placement="homepage"
        />
      </div>
      <p className="mt-4 text-center text-xs leading-5 text-slate-500">
        {settings.disclaimerText}
      </p>
    </section>
  );
}
