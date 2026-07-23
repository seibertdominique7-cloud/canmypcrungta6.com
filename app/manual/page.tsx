import type { Metadata } from 'next';
import Link from 'next/link';

import { ManualEntryWorkflow } from '../components/ManualEntryWorkflow';
import { publicPageMetadata } from '../lib/seo';

export const metadata: Metadata = publicPageMetadata({
  title: 'Manual GTA VI PC Compatibility Check',
  description: 'Enter your CPU, GPU, RAM, storage, and Windows version to check estimated GTA VI PC compatibility.',
  path: '/manual',
});

export default function ManualEntryPage() {
  return (
    <div className="public-theme min-h-screen">
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 text-sm text-slate-400">
          <Link href="/" className="theme-link font-semibold">
            Back to screenshot upload
          </Link>
        </div>

        <header className="mb-10 flex flex-col items-center text-center sm:mb-12">
          <p className="theme-kicker text-xs font-bold uppercase tracking-[0.22em]">
            Manual compatibility check
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            Can My PC Run
            <br />
            <span className="theme-accent-text">
              GTA VI?
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Enter your hardware directly and get the same pass/fail result page used by the
            screenshot analyzer.
          </p>
        </header>

        <ManualEntryWorkflow />
      </main>
    </div>
  );
}
