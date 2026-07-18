import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="relative z-10 w-full border-t border-slate-800 bg-slate-950 px-4 py-6 text-center text-sm text-slate-400">
      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>Made for gaming enthusiasts</span>
        <span aria-hidden="true">•</span>
        <span>Stay tuned for GTA VI</span>
        <span aria-hidden="true">•</span>
        <Link href="/affiliate-disclosure" className="font-semibold text-cyan-300 hover:text-cyan-200">
          Affiliate Disclosure
        </Link>
        <span aria-hidden="true">•</span>
        <Link href="/privacy" className="font-semibold text-cyan-300 hover:text-cyan-200">
          Privacy
        </Link>
        <span aria-hidden="true">•</span>
        <Link href="/terms" className="font-semibold text-cyan-300 hover:text-cyan-200">
          Terms
        </Link>
      </p>
    </footer>
  );
}
