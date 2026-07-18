import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms | GTA VI PC Checker',
  description: 'Terms of use for the GTA VI PC Checker.',
};

export default function TermsPage() {
  return (
    <main className="public-theme min-h-screen px-4 py-12 sm:px-6">
      <article className="theme-glass-strong mx-auto max-w-3xl rounded-2xl p-6 sm:p-9">
        <p className="theme-kicker text-xs font-black uppercase tracking-[0.2em]">Site information</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Terms</h1>
        <div className="mt-6 space-y-5 text-sm leading-7 text-slate-300">
          <p>The compatibility checker and product recommendations are provided for general informational purposes. GTA VI PC requirements are estimates until Rockstar Games publishes official requirements.</p>
          <p>Compatibility results do not guarantee performance. Verify component compatibility, retailer details, availability, pricing, and return policies before purchasing.</p>
          <p>External retailer links are governed by the retailer’s own terms. This site may receive a commission from qualifying purchases without increasing the visitor’s price.</p>
        </div>
        <Link href="/" className="theme-primary-button mt-8 inline-flex rounded-lg px-4 py-2.5 text-sm font-black">Back to PC checker</Link>
      </article>
    </main>
  );
}
