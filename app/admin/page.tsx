import { AdminHeader } from '../components/admin/AdminHeader';
import { requireAdminPage } from '../lib/admin-auth';
import { getCmsSummary } from '../lib/cms-data';

export const dynamic = 'force-dynamic';
export default async function AdminPage() { await requireAdminPage(); const summary = await getCmsSummary(); return <main className="admin-theme min-h-screen px-4 py-8 text-slate-100"><div className="mx-auto max-w-6xl"><AdminHeader active="dashboard" /><section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><h1 className="text-3xl font-black">Admin Dashboard</h1><p className="mt-2 text-slate-400">Manage compatibility recommendations, subscribers, and published content.</p><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(summary).map(([label, value]) => <article className="rounded-2xl border border-white/10 bg-black/20 p-4" key={label}><p className="text-xs font-black uppercase tracking-wider text-slate-500">{label.replace(/([A-Z])/g, ' $1')}</p><p className="mt-2 text-3xl font-black">{value}</p></article>)}</div></section></div></main>; }
