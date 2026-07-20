'use client';

import { type FormEvent, useState } from 'react';

import { CORE_RECOMMENDATION_SCENARIOS } from '../../data/recommendation-scenarios';
import {
  EMAIL_SIGNUP_SOURCES,
  EMAIL_SUBSCRIBER_STATUSES,
  type EmailSubscriberRecord,
  type SubscriberAdminFilters,
  type SubscriberAdminPayload,
} from '../../lib/subscriber-types';
import { AdminHeader } from './AdminHeader';

const initialFilters: SubscriberAdminFilters = {
  search: '',
  status: 'all',
  gtaUpdatesConsent: 'all',
  marketingConsent: 'all',
  scenario: 'all',
  signupSource: 'all',
  sort: 'newest',
};

export function SubscriberAdminDashboard({
  initialPayload,
}: {
  initialPayload: SubscriberAdminPayload;
}) {
  const [payload, setPayload] = useState(initialPayload);
  const [filters, setFilters] = useState<SubscriberAdminFilters>(initialFilters);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadSubscribers = async (nextFilters = filters) => {
    setBusy(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/subscribers?${toSearchParams(nextFilters)}`, {
        cache: 'no-store',
      });
      const nextPayload = (await response.json()) as SubscriberAdminPayload & { error?: string };
      if (!response.ok) throw new Error(nextPayload.error || 'Could not load subscribers.');
      setPayload(nextPayload);
      return true;
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Could not load subscribers.',
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const applyFilters = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice('');
    await loadSubscribers();
  };

  const resetFilters = async () => {
    setFilters(initialFilters);
    setNotice('');
    await loadSubscribers(initialFilters);
  };

  const changeStatus = async (
    subscriber: EmailSubscriberRecord,
    action: 'unsubscribe' | 'reactivate',
  ) => {
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/admin/subscribers/${subscriber.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Could not update subscriber.');
      setNotice(action === 'reactivate' ? 'Subscriber reactivated.' : 'Subscriber unsubscribed.');
      await loadSubscribers();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Could not update subscriber.',
      );
      setBusy(false);
    }
  };

  const removeSubscriber = async (subscriber: EmailSubscriberRecord) => {
    if (!window.confirm(`Permanently delete ${subscriber.email}?`)) return;

    setBusy(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`/api/admin/subscribers/${subscriber.id}`, {
        method: 'DELETE',
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Could not delete subscriber.');
      setNotice('Subscriber deleted.');
      await loadSubscribers();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Could not delete subscriber.',
      );
      setBusy(false);
    }
  };

  const summary = payload.summary;
  const scenarioMetrics = ['FAIL_GPU', 'FAIL_RAM', 'PASS_MINIMUM', 'PASS_RECOMMENDED'] as const;

  return (
    <main className="admin-theme min-h-screen px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <AdminHeader active="subscribers" />
        <header className="mb-6"><h1 className="text-3xl font-black">Email Subscribers</h1><p className="mt-2 text-sm text-slate-400">Review consent, compatibility segments, signup sources, and subscriber status.</p></header>

        <section aria-label="Subscriber summary" className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetric label="Active" value={summary.totalActive} />
          <AdminMetric label="GTA updates" value={summary.gtaUpdatesSubscribers} />
          <AdminMetric label="Marketing" value={summary.marketingSubscribers} />
          <AdminMetric label="Unsubscribed" value={summary.unsubscribed} />
          <AdminMetric label="Homepage" value={summary.sourceCounts.homepage} />
          <AdminMetric label="Screenshot results" value={summary.sourceCounts['screenshot-result']} />
          <AdminMetric label="Manual results" value={summary.sourceCounts['manual-result']} />
          {scenarioMetrics.map((scenario) => (
            <AdminMetric key={scenario} label={scenario} value={summary.scenarioCounts[scenario] ?? 0} />
          ))}
        </section>

        {(notice || error) ? (
          <div
            className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${error ? 'border-rose-400/30 bg-rose-500/10 text-rose-200' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'}`}
            role={error ? 'alert' : 'status'}
          >
            {error || notice}
          </div>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={applyFilters}>
            <Field label="Search email">
              <input
                className={inputClass}
                onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                placeholder="name@example.com"
                type="search"
                value={filters.search}
              />
            </Field>
            <Field label="Status">
              <select className={inputClass} onChange={(event) => setFilters({ ...filters, status: event.target.value as SubscriberAdminFilters['status'] })} value={filters.status}>
                <option value="all">All statuses</option>
                {EMAIL_SUBSCRIBER_STATUSES.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
              </select>
            </Field>
            <Field label="GTA updates consent">
              <ConsentSelect onChange={(value) => setFilters({ ...filters, gtaUpdatesConsent: value })} value={filters.gtaUpdatesConsent} />
            </Field>
            <Field label="Marketing consent">
              <ConsentSelect onChange={(value) => setFilters({ ...filters, marketingConsent: value })} value={filters.marketingConsent} />
            </Field>
            <Field label="Scenario">
              <select className={inputClass} onChange={(event) => setFilters({ ...filters, scenario: event.target.value as SubscriberAdminFilters['scenario'] })} value={filters.scenario}>
                <option value="all">All scenarios</option>
                {CORE_RECOMMENDATION_SCENARIOS.map((scenario) => <option key={scenario.code} value={scenario.code}>{scenario.code}</option>)}
              </select>
            </Field>
            <Field label="Signup source">
              <select className={inputClass} onChange={(event) => setFilters({ ...filters, signupSource: event.target.value as SubscriberAdminFilters['signupSource'] })} value={filters.signupSource}>
                <option value="all">All sources</option>
                {EMAIL_SIGNUP_SOURCES.map((source) => <option key={source} value={source}>{formatLabel(source)}</option>)}
              </select>
            </Field>
            <Field label="Signup date">
              <select className={inputClass} onChange={(event) => setFilters({ ...filters, sort: event.target.value as SubscriberAdminFilters['sort'] })} value={filters.sort}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </Field>
            <div className="flex items-end gap-2">
              <button className={primaryButton} disabled={busy} type="submit">
                {busy ? 'Loading...' : 'Apply Filters'}
              </button>
              <button className={secondaryButton} disabled={busy} onClick={resetFilters} type="button">
                Reset
              </button>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-xs text-slate-400">
              Showing {payload.subscribers.length} of {payload.filteredTotal} filtered subscribers
              {payload.filteredTotal > payload.resultLimit ? ` (table limit ${payload.resultLimit})` : ''}.
            </p>
            <a
              className={primaryButton}
              href={`/api/admin/subscribers?${toSearchParams(filters, true)}`}
            >
              Export Filtered CSV
            </a>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-[1100px] w-full border-collapse text-left text-xs">
              <thead className="bg-slate-950/70 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  {['Email', 'Status', 'Consent', 'Scenario', 'Source', 'Created', 'Last email', 'Actions'].map((heading) => (
                    <th className="px-3 py-3 font-black" key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {payload.subscribers.map((subscriber) => (
                  <SubscriberRow
                    busy={busy}
                    key={subscriber.id}
                    onDelete={removeSubscriber}
                    onStatusChange={changeStatus}
                    subscriber={subscriber}
                  />
                ))}
                {payload.subscribers.length === 0 ? (
                  <tr><td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={8}>No subscribers match these filters.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function SubscriberRow({
  subscriber,
  busy,
  onStatusChange,
  onDelete,
}: {
  subscriber: EmailSubscriberRecord;
  busy: boolean;
  onStatusChange: (subscriber: EmailSubscriberRecord, action: 'unsubscribe' | 'reactivate') => void;
  onDelete: (subscriber: EmailSubscriberRecord) => void;
}) {
  return (
    <tr className="bg-black/10 align-top text-slate-300 hover:bg-white/[0.025]">
      <td className="px-3 py-3 font-semibold text-white">{subscriber.email}</td>
      <td className="px-3 py-3"><StatusBadge status={subscriber.status} /></td>
      <td className="px-3 py-3 leading-5">
        <span className={subscriber.gtaUpdatesConsent ? 'text-emerald-300' : 'text-slate-500'}>GTA: {subscriber.gtaUpdatesConsent ? 'Yes' : 'No'}</span><br />
        <span className={subscriber.marketingConsent ? 'text-violet-300' : 'text-slate-500'}>Deals: {subscriber.marketingConsent ? 'Yes' : 'No'}</span>
      </td>
      <td className="px-3 py-3 font-mono text-[11px] text-violet-200">{subscriber.scenario ?? 'None'}</td>
      <td className="px-3 py-3">{formatLabel(subscriber.signupSource)}</td>
      <td className="px-3 py-3 whitespace-nowrap">{formatDate(subscriber.createdAt)}</td>
      <td className="px-3 py-3 whitespace-nowrap">{subscriber.lastEmailSentAt ? formatDate(subscriber.lastEmailSentAt) : 'Never'}</td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-2">
          {subscriber.status === 'active' ? (
            <button className={smallButton} disabled={busy} onClick={() => onStatusChange(subscriber, 'unsubscribe')} type="button">Unsubscribe</button>
          ) : (
            <button className={smallButton} disabled={busy} onClick={() => onStatusChange(subscriber, 'reactivate')} type="button">Reactivate</button>
          )}
          <button className={dangerButton} disabled={busy} onClick={() => onDelete(subscriber)} type="button">Delete</button>
        </div>
      </td>
    </tr>
  );
}

function ConsentSelect({ value, onChange }: { value: SubscriberAdminFilters['gtaUpdatesConsent']; onChange: (value: SubscriberAdminFilters['gtaUpdatesConsent']) => void }) {
  return (
    <select className={inputClass} onChange={(event) => onChange(event.target.value as SubscriberAdminFilters['gtaUpdatesConsent'])} value={value}>
      <option value="all">All</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-xs font-bold text-slate-300">{label}{children}</label>;
}

function AdminMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-white">{value}</p></div>;
}

function StatusBadge({ status }: { status: EmailSubscriberRecord['status'] }) {
  const color = status === 'active' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : status === 'unsubscribed' ? 'border-slate-500/40 bg-slate-800/70 text-slate-300' : 'border-rose-400/30 bg-rose-500/10 text-rose-200';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${color}`}>{status}</span>;
}

function toSearchParams(filters: SubscriberAdminFilters, csv = false) {
  const params = new URLSearchParams({
    search: filters.search,
    status: filters.status,
    gtaUpdatesConsent: filters.gtaUpdatesConsent,
    marketingConsent: filters.marketingConsent,
    scenario: filters.scenario,
    signupSource: filters.signupSource,
    sort: filters.sort,
  });
  if (csv) params.set('format', 'csv');
  return params.toString();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatLabel(value: string) {
  return value.replaceAll('-', ' ').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const inputClass = 'w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm font-normal text-white outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20';
const primaryButton = 'inline-flex items-center justify-center rounded-lg bg-violet-500 px-4 py-2.5 text-xs font-black text-white transition hover:bg-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:cursor-not-allowed disabled:bg-slate-700';
const secondaryButton = 'inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-black text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:cursor-not-allowed disabled:opacity-50';
const smallButton = 'rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[10px] font-black text-slate-200 transition hover:bg-white/10 disabled:opacity-50';
const dangerButton = 'rounded-lg border border-rose-400/25 bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-black text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50';
