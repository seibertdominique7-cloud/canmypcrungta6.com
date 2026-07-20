import Link from 'next/link';

import { AdminHeader } from '../components/admin/AdminHeader';
import { getAdminAdSummary } from '../lib/ad-data';
import { requireAdminPage } from '../lib/admin-auth';
import { getCmsSummary } from '../lib/cms-data';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAdminPage();
  const [summary, ads] = await Promise.all([getCmsSummary(), getAdminAdSummary()]);

  return (
    <main className="admin-theme min-h-screen px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <AdminHeader active="dashboard" />
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h1 className="text-3xl font-black">Admin Dashboard</h1>
          <p className="mt-2 text-slate-400">Manage compatibility recommendations, subscribers, published content, and monetization.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(summary).map(([label, value]) => (
              <article className="rounded-2xl border border-white/10 bg-black/20 p-4" key={label}>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">{label.replace(/([A-Z])/g, ' $1')}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
              </article>
            ))}
            <article className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:col-span-2 lg:col-span-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-violet-300">Ads</p>
                  <h2 className="mt-1 text-xl font-black">Advertising summary</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-black ${ads.masterEnabled ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-slate-500/30 bg-slate-900 text-slate-400'}`}>
                  Master {ads.masterEnabled ? 'enabled' : 'disabled'}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-4">
                <DashboardMetric label="Enabled placements" value={ads.enabledPlacements} />
                <DashboardMetric label="Total placements" value={ads.totalPlacements} />
                <DashboardMetric label="Valid AdSense" value={ads.validAdsensePlacements} />
                <DashboardMetric label="Incomplete or invalid" value={ads.incompletePlacements} />
              </dl>
              <Link className="mt-4 inline-flex rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-400" href="/admin/ads">
                Manage Ads
              </Link>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-2xl font-black">{value}</dd></div>;
}
