import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="relative z-10 w-full border-t border-violet-300/15 bg-[#050a19]/95 px-4 py-6 text-center text-sm text-slate-400 backdrop-blur-xl">
      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>Made for gaming enthusiasts</span>
        <span aria-hidden="true">•</span>
        <span>Stay tuned for GTA VI</span>
        <span aria-hidden="true">•</span>
        <Link href="/affiliate-disclosure" className="theme-link font-semibold">
          Affiliate Disclosure
        </Link>
        <span aria-hidden="true">•</span>
        <Link href="/privacy" className="theme-link font-semibold">
          Privacy
        </Link>
        <span aria-hidden="true">•</span>
        <Link href="/terms" className="theme-link font-semibold">
          Terms
        </Link>
      </p>
    </footer>
  );
}
