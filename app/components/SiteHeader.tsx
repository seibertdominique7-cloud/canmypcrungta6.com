import Link from 'next/link';

import type { MerchStoreSettings } from '../lib/merch-types';
import { getNavigationPages, getSiteContentMap } from '../lib/cms-data';
import { isPublicMerchStore } from '../lib/merch-validation';
import { TrackedMerchLink } from './merch/TrackedMerchLink';

export async function SiteHeader({
  fourthwallEnabled,
  merchSettings,
}: {
  fourthwallEnabled: boolean;
  merchSettings: MerchStoreSettings;
}) {
  const [pages, content] = await Promise.all([getNavigationPages(), getSiteContentMap()]);
  const links = [
    { href: '/', label: content.navigation_checker_label || 'PC Checker', merchandise: false },
    { href: '/articles', label: content.navigation_articles_label || 'Articles', merchandise: false },
    ...pages.map((page) => ({
      href: page.requiredPageKey ? `/${page.requiredPageKey}` : `/pages/${page.slug}`,
      label: page.navigationLabel || page.title,
      merchandise: false,
    })),
    ...(fourthwallEnabled
      ? [{ href: '/merch', label: 'Merch', merchandise: true }]
      : isPublicMerchStore(merchSettings)
        ? [{ href: '/store', label: merchSettings.navigationLabel, merchandise: true }]
        : []),
  ].filter(
    (link, index, all) => all.findIndex((item) => item.href === link.href) === index,
  );

  return (
    <header className="relative z-30 border-b border-white/10 bg-[#050a19]/90 px-4 py-3 text-slate-100 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link className="font-black text-white" href="/">CanMyPCRunGTA6</Link>
        <nav aria-label="Primary" className="hidden items-center gap-5 text-sm text-slate-300 md:flex">
          {links.map((link) => (
            link.merchandise
              ? <TrackedMerchLink className="theme-link" event="merch_store_link_clicked" eventDetail={{ placement: 'desktop-navigation' }} href={link.href} key={link.href}>{link.label}</TrackedMerchLink>
              : <Link className="theme-link" href={link.href} key={link.href}>{link.label}</Link>
          ))}
        </nav>
        <details className="relative md:hidden">
          <summary className="theme-secondary-button cursor-pointer list-none rounded-xl px-3 py-2 text-xs font-black">
            Menu
          </summary>
          <nav
            aria-label="Mobile primary"
            className="absolute right-0 top-12 grid min-w-52 gap-1 rounded-2xl border border-white/15 bg-[#0a1023] p-2 shadow-2xl"
          >
            {links.map((link) => (
              link.merchandise
                ? <TrackedMerchLink className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10" event="merch_store_link_clicked" eventDetail={{ placement: 'mobile-navigation' }} href={link.href} key={link.href}>{link.label}</TrackedMerchLink>
                : <Link className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10" href={link.href} key={link.href}>{link.label}</Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
