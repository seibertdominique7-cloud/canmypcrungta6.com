import Link from 'next/link';

import { FOOTER_GROUPS, type FooterGroup } from '../data/required-pages';
import { getFooterPages, getSiteContentMap } from '../lib/cms-data';

interface FooterLink {
  href: string;
  label: string;
  order: number;
}

export async function SiteFooter() {
  const [content, pages] = await Promise.all([getSiteContentMap(), getFooterPages()]);
  const groups = new Map<FooterGroup, FooterLink[]>(FOOTER_GROUPS.map((group) => [group, []]));

  groups.get('Resources')?.push(
    { href: '/', label: content.navigation_checker_label || 'PC Checker', order: 10 },
    { href: '/articles', label: content.navigation_articles_label || 'Articles', order: 20 },
  );
  groups.get('Legal')?.push({ href: '/affiliate-disclosure', label: 'Affiliate Disclosure', order: 40 });

  for (const page of pages) {
    const group = FOOTER_GROUPS.includes(page.footerGroup as FooterGroup)
      ? page.footerGroup as FooterGroup
      : 'Resources';
    groups.get(group)?.push({
      href: page.requiredPageKey ? `/${page.requiredPageKey}` : `/pages/${page.slug}`,
      label: page.footerLabel || page.title,
      order: page.footerOrder,
    });
  }

  return (
    <footer className="relative z-10 w-full border-t border-violet-300/15 bg-[#050a19]/95 px-4 py-9 text-sm text-slate-400 backdrop-blur-xl sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]">
        <div>
          <Link className="text-base font-black text-white" href="/">CanMyPCRunGTA6</Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
            {content.footer_text || 'Understand estimated GTA VI hardware requirements with one quick compatibility check.'}
          </p>
          <p className="mt-5 text-xs text-slate-600">Independent compatibility guidance. Not affiliated with Rockstar Games.</p>
        </div>
        <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
          {FOOTER_GROUPS.map((group) => {
            const links = (groups.get(group) ?? []).sort((left, right) => left.order - right.order || left.label.localeCompare(right.label));
            if (!links.length) return null;
            return <section key={group}><h2 className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">{group}</h2><ul className="mt-3 grid gap-2.5">{links.map((link) => <li key={`${group}-${link.href}`}><Link className="theme-link leading-5" href={link.href}>{link.label}</Link></li>)}</ul></section>;
          })}
        </nav>
      </div>
      <div className="mx-auto mt-8 max-w-6xl border-t border-white/10 pt-5 text-xs text-slate-600">
        © {new Date().getFullYear()} CanMyPCRunGTA6. All rights reserved.
      </div>
    </footer>
  );
}
