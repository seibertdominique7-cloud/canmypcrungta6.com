'use client';

export default function MerchError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="public-theme flex min-h-[70vh] items-center px-4 py-12 text-slate-100 sm:px-6">
      <section className="theme-glass-strong mx-auto w-full max-w-xl rounded-3xl p-7 text-center sm:p-10">
        <p className="theme-kicker text-xs font-black uppercase tracking-[0.2em]">
          Store connection
        </p>
        <h1 className="mt-3 text-3xl font-black">Merch is temporarily unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          We could not load the live Fourthwall catalog. Your PC checker and the rest of
          the site are still available.
        </p>
        <button
          className="theme-primary-button mt-6 rounded-xl px-5 py-3 text-sm font-black"
          onClick={reset}
          type="button"
        >
          Try Again
        </button>
      </section>
    </main>
  );
}
