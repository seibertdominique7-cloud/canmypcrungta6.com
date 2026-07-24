import type { Metadata } from 'next';
import Link from 'next/link';

import { CreatorSetupBuilder } from '../components/CreatorSetupBuilder';
import { getCreatorSetupCatalog } from '../lib/creator-setup-data';
import { publicPageMetadata } from '../lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = publicPageMetadata({
  title: 'GTA VI Streaming Setup Builder',
  description:
    'Build a practical GTA VI streaming and recording setup using your budget, goals, existing gear, and enabled products from our creator catalog.',
  path: '/creator-setup-builder',
});

export default async function CreatorSetupBuilderPage() {
  const products = await getCreatorSetupCatalog();

  return (
    <div className="public-theme min-h-screen text-slate-100">
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav aria-label="Creator setup navigation" className="flex flex-wrap gap-4 text-sm">
          <Link className="theme-link font-semibold" href="/">
            PC Compatibility Checker
          </Link>
          <Link className="theme-link font-semibold" href="/creator-setup-guide">
            Creator Setup Guide
          </Link>
        </nav>

        <header className="mb-9 mt-8 max-w-4xl">
          <p className="theme-kicker text-xs font-black uppercase tracking-[0.2em]">
            Guided creator setup
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Build My GTA VI Streaming Setup
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
            Answer four quick questions. We will organize enabled products from the existing
            Affiliate Products library into essential, next, and future upgrades.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            This planner uses product value tiers as a budget guide. It does not guarantee
            retailer pricing, audience growth, revenue, or streaming performance.
          </p>
        </header>

        <CreatorSetupBuilder products={products} />
      </main>
    </div>
  );
}
