'use client';

import { useMemo, useState, type ReactNode } from 'react';

import {
  CREATOR_SCENARIO_DEFAULTS,
  CREATOR_SETUP_BUILDER_PATH,
  CREATOR_SETUP_GUIDE_PATH,
  CREATOR_TEMPLATES,
  type CreatorTemplate,
} from '../../data/creator-recommendations';
import type { CoreRecommendationScenarioCode } from '../../data/recommendation-scenarios';
import type { AffiliateProductRecord, ProductRecord } from '../../lib/affiliate-types';
import type {
  CreatorRecommendationInput,
  CreatorRecommendationWorkspace,
  PublicCreatorRecommendationPayload,
} from '../../lib/creator-recommendation-types';
import { getCreatorDestinationWarning } from '../../lib/creator-cta-destinations';
import { CreatorRecommendationSection } from '../CreatorRecommendations';
import { AdminHeader } from './AdminHeader';
import { CatalogProductPicker } from './CatalogProductPicker';

interface DraftGroup {
  localId: string;
  title: string;
  description: string;
  enabled: boolean;
  productIds: string[];
}

interface DraftGuide {
  localId: string;
  label: string;
  url: string;
  enabled: boolean;
}

type CreatorDraft = Omit<CreatorRecommendationInput, 'groups' | 'guides'> & {
  groups: DraftGroup[];
  guides: DraftGuide[];
};

interface WorkspaceResponse {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  warnings?: Array<{ field: string; message: string }>;
  workspace?: CreatorRecommendationWorkspace;
}

