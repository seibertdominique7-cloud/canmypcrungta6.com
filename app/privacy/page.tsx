import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy | GTA VI PC Checker',
  description: 'Privacy information for the GTA VI PC Checker.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12 text-white sm:px-6">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-2xl sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Site information</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Privacy</h1>
        <div className="mt-6 space-y-5 text-sm leading-7 text-slate-300">
          <p>Hardware details entered into the checker are used to produce the compatibility result shown in your browser. Do not upload screenshots containing personal or account information.</p>
          <p>The private administration area uses a secure session cookie to keep the owner signed in. Affiliate retailers may apply their own privacy and tracking policies after you follow an external link.</p>
          <p>This page should be updated if analytics, advertising, account systems, or additional data collection are introduced.</p>
        </div>
        <Link href="/" className="mt-8 inline-flex rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-emerald-400">Back to PC checker</Link>
      </article>
    </main>
  );
}
