'use client';

import { useMemo, useState, type ReactNode } from 'react';

import {
  AFFILIATE_BADGES,
  type AffiliateProductRecord,
  type RecommendationAssignmentRecord,
  type RecommendationWorkspace,
} from '../../lib/affiliate-types';
import type { AssignmentInput, AssignmentUpdateInput } from '../../lib/catalog-validation';
import { RecommendationProductCard } from '../RecommendationProductCard';
import { AdminHeader } from './ProductCatalogDashboard';

interface WorkspaceResponse {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  workspace?: RecommendationWorkspace;
}

type AssignmentEditor =
  | { kind: 'add'; source: RecommendationAssignmentRecord | null }
  | { kind: 'edit'; assignment: RecommendationAssignmentRecord }
  | null;

export function RecommendationAdminDashboard({ initialWorkspace }: { initialWorkspace: RecommendationWorkspace }) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [selectedScenarioId, setSelectedScenarioId] = useState(initialWorkspace.scenarios[0]?.id ?? '');
  const [selectedSectionId, setSelectedSectionId] = useState(initialWorkspace.scenarios[0]?.sections[0]?.id ?? '');
  const [editor, setEditor] = useState<AssignmentEditor>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([]);

  const selectedScenario = workspace.scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? workspace.scenarios[0] ?? null;
  const selectedSection = selectedScenario?.sections.find((section) => section.id === selectedSectionId) ?? selectedScenario?.sections[0] ?? null;
  const assignments = selectedSection?.assignments ?? [];

  const selectScenario = (id: string) => {
    const scenario = workspace.scenarios.find((item) => item.id === id);
    setSelectedScenarioId(id);
    setSelectedSectionId(scenario?.sections[0]?.id ?? '');
    setSelectedAssignmentIds([]);
  };

  const request = async (url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) => {
    setBusy(true);
    setError('');
    setFieldErrors({});
    setNotice('');
    try {
      const response = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const payload = (await response.json()) as WorkspaceResponse;
      if (!response.ok) {
        setFieldErrors(payload.fieldErrors ?? {});
        throw new Error(payload.error || 'The recommendation request failed.');
      }
      if (payload.workspace) setWorkspace(payload.workspace);
      setNotice(payload.message ?? 'Saved.');
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The recommendation request failed.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const createAssignments = async (input: AssignmentInput) => {
    const saved = await request('/api/admin/assignments', 'POST', input);
    if (saved) setEditor(null);
  };

  const updateAssignment = async (id: string, input: AssignmentUpdateInput) => {
    const saved = await request(`/api/admin/assignments/${id}`, 'PATCH', input);
    if (saved) setEditor(null);
  };

  const bulkAction = async (action: 'enable' | 'disable' | 'delete') => {
    if (action === 'delete' && !window.confirm(`Remove ${selectedAssignmentIds.length} assignments? Catalog products will be kept.`)) return;
    const saved = await request('/api/admin/assignments/bulk', 'PATCH', { ids: selectedAssignmentIds, action });
    if (saved) setSelectedAssignmentIds([]);
  };

  return (
    <main className="admin-theme min-h-screen px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <AdminHeader active="recommendations" />

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">Scenario placement</p>
            <h1 className="mt-2 text-3xl font-black">Recommendations</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Assign existing catalog products to one or more result sections. Removing an assignment never deletes its product.</p>
          </div>
          {(notice || error) ? <StatusMessage error={error}>{error || notice}</StatusMessage> : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="self-start rounded-2xl border border-white/10 bg-black/20 p-3 lg:sticky lg:top-4">
              <label className="grid gap-2 text-sm font-bold text-slate-300">Scenario<select className={inputClass} onChange={(event) => selectScenario(event.target.value)} value={selectedScenario?.id ?? ''}>{workspace.scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.code}</option>)}</select></label>
              <div className="mt-4 grid gap-2">
                {selectedScenario?.sections.map((section) => <button className={`rounded-xl border px-3 py-3 text-left text-sm ${selectedSection?.id === section.id ? 'border-violet-400/50 bg-violet-500/10' : 'border-white/10 bg-white/[0.03]'}`} key={section.id} onClick={() => { setSelectedSectionId(section.id); setSelectedAssignmentIds([]); }} type="button"><span className="block font-bold">{section.title}</span><span className="mt-1 block text-xs text-slate-500">{section.assignments?.length ?? 0} assignments</span></button>)}
              </div>
            </aside>

            <div className="min-w-0">
              {selectedSection ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div><p className="text-xs font-black uppercase tracking-[0.15em] text-violet-300">{selectedScenario?.code}</p><h2 className="mt-1 text-2xl font-black">{selectedSection.title}</h2><p className="mt-1 text-sm text-slate-400">{selectedSection.description}</p></div>
                    <button className={primaryButton} disabled={busy || workspace.products.length === 0} onClick={() => setEditor({ kind: 'add', source: null })} type="button">Add Existing Product</button>
                  </div>

                  {selectedAssignmentIds.length > 0 ? <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-sm"><span className="mr-2 font-bold">{selectedAssignmentIds.length} selected</span><button className={secondaryButton} disabled={busy} onClick={() => void bulkAction('enable')} type="button">Enable</button><button className={secondaryButton} disabled={busy} onClick={() => void bulkAction('disable')} type="button">Disable</button><button className={dangerButton} disabled={busy} onClick={() => void bulkAction('delete')} type="button">Delete assignments</button></div> : null}

                  <div className="mt-4 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {assignments.map((assignment, index) => (
                      <article className="flex h-full flex-col rounded-3xl border border-white/10 bg-black/20 p-4" key={assignment.id}>
                        <label className="mb-3 flex items-center justify-between gap-3 text-xs font-bold text-slate-400"><span><input checked={selectedAssignmentIds.includes(assignment.id)} className="mr-2 size-4 accent-violet-500" onChange={(event) => setSelectedAssignmentIds((current) => event.target.checked ? [...current, assignment.id] : current.filter((id) => id !== assignment.id))} type="checkbox" />Select</span><span className={assignment.enabled && assignment.product.enabled ? enabledBadge : disabledBadge}>{assignment.enabled && assignment.product.enabled ? 'Enabled' : 'Disabled'}</span></label>
                        <RecommendationProductCard preview product={toPreviewProduct(assignment)} />
                        <div className="mt-auto flex flex-wrap gap-2 pt-4">
                          <button aria-label="Move assignment up" className={smallButton} disabled={busy || index === 0} onClick={() => void request(`/api/admin/assignments/${assignment.id}`, 'PATCH', { action: 'move', direction: 'up' })} type="button">↑</button>
                          <button aria-label="Move assignment down" className={smallButton} disabled={busy || index === assignments.length - 1} onClick={() => void request(`/api/admin/assignments/${assignment.id}`, 'PATCH', { action: 'move', direction: 'down' })} type="button">↓</button>
                          <button className={secondaryButton} onClick={() => setEditor({ kind: 'edit', assignment })} type="button">Edit / Move</button>
                          <button className={secondaryButton} onClick={() => setEditor({ kind: 'add', source: assignment })} type="button">Copy / Duplicate</button>
                          <button className={secondaryButton} disabled={busy} onClick={() => void updateAssignment(assignment.id, { ...toAssignmentUpdate(assignment), enabled: !assignment.enabled })} type="button">{assignment.enabled ? 'Disable' : 'Enable'}</button>
                          <button className={dangerButton} disabled={busy} onClick={() => { if (window.confirm('Remove this assignment? The catalog product will be kept.')) void request(`/api/admin/assignments/${assignment.id}`, 'DELETE'); }} type="button">Remove</button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {assignments.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-8 text-center"><p className="text-sm text-slate-500">This section has no assignments.</p><button className={`${primaryButton} mt-4`} disabled={workspace.products.length === 0} onClick={() => setEditor({ kind: 'add', source: null })} type="button">Add Existing Product</button></div> : null}
                </>
              ) : <p className="text-slate-400">No recommendation sections are available.</p>}
            </div>
          </div>
        </section>
      </div>

      {editor?.kind === 'add' ? <Modal onClose={() => setEditor(null)} title={editor.source ? 'Copy assignment' : 'Add Existing Product'}>{error ? <StatusMessage error={error}>{error}</StatusMessage> : null}<AssignmentForm busy={busy} currentSectionId={selectedSection?.id ?? ''} fieldErrors={fieldErrors} onSave={createAssignments} source={editor.source} workspace={workspace} /></Modal> : null}
      {editor?.kind === 'edit' ? <Modal onClose={() => setEditor(null)} title="Edit or move assignment">{error ? <StatusMessage error={error}>{error}</StatusMessage> : null}<EditAssignmentForm assignment={editor.assignment} busy={busy} fieldErrors={fieldErrors} onSave={updateAssignment} workspace={workspace} /></Modal> : null}
    </main>
  );
}

function AssignmentForm({ workspace, currentSectionId, source, busy, fieldErrors, onSave }: { workspace: RecommendationWorkspace; currentSectionId: string; source: RecommendationAssignmentRecord | null; busy: boolean; fieldErrors: Record<string, string>; onSave: (input: AssignmentInput) => void }) {
  const [productIds, setProductIds] = useState<string[]>(source ? [source.productId] : []);
  const [sectionIds, setSectionIds] = useState<string[]>(source ? [] : currentSectionId ? [currentSectionId] : []);
  const [query, setQuery] = useState('');
  const [badge, setBadge] = useState<AssignmentInput['badge']>(source?.badge ?? 'None');
  const [buttonText, setButtonText] = useState(source?.buttonText ?? 'View Product');
  const [overridePriceText, setOverridePriceText] = useState(source?.overridePriceText ?? '');
  const [overrideDescription, setOverrideDescription] = useState(source?.overrideDescription ?? '');
  const [enabled, setEnabled] = useState(source?.enabled ?? true);
  const [displayOrder, setDisplayOrder] = useState('');
  const products = useMemo(() => workspace.products.filter((product) => `${product.title} ${product.componentType} ${product.retailer}`.toLowerCase().includes(query.trim().toLowerCase())), [query, workspace.products]);
  const localErrors = { ...fieldErrors };
  if (productIds.length === 0) localErrors.productIds = 'Choose at least one product.';
  if (sectionIds.length === 0) localErrors.sectionIds = 'Choose at least one destination section.';
  if (!buttonText.trim()) localErrors.buttonText = 'Button text is required.';

  const toggleScenario = (sectionIdsForScenario: string[], checked: boolean) => setSectionIds((current) => checked ? Array.from(new Set([...current, ...sectionIdsForScenario])) : current.filter((id) => !sectionIdsForScenario.includes(id)));

  return <form className="mt-4 grid gap-5" onSubmit={(event) => { event.preventDefault(); if (productIds.length && sectionIds.length && buttonText.trim()) onSave({ productIds, sectionIds, badge, buttonText, overridePriceText: overridePriceText.trim() || null, overrideDescription: overrideDescription.trim() || null, enabled, displayOrder: displayOrder === '' ? null : Number(displayOrder) }); }}>
    <section><div className="flex items-center justify-between gap-3"><h3 className="font-black">Products</h3><a className={secondaryButton} href="/admin/products?new=1">Create New Product</a></div><input aria-label="Search catalog products" className={`${inputClass} mt-3`} onChange={(event) => setQuery(event.target.value)} placeholder="Search existing products" type="search" value={query} /><div className="mt-3 grid max-h-56 gap-2 overflow-y-auto pr-1">{products.map((product) => <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm" key={product.id}><input checked={productIds.includes(product.id)} className="size-4 accent-violet-500" disabled={Boolean(source)} onChange={(event) => setProductIds((current) => event.target.checked ? [...current, product.id] : current.filter((id) => id !== product.id))} type="checkbox" /><span><span className="block font-bold">{product.title}</span><span className="text-xs text-slate-500">{product.componentType} · {product.retailer}</span></span></label>)}</div>{localErrors.productIds ? <FieldError>{localErrors.productIds}</FieldError> : null}</section>
    <section><h3 className="font-black">Destination scenarios and sections</h3><div className="mt-3 grid max-h-72 gap-3 overflow-y-auto pr-1">{workspace.scenarios.map((scenario) => { const scenarioSectionIds = scenario.sections.map((section) => section.id); const allSelected = scenarioSectionIds.length > 0 && scenarioSectionIds.every((id) => sectionIds.includes(id)); return <div className="rounded-xl border border-white/10 bg-black/20 p-3" key={scenario.id}><label className="flex items-center gap-2 text-sm font-black"><input checked={allSelected} className="size-4 accent-violet-500" onChange={(event) => toggleScenario(scenarioSectionIds, event.target.checked)} type="checkbox" />{scenario.code}</label><div className="mt-2 grid gap-2 pl-6">{scenario.sections.map((section) => <label className="flex items-center gap-2 text-sm text-slate-300" key={section.id}><input checked={sectionIds.includes(section.id)} className="size-4 accent-violet-500" onChange={(event) => setSectionIds((current) => event.target.checked ? [...current, section.id] : current.filter((id) => id !== section.id))} type="checkbox" />{section.title}</label>)}</div></div>; })}</div>{localErrors.sectionIds ? <FieldError>{localErrors.sectionIds}</FieldError> : null}</section>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Badge"><select className={inputClass} onChange={(event) => setBadge(event.target.value as AssignmentInput['badge'])} value={badge}>{AFFILIATE_BADGES.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field><Field error={localErrors.buttonText} label="Button text"><input className={inputClass} onChange={(event) => setButtonText(event.target.value)} value={buttonText} /></Field></div>
    <Field error={localErrors.overridePriceText} label="Price override (optional)"><input className={inputClass} onChange={(event) => setOverridePriceText(event.target.value)} placeholder="Uses catalog default when blank" value={overridePriceText} /></Field>
    <Field error={localErrors.overrideDescription} label="Description override (optional)"><textarea className={`${inputClass} min-h-20 resize-y`} onChange={(event) => setOverrideDescription(event.target.value)} placeholder="Uses catalog description when blank" value={overrideDescription} /></Field>
    <Field error={localErrors.displayOrder} label="Starting display order (optional)"><input className={inputClass} min={0} onChange={(event) => setDisplayOrder(event.target.value)} placeholder="Appends to each section when blank" type="number" value={displayOrder} /></Field>
    <label className="flex items-center gap-3 text-sm font-bold text-slate-300"><input checked={enabled} className="size-4 accent-violet-500" onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />Assignments enabled</label>
    <button className={primaryButton} disabled={busy} type="submit">{busy ? 'Saving assignments…' : 'Save Assignments'}</button>
  </form>;
}

function EditAssignmentForm({ assignment, workspace, busy, fieldErrors, onSave }: { assignment: RecommendationAssignmentRecord; workspace: RecommendationWorkspace; busy: boolean; fieldErrors: Record<string, string>; onSave: (id: string, input: AssignmentUpdateInput) => void }) {
  const [draft, setDraft] = useState<AssignmentUpdateInput>(() => toAssignmentUpdate(assignment));
  return <form className="mt-4 grid gap-4" onSubmit={(event) => { event.preventDefault(); onSave(assignment.id, draft); }}><p className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm"><span className="font-black">{assignment.product.title}</span><span className="ml-2 text-slate-500">Catalog product</span></p><Field error={fieldErrors.sectionId} label="Destination section"><select className={inputClass} onChange={(event) => setDraft({ ...draft, sectionId: event.target.value })} value={draft.sectionId}>{workspace.scenarios.flatMap((scenario) => scenario.sections.map((section) => <option key={section.id} value={section.id}>{scenario.code} — {section.title}</option>))}</select></Field><div className="grid gap-4 sm:grid-cols-2"><Field error={fieldErrors.badge} label="Badge"><select className={inputClass} onChange={(event) => setDraft({ ...draft, badge: event.target.value as AssignmentUpdateInput['badge'] })} value={draft.badge}>{AFFILIATE_BADGES.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field><Field error={fieldErrors.buttonText} label="Button text"><input className={inputClass} onChange={(event) => setDraft({ ...draft, buttonText: event.target.value })} value={draft.buttonText} /></Field></div><Field error={fieldErrors.overridePriceText} label="Price override (optional)"><input className={inputClass} onChange={(event) => setDraft({ ...draft, overridePriceText: event.target.value || null })} value={draft.overridePriceText ?? ''} /></Field><Field error={fieldErrors.overrideDescription} label="Description override (optional)"><textarea className={`${inputClass} min-h-20 resize-y`} onChange={(event) => setDraft({ ...draft, overrideDescription: event.target.value || null })} value={draft.overrideDescription ?? ''} /></Field><Field error={fieldErrors.displayOrder} label="Display order"><input className={inputClass} min={0} onChange={(event) => setDraft({ ...draft, displayOrder: Number(event.target.value) })} type="number" value={draft.displayOrder} /></Field><label className="flex items-center gap-3 text-sm font-bold text-slate-300"><input checked={draft.enabled} className="size-4 accent-violet-500" onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} type="checkbox" />Assignment enabled</label><button className={primaryButton} disabled={busy} type="submit">{busy ? 'Saving…' : 'Save Assignment'}</button></form>;
}

function toAssignmentUpdate(assignment: RecommendationAssignmentRecord): AssignmentUpdateInput { return { sectionId: assignment.sectionId, badge: assignment.badge, buttonText: assignment.buttonText, overridePriceText: assignment.overridePriceText, overrideDescription: assignment.overrideDescription, enabled: assignment.enabled, displayOrder: assignment.displayOrder }; }
function toPreviewProduct(assignment: RecommendationAssignmentRecord): AffiliateProductRecord { return { id: assignment.id, productId: assignment.productId, sectionId: assignment.sectionId, title: assignment.product.title, retailer: assignment.product.retailer, affiliateUrl: assignment.product.affiliateUrl, imageUrl: assignment.product.imageUrl, priceText: assignment.overridePriceText ?? assignment.product.defaultPriceText, badge: assignment.badge, shortDescription: assignment.overrideDescription ?? assignment.product.shortDescription, buttonText: assignment.buttonText, componentType: assignment.product.componentType, platform: assignment.product.platform, enabled: assignment.enabled && assignment.product.enabled, displayOrder: assignment.displayOrder, createdAt: assignment.createdAt, updatedAt: assignment.updatedAt }; }
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"><div className="mx-auto my-6 max-w-3xl rounded-3xl border border-white/15 bg-[#0d111d] p-5 shadow-2xl sm:p-6"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black">{title}</h2><button className={secondaryButton} onClick={onClose} type="button">Close</button></div>{children}</div></div>; }
function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) { return <label className="grid gap-2 text-sm font-bold text-slate-300"><span>{label}</span>{children}{error ? <FieldError>{error}</FieldError> : null}</label>; }
function FieldError({ children }: { children: ReactNode }) { return <span className="mt-1 block text-xs font-semibold text-red-300">{children}</span>; }
function StatusMessage({ children, error }: { children: ReactNode; error?: string }) { return <p aria-live="polite" className={`mt-4 rounded-xl border px-3 py-2 text-sm ${error ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'}`}>{children}</p>; }

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/60 disabled:opacity-50';
const primaryButton = 'rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 disabled:opacity-50';
const dangerButton = 'rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-50';
const smallButton = 'rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30';
const enabledBadge = 'rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300';
const disabledBadge = 'rounded-full bg-slate-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-400';
