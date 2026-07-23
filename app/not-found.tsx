import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="public-theme flex min-h-[70vh] items-center px-4 py-16 text-slate-100 sm:px-6">
      <section className="theme-glass-strong mx-auto w-full max-w-2xl rounded-3xl p-7 text-center sm:p-10">
        <p className="theme-kicker text-xs font-black uppercase tracking-[0.2em]">Error 404</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Page not found</h1>
        <p className="mx-auto mt-4 max-w-lg leading-7 text-slate-400">
          The page may have moved or the address may be incorrect. You can return to the PC
          checker or browse the latest GTA VI guides.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="theme-primary-button rounded-xl px-5 py-3 text-sm font-black" href="/">
            Check My PC
          </Link>
          <Link className="theme-secondary-button rounded-xl px-5 py-3 text-sm font-black" href="/articles">
            Browse Articles
          </Link>
        </div>
      </section>
    </main>
  );
}