export function CreatorRecommendationAdminDashboard({
  initialWorkspace,
}: {
  initialWorkspace: CreatorRecommendationWorkspace;
}) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [selectedScenarioId, setSelectedScenarioId] = useState(
    initialWorkspace.scenarios[0]?.id ?? '',
  );
  const initialScenario = initialWorkspace.scenarios[0];
  const [draft, setDraft] = useState<CreatorDraft>(() =>
    initialScenario ? draftFromScenario(initialScenario) : emptyDraft(),
  );
  const [productPickerGroupId, setProductPickerGroupId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const selectedScenario =
    workspace.scenarios.find((scenario) => scenario.id === selectedScenarioId) ??
    workspace.scenarios[0] ??
    null;
  const productMap = useMemo(
    () => new Map(workspace.products.map((product) => [product.id, product])),
    [workspace.products],
  );
  const previewPayload = selectedScenario
    ? toPreviewPayload(selectedScenario.code, draft, productMap)
    : null;

  const selectScenario = (scenarioId: string) => {
    const scenario = workspace.scenarios.find((item) => item.id === scenarioId);
    setSelectedScenarioId(scenarioId);
    if (scenario) setDraft(draftFromScenario(scenario));
    setNotice('');
    setError('');
    setWarnings([]);
    setFieldErrors({});
  };

  const save = async () => {
    setBusy(true);
    setNotice('');
    setError('');
    setWarnings([]);
    setFieldErrors({});
    try {
      const response = await fetch('/api/admin/creator-recommendations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toInput(draft)),
      });
      const payload = (await response.json()) as WorkspaceResponse;
      if (!response.ok) {
        setFieldErrors(payload.fieldErrors ?? {});
        throw new Error(payload.error || 'The creator recommendation could not be saved.');
      }
      if (payload.workspace) {
        setWorkspace(payload.workspace);
        const refreshed = payload.workspace.scenarios.find(
          (scenario) => scenario.id === selectedScenarioId,
        );
        if (refreshed) setDraft(draftFromScenario(refreshed));
      }
      setNotice(payload.message ?? 'Creator recommendation saved.');
      setWarnings(
        (payload.warnings ?? []).map((warning) => `${warning.field}: ${warning.message}`),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The creator recommendation could not be saved.',
      );
    } finally {
      setBusy(false);
    }
  };

  const applyTemplate = (template: CreatorTemplate) => {
    if (
      hasMeaningfulDraft(draft) &&
      !window.confirm(
        `Apply “${template.name}”? This will replace the current headline, description, and product groups in the unsaved editor.`,
      )
    ) {
      return;
    }
    setDraft((current) => ({
      ...current,
      headline: template.copy.headline,
      subheadline: template.copy.subheadline,
      description: template.copy.description,
      primaryCtaLabel: template.copy.primaryCtaLabel,
      groups: template.groups.map((group, index) => ({
        localId: `template-${template.id}-${index}`,
        title: group.title,
        description: group.description,
        enabled: true,
        productIds: [],
      })),
    }));
    setNotice(`${template.name} applied to the unsaved editor. Review it, add products, then save.`);
  };

  const updateGroup = (localId: string, change: Partial<DraftGroup>) => {
    setDraft((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.localId === localId ? { ...group, ...change } : group,
      ),
    }));
  };

  return (
    <main className="admin-theme min-h-screen px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <AdminHeader active="creator-recommendations" />

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">Monetization</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black">Creator Recommendations</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Configure the creator path shown after normal hardware recommendations. Products remain in the shared Affiliate Products library.
              </p>
            </div>
            <button className={primaryButton} disabled={busy || !selectedScenario} onClick={() => void save()} type="button">
              {busy ? 'Saving…' : 'Save Scenario'}
            </button>
          </div>
          {(notice || error) ? <StatusMessage error={Boolean(error)}>{error || notice}</StatusMessage> : null}
          {warnings.length > 0 ? <WarningMessage warnings={warnings} /> : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="self-start rounded-2xl border border-white/10 bg-black/20 p-4 lg:sticky lg:top-4">
              <Field label="Compatibility scenario">
                <select className={inputClass} onChange={(event) => selectScenario(event.target.value)} value={selectedScenario?.id ?? ''}>
                  {workspace.scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.code}</option>)}
                </select>
              </Field>
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Templates</p>
                <div className="mt-3 grid gap-2">
                  {CREATOR_TEMPLATES.map((template) => <button className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs transition hover:border-violet-400/30 hover:bg-violet-500/10" key={template.id} onClick={() => applyTemplate(template)} title={template.description} type="button"><span className="block font-black text-slate-200">{template.name}</span><span className="mt-1 block leading-5 text-slate-500">{template.description}</span></button>)}
                </div>
              </div>
            </aside>

            <div className="min-w-0 grid gap-6">
              <section className={panelClass}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="text-xl font-black">Scenario message</h2><p className="mt-1 text-xs text-slate-500">Disabled custom records use the public fallback instead.</p></div>
                  <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-bold"><input checked={draft.enabled} className="size-4 accent-violet-500" onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} type="checkbox" />Creator section custom content enabled</label>
                </div>
                <div className="mt-5 grid gap-4">
                  <Field error={fieldErrors.headline} label="Creator headline"><input className={inputClass} onChange={(event) => setDraft({ ...draft, headline: event.target.value })} value={draft.headline} /></Field>
                  <Field error={fieldErrors.subheadline} label="Creator subheadline"><input className={inputClass} onChange={(event) => setDraft({ ...draft, subheadline: event.target.value })} value={draft.subheadline} /></Field>
                  <Field error={fieldErrors.description} label="Creator description"><textarea className={`${inputClass} min-h-28 resize-y`} onChange={(event) => setDraft({ ...draft, description: event.target.value })} value={draft.description} /></Field>
                  <Field error={fieldErrors.warningText} label="Optional warning"><textarea className={`${inputClass} min-h-20 resize-y`} onChange={(event) => setDraft({ ...draft, warningText: event.target.value })} placeholder="Shown as a short Start here notice" value={draft.warningText} /></Field>
                </div>
              </section>

              <section className={panelClass}>
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Creator product groups</h2><p className="mt-1 text-xs text-slate-500">Products may be reused across scenarios and groups.</p></div><button className={secondaryButton} onClick={() => setDraft((current) => ({ ...current, groups: [...current.groups, { localId: `group-${Date.now()}`, title: 'New Creator Product Group', description: '', enabled: true, productIds: [] }] }))} type="button">Add Product Group</button></div>
                <div className="mt-4 grid gap-4">
                  {draft.groups.map((group, groupIndex) => (
                    <article className="rounded-2xl border border-white/10 bg-black/20 p-4" key={group.localId}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-400"><input checked={group.enabled} className="size-4 accent-violet-500" onChange={(event) => updateGroup(group.localId, { enabled: event.target.checked })} type="checkbox" />Group enabled</label>
                        <div className="flex gap-2"><button aria-label="Move group up" className={smallButton} disabled={groupIndex === 0} onClick={() => setDraft((current) => ({ ...current, groups: moveItem(current.groups, groupIndex, -1) }))} type="button">↑</button><button aria-label="Move group down" className={smallButton} disabled={groupIndex === draft.groups.length - 1} onClick={() => setDraft((current) => ({ ...current, groups: moveItem(current.groups, groupIndex, 1) }))} type="button">↓</button><button className={dangerButton} onClick={() => { if (!group.productIds.length || window.confirm('Remove this creator group and its product assignments? Catalog products will be kept.')) setDraft((current) => ({ ...current, groups: current.groups.filter((item) => item.localId !== group.localId) })); }} type="button">Remove Group</button></div>
                      </div>
                      <div className="mt-3 grid gap-3"><Field error={fieldErrors[`groups.${groupIndex}.title`]} label="Group title"><input className={inputClass} onChange={(event) => updateGroup(group.localId, { title: event.target.value })} value={group.title} /></Field><Field error={fieldErrors[`groups.${groupIndex}.description`]} label="Short description"><textarea className={`${inputClass} min-h-16 resize-y`} onChange={(event) => updateGroup(group.localId, { description: event.target.value })} value={group.description} /></Field></div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{group.productIds.length} assigned products</p><button className={secondaryButton} onClick={() => setProductPickerGroupId(group.localId)} type="button">Add / Manage Products</button></div>
                      <div className="mt-3 grid gap-2">
                        {group.productIds.map((productId, productIndex) => { const product = productMap.get(productId); return product ? <AssignedProductRow index={productIndex} key={productId} onMove={(direction) => updateGroup(group.localId, { productIds: moveItem(group.productIds, productIndex, direction) })} onRemove={() => updateGroup(group.localId, { productIds: group.productIds.filter((id) => id !== productId) })} product={product} total={group.productIds.length} /> : null; })}
                      </div>
                      {group.productIds.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-slate-500">No products assigned. Empty groups are not rendered publicly.</p> : null}
                    </article>
                  ))}
                </div>
                {draft.groups.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">No product groups yet. The creator message and CTA can still render without an empty product container.</p> : null}
              </section>

              <section className={panelClass}>
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Guide and article links</h2><p className="mt-1 text-xs text-slate-500">Use internal paths or public HTTPS links.</p></div><button className={secondaryButton} onClick={() => setDraft((current) => ({ ...current, guides: [...current.guides, { localId: `guide-${Date.now()}`, label: 'Creator Setup Guide', url: CREATOR_SETUP_GUIDE_PATH, enabled: true }] }))} type="button">Add Guide Link</button></div>
                <div className="mt-4 grid gap-3">{draft.guides.map((guide, index) => <GuideEditor error={fieldErrors[`guides.${index}.url`]} guide={guide} index={index} key={guide.localId} onChange={(change) => setDraft((current) => ({ ...current, guides: current.guides.map((item) => item.localId === guide.localId ? { ...item, ...change } : item) }))} onMove={(direction) => setDraft((current) => ({ ...current, guides: moveItem(current.guides, index, direction) }))} onRemove={() => setDraft((current) => ({ ...current, guides: current.guides.filter((item) => item.localId !== guide.localId) }))} total={draft.guides.length} />)}</div>
              </section>

              <section className={panelClass}>
                <h2 className="text-xl font-black">Calls to action</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2"><Field error={fieldErrors.primaryCtaLabel} label="Primary CTA label"><input className={inputClass} onChange={(event) => setDraft({ ...draft, primaryCtaLabel: event.target.value })} value={draft.primaryCtaLabel} /></Field><Field error={fieldErrors.primaryCtaUrl} label="Primary CTA URL" warning={getCreatorDestinationWarning(draft.primaryCtaUrl)}><input className={inputClass} onChange={(event) => setDraft({ ...draft, primaryCtaUrl: event.target.value })} value={draft.primaryCtaUrl} /></Field><Field error={fieldErrors.secondaryCtaLabel} label="Secondary CTA label (optional)"><input className={inputClass} onChange={(event) => setDraft({ ...draft, secondaryCtaLabel: event.target.value })} value={draft.secondaryCtaLabel} /></Field><Field error={fieldErrors.secondaryCtaUrl} label="Secondary CTA URL (optional)" warning={draft.secondaryCtaLabel || draft.secondaryCtaUrl ? getCreatorDestinationWarning(draft.secondaryCtaUrl) : ''}><input className={inputClass} onChange={(event) => setDraft({ ...draft, secondaryCtaUrl: event.target.value })} value={draft.secondaryCtaUrl} /></Field></div>
              </section>

              {previewPayload ? <section className={`${panelClass} overflow-hidden p-0`}><div className="border-b border-white/10 px-4 py-3"><p className="text-xs font-black uppercase tracking-[0.15em] text-violet-300">Live public preview</p><p className="mt-1 text-xs text-slate-500">Disabled or invalid products are omitted, matching public behavior.</p></div><CreatorRecommendationSection payload={previewPayload} preview /></section> : null}
            </div>
          </div>
        </section>
      </div>

      {productPickerGroupId ? <GroupProductPickerModal group={draft.groups.find((group) => group.localId === productPickerGroupId) ?? null} onClose={() => setProductPickerGroupId(null)} onSave={(productIds) => { updateGroup(productPickerGroupId, { productIds: Array.from(new Set(productIds)) }); setProductPickerGroupId(null); }} products={workspace.products} /> : null}
    </main>
  );
}

function GroupProductPickerModal({ group, products, onSave, onClose }: { group: DraftGroup | null; products: ProductRecord[]; onSave: (productIds: string[]) => void; onClose: () => void }) {
  const [selectedIds, setSelectedIds] = useState(group?.productIds ?? []);
  return <Modal onClose={onClose} title={`Products for ${group?.title ?? 'creator group'}`}><p className="mt-2 text-sm text-slate-400">Search and filter the shared Affiliate Products library, select any number of products, then bulk add them to this group.</p><div className="mt-4"><CatalogProductPicker onSelectionChange={setSelectedIds} products={products} selectedProductIds={selectedIds} /></div><div className="mt-5 flex justify-end gap-2"><button className={secondaryButton} onClick={onClose} type="button">Cancel</button><button className={primaryButton} onClick={() => onSave(selectedIds)} type="button">Add {selectedIds.length} Selected Products</button></div></Modal>;
}

function AssignedProductRow({ product, index, total, onMove, onRemove }: { product: ProductRecord; index: number; total: number; onMove: (direction: -1 | 1) => void; onRemove: () => void }) {
  return <div className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/30 text-[10px] font-black text-slate-600">{product.imageUrl ? <span aria-label="Product image configured" className="text-emerald-300">IMG</span> : product.componentType.slice(0, 3)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{product.title}</span><span className="block text-xs text-slate-500">{product.componentType} · {product.retailer} · {product.enabled ? 'Enabled' : 'Disabled'}</span></span><button aria-label="Move product up" className={smallButton} disabled={index === 0} onClick={() => onMove(-1)} type="button">↑</button><button aria-label="Move product down" className={smallButton} disabled={index === total - 1} onClick={() => onMove(1)} type="button">↓</button><button className={dangerButton} onClick={onRemove} type="button">Remove</button></div>;
}

function GuideEditor({ guide, index, total, error, onChange, onMove, onRemove }: { guide: DraftGuide; index: number; total: number; error?: string; onChange: (change: Partial<DraftGuide>) => void; onMove: (direction: -1 | 1) => void; onRemove: () => void }) {
  const warning = guide.enabled ? getCreatorDestinationWarning(guide.url) : '';
  return <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 md:grid-cols-[auto_1fr_1.4fr_auto] md:items-center"><input aria-label={`Enable ${guide.label || 'guide link'}`} checked={guide.enabled} className="size-4 accent-violet-500" onChange={(event) => onChange({ enabled: event.target.checked })} type="checkbox" /><input aria-label="Guide label" className={inputClass} onChange={(event) => onChange({ label: event.target.value })} placeholder="Guide label" value={guide.label} /><input aria-label="Guide URL" className={inputClass} onChange={(event) => onChange({ url: event.target.value })} placeholder={CREATOR_SETUP_GUIDE_PATH} value={guide.url} /><div className="flex gap-1"><button aria-label="Move guide up" className={smallButton} disabled={index === 0} onClick={() => onMove(-1)} type="button">↑</button><button aria-label="Move guide down" className={smallButton} disabled={index === total - 1} onClick={() => onMove(1)} type="button">↓</button><button className={dangerButton} onClick={onRemove} type="button">Remove</button></div>{error ? <span className="text-xs text-red-300 md:col-start-3">{error}</span> : warning ? <span className="text-xs text-amber-300 md:col-start-3">{warning}</span> : null}</div>;
}

function draftFromScenario(scenario: CreatorRecommendationWorkspace['scenarios'][number]): CreatorDraft {
  const record = scenario.creatorRecommendation;
  if (record) return { scenarioId: scenario.id, enabled: record.enabled, headline: record.headline, subheadline: record.subheadline, description: record.description, warningText: record.warningText, primaryCtaLabel: record.primaryCtaLabel, primaryCtaUrl: record.primaryCtaUrl, secondaryCtaLabel: record.secondaryCtaLabel, secondaryCtaUrl: record.secondaryCtaUrl, groups: record.groups.map((group) => ({ localId: group.id, title: group.title, description: group.description, enabled: group.enabled, productIds: group.assignments.map((assignment) => assignment.productId) })), guides: record.guides.map((guide) => ({ localId: guide.id, label: guide.label, url: guide.url, enabled: guide.enabled })) };
  const defaults = CREATOR_SCENARIO_DEFAULTS[scenario.code];
  return { scenarioId: scenario.id, enabled: false, ...defaults, groups: [], guides: [] };
}

function emptyDraft(): CreatorDraft { return { scenarioId: '', enabled: false, headline: '', subheadline: '', description: '', warningText: '', primaryCtaLabel: '', primaryCtaUrl: '', secondaryCtaLabel: '', secondaryCtaUrl: '', groups: [], guides: [] }; }
function toInput(draft: CreatorDraft): CreatorRecommendationInput { return { ...draft, groups: draft.groups.map(({ title, description, enabled, productIds }) => ({ title, description, enabled, productIds })), guides: draft.guides.map(({ label, url, enabled }) => ({ label, url, enabled })) }; }
function hasMeaningfulDraft(draft: CreatorDraft) { return Boolean(draft.headline.trim() || draft.subheadline.trim() || draft.description.trim() || draft.warningText.trim() || draft.groups.length || draft.guides.length || draft.enabled); }
function moveItem<T>(items: T[], index: number, direction: -1 | 1) { const destination = index + direction; if (destination < 0 || destination >= items.length) return items; const output = [...items]; [output[index], output[destination]] = [output[destination], output[index]]; return output; }

function toPreviewPayload(code: CoreRecommendationScenarioCode, draft: CreatorDraft, products: Map<string, ProductRecord>): PublicCreatorRecommendationPayload {
  return { scenarioCode: code, source: 'custom', headline: draft.headline || 'Creator headline', subheadline: draft.subheadline || 'Creator subheadline', description: draft.description || 'Creator description', warningText: draft.warningText, primaryCtaLabel: draft.primaryCtaLabel || 'Build My Streaming Setup', primaryCtaUrl: draft.primaryCtaUrl || CREATOR_SETUP_BUILDER_PATH, secondaryCtaLabel: draft.secondaryCtaLabel, secondaryCtaUrl: draft.secondaryCtaUrl, groups: draft.groups.filter((group) => group.enabled).map((group) => ({ id: group.localId, title: group.title || 'Creator product group', description: group.description, products: group.productIds.flatMap((productId, index) => { const product = products.get(productId); return product && product.enabled && isReadyUrl(product.affiliateUrl) ? [toPreviewProduct(product, group.localId, index)] : []; }) })).filter((group) => group.products.length > 0), guides: draft.guides.filter((guide) => guide.enabled && guide.label && guide.url).map((guide) => ({ id: guide.localId, label: guide.label, url: guide.url })) };
}

function toPreviewProduct(product: ProductRecord, groupId: string, index: number): AffiliateProductRecord { return { id: `${groupId}-${product.id}`, productId: product.id, sectionId: groupId, title: product.title, retailer: product.retailer, affiliateUrl: product.affiliateUrl, imageUrl: product.imageUrl, priceText: product.defaultPriceText, badge: 'None', shortDescription: product.shortDescription, buttonText: product.retailer === 'Other' ? 'Check Current Price' : `View on ${product.retailer}`, componentType: product.componentType, platform: product.platform, enabled: true, displayOrder: index * 10, createdAt: '', updatedAt: '' }; }
function isReadyUrl(value: string) { try { const url = new URL(value); return url.protocol === 'https:' && url.hostname !== 'example.com'; } catch { return false; } }
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"><div className="mx-auto my-6 max-w-5xl rounded-3xl border border-white/15 bg-[#0d111d] p-5 shadow-2xl sm:p-6"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black">{title}</h2><button className={secondaryButton} onClick={onClose} type="button">Close</button></div>{children}</div></div>; }
function Field({ label, children, error, warning }: { label: string; children: ReactNode; error?: string; warning?: string }) { return <label className="grid gap-2 text-sm font-bold text-slate-300"><span>{label}</span>{children}{error ? <span className="text-xs font-semibold text-red-300">{error}</span> : warning ? <span className="text-xs font-semibold text-amber-300">{warning}</span> : null}</label>; }
function StatusMessage({ children, error }: { children: ReactNode; error: boolean }) { return <p aria-live="polite" className={`mt-4 rounded-xl border px-3 py-2 text-sm ${error ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'}`}>{children}</p>; }
function WarningMessage({ warnings }: { warnings: string[] }) { return <div aria-live="polite" className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"><p className="font-black">Destination warning</p><ul className="mt-1 list-disc pl-5">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>; }

const panelClass = 'rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5';
const inputClass = 'w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/60 disabled:opacity-50';
const primaryButton = 'rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 disabled:opacity-50';
const dangerButton = 'rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-50';
const smallButton = 'rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30';
