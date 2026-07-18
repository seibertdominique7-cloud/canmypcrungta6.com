import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms | GTA VI PC Checker',
  description: 'Terms of use for the GTA VI PC Checker.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12 text-white sm:px-6">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-2xl sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Site information</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Terms</h1>
        <div className="mt-6 space-y-5 text-sm leading-7 text-slate-300">
          <p>The compatibility checker and product recommendations are provided for general informational purposes. GTA VI PC requirements are estimates until Rockstar Games publishes official requirements.</p>
          <p>Compatibility results do not guarantee performance. Verify component compatibility, retailer details, availability, pricing, and return policies before purchasing.</p>
          <p>External retailer links are governed by the retailer’s own terms. This site may receive a commission from qualifying purchases without increasing the visitor’s price.</p>
        </div>
        <Link href="/" className="mt-8 inline-flex rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-emerald-400">Back to PC checker</Link>
      </article>
    </main>
  );
}
