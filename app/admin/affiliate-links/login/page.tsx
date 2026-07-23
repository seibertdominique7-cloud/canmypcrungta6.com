import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import {
  getAdminConfigurationError,
  isAdminAuthenticated,
} from '../../../lib/admin-auth';

export const metadata: Metadata = {
  title: 'Private Admin Login',
  robots: { index: false, follow: false },
};

export default async function AffiliateAdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdminAuthenticated()) {
    redirect('/admin');
  }

  const { error } = await searchParams;
  const configurationError = getAdminConfigurationError();
  const message = configurationError
    ? configurationError
    : error === 'invalid'
      ? 'The password was not accepted.'
      : error === 'rate-limit'
        ? 'Too many sign-in attempts. Wait a few minutes and try again.'
      : null;

  return (
    <main className="admin-theme flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-md rounded-2xl border border-violet-300/15 bg-slate-950/70 p-6 shadow-2xl shadow-violet-950/25 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
          Private admin
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Site administration</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Sign in with the owner password configured on the server.
        </p>

        {message ? (
          <p className="mt-5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {message}
          </p>
        ) : null}

        <form action="/api/admin/login" method="post" className="mt-6 grid gap-4">
          <input type="hidden" name="next" value="/admin" />
          <label className="grid gap-2 text-sm font-bold text-slate-200">
            Admin password
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="theme-input rounded-lg px-4 py-3 font-normal"
            />
          </label>
          <button
            type="submit"
            disabled={Boolean(configurationError)}
            className="rounded-lg bg-violet-500 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-slate-600"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
