import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Affiliate Disclosure | GTA VI PC Checker',
  description: 'How affiliate links and estimated performance recommendations are used on this site.',
};

export default function AffiliateDisclosurePage() {
  return (
    <main className="public-theme min-h-screen px-4 py-12 sm:px-6">
      <article className="theme-glass-strong mx-auto max-w-3xl rounded-2xl p-6 sm:p-9">
        <p className="theme-kicker text-xs font-black uppercase tracking-[0.2em]">Site information</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Affiliate Disclosure</h1>
        <p className="mt-4 leading-7 text-slate-300">
          This site may earn a commission when visitors purchase through links to Amazon or other retailers. Using these links does not increase the price paid by the visitor.
        </p>
        <div className="mt-7 space-y-5 text-sm leading-7 text-slate-400">
          <section>
            <h2 className="text-lg font-black text-white">How recommendations are selected</h2>
            <p className="mt-1">
              Product links are selected by compatibility-result category and entered by the site administrator. Retailer prices, ratings, reviews, and images are not scraped by this site.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-black text-white">No performance guarantee</h2>
            <p className="mt-1">
              A product recommendation is not a guarantee of game performance, availability, compatibility, price, or retailer inventory. Always verify the product and your PC before purchasing.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-black text-white">Estimated GTA VI requirements</h2>
            <p className="mt-1">
              Rockstar Games has not published official GTA VI PC requirements. The requirements used by this checker are estimates and may change when official information becomes available.
            </p>
          </section>
        </div>
        <Link href="/" className="theme-primary-button mt-8 inline-flex rounded-lg px-4 py-2.5 text-sm font-black">
          Back to PC checker
        </Link>
      </article>
    </main>
  );
}
