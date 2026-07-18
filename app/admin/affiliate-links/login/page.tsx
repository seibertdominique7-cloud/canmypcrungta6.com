import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import {
  getAdminConfigurationError,
  isAdminAuthenticated,
} from '../../../lib/admin-auth';

export const metadata: Metadata = {
  title: 'Affiliate Admin Login',
  robots: { index: false, follow: false },
};

export default async function AffiliateAdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdminAuthenticated()) {
    redirect('/admin/affiliate-links');
  }

  const { error } = await searchParams;
  const configurationError = getAdminConfigurationError();
  const message = configurationError
    ? configurationError
    : error === 'invalid'
      ? 'The password was not accepted.'
      : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/30 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
          Private admin
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Affiliate links</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Sign in with the owner password configured on the server.
        </p>

        {message ? (
          <p className="mt-5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {message}
          </p>
        ) : null}

        <form action="/api/admin/login" method="post" className="mt-6 grid gap-4">
          <input type="hidden" name="next" value="/admin/affiliate-links" />
          <label className="grid gap-2 text-sm font-bold text-slate-200">
            Admin password
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              disabled={Boolean(configurationError)}
              className="rounded-lg border border-slate-700 bg-slate-950/70 px-4 py-3 font-normal text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-50"
            />
          </label>
          <button
            type="submit"
            disabled={Boolean(configurationError)}
            className="rounded-lg bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
