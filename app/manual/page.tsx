import Link from 'next/link';

import { ManualEntryWorkflow } from '../components/ManualEntryWorkflow';

export default function ManualEntryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-900/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-900/20 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 text-sm text-slate-400">
          <Link href="/" className="font-semibold text-cyan-300 transition hover:text-cyan-200">
            Back to screenshot upload
          </Link>
        </div>

        <header className="mb-10 flex flex-col items-center text-center sm:mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300/80">
            Manual compatibility check
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            Can My PC Run
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
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
