import Link from 'next/link';
import { getNavigationPages, getSiteContentMap } from '../lib/cms-data';

export async function SiteFooter() {
  const [content, pages] = await Promise.all([getSiteContentMap(), getNavigationPages()]);
  return (
    <footer className="relative z-10 w-full border-t border-violet-300/15 bg-[#050a19]/95 px-4 py-6 text-center text-sm text-slate-400 backdrop-blur-xl">
      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>{content.footer_text || 'Made for gaming enthusiasts'}</span>
        <span aria-hidden="true">•</span>
        <Link href="/articles" className="theme-link font-semibold">{content.navigation_articles_label || 'Articles'}</Link>
        {pages.map((page) => <span className="contents" key={page.slug}><span aria-hidden="true">•</span><Link href={`/pages/${page.slug}`} className="theme-link font-semibold">{page.navigationLabel || page.title}</Link></span>)}
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
