import Link from 'next/link';

export default function MerchNotFound() {
  return (
    <main className="public-theme flex min-h-[70vh] items-center px-4 py-12 text-slate-100 sm:px-6">
      <section className="theme-glass-card mx-auto w-full max-w-xl rounded-3xl p-7 text-center sm:p-10">
        <p className="theme-kicker text-xs font-black uppercase tracking-[0.2em]">
          Launch Day Gear
        </p>
        <h1 className="mt-3 text-3xl font-black">Product unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          This product may have been unpublished or moved in Fourthwall.
        </p>
        <Link
          className="theme-primary-button mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-black"
          href="/merch"
        >
          Browse Available Gear
        </Link>
      </section>
    </main>
  );
}
