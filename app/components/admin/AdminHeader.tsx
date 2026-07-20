export type AdminSection = 'dashboard' | 'recommendations' | 'products' | 'subscribers' | 'articles' | 'pages' | 'categories' | 'tags' | 'media' | 'site-content' | 'redirects' | 'settings';

const links: Array<{ href: string; label: string; section: AdminSection; group: 'Core' | 'Content' | 'System' }> = [
  { href: '/admin', label: 'Dashboard', section: 'dashboard', group: 'Core' },
  { href: '/admin/recommendations', label: 'Recommendations', section: 'recommendations', group: 'Core' },
  { href: '/admin/products', label: 'Affiliate Products', section: 'products', group: 'Core' },
  { href: '/admin/subscribers', label: 'Subscribers', section: 'subscribers', group: 'Core' },
  { href: '/admin/articles', label: 'Articles', section: 'articles', group: 'Content' },
  { href: '/admin/pages', label: 'Pages', section: 'pages', group: 'Content' },
  { href: '/admin/categories', label: 'Categories', section: 'categories', group: 'Content' },
  { href: '/admin/tags', label: 'Tags', section: 'tags', group: 'Content' },
  { href: '/admin/media', label: 'Media', section: 'media', group: 'Content' },
  { href: '/admin/site-content', label: 'Site Content', section: 'site-content', group: 'Content' },
  { href: '/admin/redirects', label: 'Redirects', section: 'redirects', group: 'System' },
  { href: '/admin/settings', label: 'Settings', section: 'settings', group: 'System' },
];

export function AdminHeader({ active }: { active: AdminSection }) {
  return (
    <header className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">Private admin</p><p className="mt-1 font-black">CanMyPCRunGTA6</p></div>
        <form action="/api/admin/logout" method="post"><button className={navClass(false)} type="submit">Log out</button></form>
      </div>
      <nav aria-label="Admin navigation" className="mt-4 grid gap-3">
        {(['Core', 'Content', 'System'] as const).map((group) => <div className="flex flex-wrap items-center gap-2" key={group}><span className="w-14 text-[10px] font-black uppercase tracking-wider text-slate-600">{group}</span>{links.filter((link) => link.group === group).map((link) => <a aria-current={active === link.section ? 'page' : undefined} className={navClass(active === link.section)} href={link.href} key={link.section}>{link.label}</a>)}</div>)}
      </nav>
    </header>
  );
}

function navClass(active: boolean) { return `rounded-xl border px-3 py-2 text-xs font-bold transition ${active ? 'border-violet-400/50 bg-violet-500 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`; }

