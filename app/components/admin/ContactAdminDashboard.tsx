'use client';

import { useMemo, useState } from 'react';

import { CONTACT_STATUSES, type ContactStatus, type ContactSubmissionRecord } from '../../lib/contact-types';
import { AdminHeader } from './AdminHeader';

export function ContactAdminDashboard({ initialSubmissions }: { initialSubmissions: ContactSubmissionRecord[] }) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [filter, setFilter] = useState<'all' | ContactStatus>('all');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const visible = useMemo(() => submissions.filter((item) => filter === 'all' || item.status === filter), [filter, submissions]);

  async function update(id: string, method: 'PATCH' | 'DELETE', body?: unknown) {
    setBusyId(id); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/contacts/${id}`, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
      const payload = await response.json() as { error?: string; message?: string; submissions?: ContactSubmissionRecord[] };
      if (!response.ok) throw new Error(payload.error || 'The contact request failed.');
      if (payload.submissions) setSubmissions(payload.submissions);
      setNotice(payload.message || 'Contact message updated.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The contact request failed.');
    } finally {
      setBusyId('');
    }
  }

  return <main className="admin-theme min-h-screen px-4 py-8 text-slate-100 sm:px-6"><div className="mx-auto max-w-7xl"><AdminHeader active="contacts" /><section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">Support</p><h1 className="mt-2 text-3xl font-black">Contact Messages</h1><p className="mt-2 text-sm text-slate-400">Review messages submitted through the public contact page. Email addresses remain private in this authenticated view.</p></div><label className="grid gap-2 text-xs font-bold text-slate-400">Status<select className={inputClass} onChange={(event) => setFilter(event.target.value as 'all' | ContactStatus)} value={filter}><option value="all">All messages</option>{CONTACT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label></div>{notice || error ? <p aria-live="polite" className={`mt-4 rounded-xl border px-3 py-2 text-sm ${error ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'}`}>{error || notice}</p> : null}<div className="mt-6 grid gap-4">{visible.map((item) => <article className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5" key={item.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-white">{item.subject}</h2><span className={statusClass(item.status)}>{item.status}</span></div><p className="mt-1 text-sm text-slate-400">{item.name} · <a className="text-violet-300 hover:underline" href={`mailto:${item.email}`}>{item.email}</a></p><p className="mt-1 text-xs text-slate-600">{formatDate(item.createdAt)}</p></div><div className="flex flex-wrap gap-2"><select aria-label={`Status for ${item.subject}`} className={inputClass} disabled={busyId === item.id} onChange={(event) => void update(item.id, 'PATCH', { status: event.target.value })} value={item.status}>{CONTACT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select><button className={dangerButton} disabled={busyId === item.id} onClick={() => { if (window.confirm('Delete this contact message? This cannot be undone.')) void update(item.id, 'DELETE'); }} type="button">Delete</button></div></div><p className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/25 p-4 text-sm leading-7 text-slate-300">{item.message}</p></article>)}{!visible.length ? <p className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500">No contact messages match this filter.</p> : null}</div></section></div></main>;
}

function statusClass(status: ContactStatus) { const color = status === 'new' ? 'bg-violet-500/15 text-violet-200' : status === 'resolved' ? 'bg-emerald-500/15 text-emerald-200' : status === 'spam' ? 'bg-red-500/15 text-red-200' : 'bg-slate-500/15 text-slate-300'; return `rounded-full px-2 py-1 text-[10px] font-black uppercase ${color}`; }
function formatDate(value: string) { return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
const inputClass = 'rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-violet-400/60 disabled:opacity-50';
const dangerButton = 'rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-50';
