'use client';

/* eslint-disable @next/next/no-html-link-for-pages -- The catalog link intentionally performs a full authenticated navigation. */

import { useState, type ReactNode } from 'react';

import {
  AFFILIATE_BADGES,
  PRODUCT_COMPONENT_TYPES,
  PRODUCT_VALUE_TIERS,
  type AffiliateProductRecord,
  type ProductRecord,
  type RecommendationAssignmentRecord,
  type RecommendationRuleRecord,
  type RecommendationWorkspace,
} from '../../lib/affiliate-types';
import type { AssignmentInput, AssignmentUpdateInput } from '../../lib/catalog-validation';
import { RecommendationProductCard } from '../RecommendationProductCard';
import { AdminHeader } from './AdminHeader';
import { CatalogProductPicker } from './CatalogProductPicker';

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

interface LaunchPreview {
  scenarios: Array<{
    code: string;
    rulesToCreate: number;
    rulesToUpdate: number;
    manualRulesProtected: number;
    creatorRulesToCreate: number;
    creatorRulesToUpdate: number;
    manualCreatorRulesProtected: number;
  }>;
}

interface AuditReport {
  generatedAt: string;
  scenarios: Array<{
    scenario: string;
    status: string;
    sectionsRendered: string[];
    productsSelected: number;
    selectedValueTiers: string[];
    fallbacksUsed: string[];
    missingComponentTypes: string[];
    creatorGroupsRendered: string[];
    emptyRules: string[];
  }>;
  summary: Record<string, number>;
}

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
  const [launchPreview, setLaunchPreview] = useState<LaunchPreview | null>(null);
  const [launchSelection, setLaunchSelection] = useState<string[]>([]);
  const [overwriteManual, setOverwriteManual] = useState(false);
  const [audit, setAudit] = useState<AuditReport | null>(null);
  const [ruleEditor, setRuleEditor] = useState<RecommendationRuleRecord | null>(null);

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

  const loadLaunchPreview = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/recommendation-rules/launch-defaults', {
        cache: 'no-store',
      });
      const payload = (await response.json()) as { error?: string; preview?: LaunchPreview };
      if (!response.ok || !payload.preview) {
        throw new Error(payload.error || 'Launch-default preview could not be loaded.');
      }
      setLaunchPreview(payload.preview);
      setLaunchSelection(payload.preview.scenarios.map((scenario) => scenario.code));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Preview failed.');
    } finally {
      setBusy(false);
    }
  };

  const runAudit = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/recommendation-rules/audit', {
        cache: 'no-store',
      });
      const payload = (await response.json()) as { error?: string; audit?: AuditReport };
      if (!response.ok || !payload.audit) {
        throw new Error(payload.error || 'Scenario audit could not be completed.');
      }
      setAudit(payload.audit);
      setNotice('All recommendation scenarios audited.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Audit failed.');
    } finally {
      setBusy(false);
    }
  };

  const applyDefaults = async () => {
    const saved = await request(
      '/api/admin/recommendation-rules/launch-defaults',
      'POST',
      { scenarioCodes: launchSelection, overwriteManual },
    );
    if (saved) setLaunchPreview(null);
  };

  const updateRule = async (rule: RecommendationRuleRecord) => {
    const saved = await request(`/api/admin/recommendation-rules/${rule.id}`, 'PATCH', rule);
    if (saved) setRuleEditor(null);
  };

  const resetRule = async (rule: RecommendationRuleRecord) => {
    if (!window.confirm(`Reset "${rule.title}" to its launch defaults? Explicit rule overrides will be removed; existing section assignments will be kept.`)) return;
    await request(`/api/admin/recommendation-rules/${rule.id}`, 'PATCH', { action: 'reset' });
  };

  const setRuleOverride = async (
    rule: RecommendationRuleRecord,
    productId: string,
    action: 'PIN' | 'EXCLUDE' | 'RESET',
  ) => {
    await request(`/api/admin/recommendation-rules/${rule.id}/overrides`, 'POST', {
      productId,
      action,
    });
  };

  return (
    <main className="admin-theme min-h-screen px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <AdminHeader active="recommendations" />

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">Scenario placement</p>
            <h1 className="mt-2 text-3xl font-black">Recommendations</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Assign existing catalog products to one or more result sections. Removing an assignment never deletes its product.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={primaryButton} disabled={busy} onClick={() => void loadLaunchPreview()} type="button">Apply Launch Defaults</button>
              <button className={secondaryButton} disabled={busy} onClick={() => void runAudit()} type="button">Audit All Scenarios</button>
              <a className={secondaryButton} href="/">Open Public Checker</a>
            </div>
          </div>
          {(notice || error) ? <StatusMessage error={error}>{error || notice}</StatusMessage> : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="self-start rounded-2xl border border-white/10 bg-black/20 p-3 lg:sticky lg:top-4">
              <label className="grid gap-2 text-sm font-bold text-slate-300">Scenario<select className={inputClass} onChange={(event) => selectScenario(event.target.value)} value={selectedScenario?.id ?? ''}>{workspace.scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.code}</option>)}</select></label>
              {selectedScenario ? (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
                  <span className="text-slate-400">Rule status</span>
                  <span className={
                    selectedScenario.rules?.length
                      ? selectedScenario.rules.some((rule) => rule.source === 'MANUAL' || rule.mode === 'MANUAL')
                        ? enabledBadge
                        : 'rounded-full bg-violet-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-violet-300'
                      : disabledBadge
                  }>
                    {selectedScenario.rules?.length
                      ? selectedScenario.rules.some((rule) => rule.source === 'MANUAL' || rule.mode === 'MANUAL')
                        ? 'Manual Override'
                        : 'Automatic'
                      : 'Incomplete'}
                  </span>
                </div>
              ) : null}
              <div className="mt-4 grid gap-2">
                {selectedScenario?.sections.map((section) => <button className={`rounded-xl border px-3 py-3 text-left text-sm ${selectedSection?.id === section.id ? 'border-violet-400/50 bg-violet-500/10' : 'border-white/10 bg-white/[0.03]'}`} key={section.id} onClick={() => { setSelectedSectionId(section.id); setSelectedAssignmentIds([]); }} type="button"><span className="block font-bold">{section.title}</span><span className="mt-1 block text-xs text-slate-500">{section.assignments?.length ?? 0} assignments</span></button>)}
              </div>
            </aside>

            <div className="min-w-0">
              {selectedScenario?.rules?.length ? (
                <section className="mb-5 rounded-2xl border border-violet-300/15 bg-violet-500/[0.04] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-violet-300">Automatic selection rules</p>
                      <h2 className="mt-1 text-xl font-black">Scenario recommendations</h2>
                    </div>
                    {workspace.catalogSummary ? (
                      <p className="text-xs leading-5 text-slate-400">
                        {workspace.catalogSummary.enabledProducts} enabled · {workspace.catalogSummary.disabledProducts} disabled · {workspace.catalogSummary.invalidUrls} invalid URLs · {workspace.catalogSummary.missingImages} missing images
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-3">
                    {selectedScenario.rules.map((rule) => (
                      <RuleCard
                        busy={busy}
                        key={rule.id}
                        onEdit={() => setRuleEditor(rule)}
                        onOverride={(productId, action) => void setRuleOverride(rule, productId, action)}
                        onReset={() => void resetRule(rule)}
                        products={workspace.products}
                        rule={rule}
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <div className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] p-4 text-sm text-amber-100">
                  This scenario has no automatic rules yet. Preview and apply the launch defaults above.
                </div>
              )}
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
      {launchPreview ? (
        <Modal onClose={() => setLaunchPreview(null)} title="Apply Launch Defaults">
          <p className="mt-3 text-sm leading-6 text-slate-400">Preview the rule records that will be created or refreshed. Product records and manual assignments are never changed.</p>
          <div className="mt-4 grid max-h-[55vh] gap-2 overflow-y-auto pr-1">
            {launchPreview.scenarios.map((scenario) => (
              <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm" key={scenario.code}>
                <input checked={launchSelection.includes(scenario.code)} className="mt-1 size-4 accent-violet-500" onChange={(event) => setLaunchSelection((current) => event.target.checked ? [...current, scenario.code] : current.filter((code) => code !== scenario.code))} type="checkbox" />
                <span><strong className="block">{scenario.code}</strong><span className="text-xs text-slate-400">{scenario.rulesToCreate} rules to create · {scenario.rulesToUpdate} to refresh · {scenario.manualRulesProtected} manual protected · {scenario.creatorRulesToCreate} creator rules to create</span></span>
              </label>
            ))}
          </div>
          <label className="mt-4 flex items-start gap-3 text-sm text-amber-100"><input checked={overwriteManual} className="mt-1 size-4 accent-amber-400" onChange={(event) => setOverwriteManual(event.target.checked)} type="checkbox" /><span>Overwrite manually customized rule settings. Existing manual product assignments are still preserved.</span></label>
          <button className={`${primaryButton} mt-5`} disabled={busy || launchSelection.length === 0} onClick={() => void applyDefaults()} type="button">{busy ? 'Applying…' : `Apply to ${launchSelection.length} scenarios`}</button>
        </Modal>
      ) : null}
      {audit ? (
        <Modal onClose={() => setAudit(null)} title="Recommendation Scenario Audit">
          <p className="mt-3 text-xs text-slate-500">Generated {new Date(audit.generatedAt).toLocaleString()}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(audit.summary).map(([label, value]) => <div className="rounded-xl border border-white/10 bg-black/20 p-3" key={label}><span className="block text-xl font-black">{value}</span><span className="text-[10px] uppercase tracking-wide text-slate-500">{label.replaceAll(/([A-Z])/g, ' $1')}</span></div>)}</div>
          <div className="mt-4 grid max-h-[55vh] gap-2 overflow-y-auto pr-1">{audit.scenarios.map((scenario) => <article className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm" key={scenario.scenario}><div className="flex items-center justify-between gap-3"><strong>{scenario.scenario}</strong><span className={scenario.status === 'Incomplete' ? disabledBadge : enabledBadge}>{scenario.status}</span></div><p className="mt-2 text-xs leading-5 text-slate-400">{scenario.sectionsRendered.join(' · ') || 'No rendered sections'}<br />{scenario.productsSelected} products · {scenario.selectedValueTiers.join(', ') || 'No tiers'}{scenario.fallbacksUsed.length ? ` · fallback: ${scenario.fallbacksUsed.join(', ')}` : ''}{scenario.missingComponentTypes.length ? ` · missing: ${scenario.missingComponentTypes.join(', ')}` : ''}</p></article>)}</div>
        </Modal>
      ) : null}
      {ruleEditor ? (
        <Modal onClose={() => setRuleEditor(null)} title="Edit Recommendation Rule">
          <RuleForm busy={busy} onSave={updateRule} rule={ruleEditor} />
        </Modal>
      ) : null}
    </main>
  );
}

function RuleCard({ rule, products, busy, onEdit, onReset, onOverride }: { rule: RecommendationRuleRecord; products: ProductRecord[]; busy: boolean; onEdit: () => void; onReset: () => void; onOverride: (productId: string, action: 'PIN' | 'EXCLUDE' | 'RESET') => void }) {
  const [pinProductId, setPinProductId] = useState('');
  const availableProducts = products.filter((product) => !rule.overrides.some((override) => override.productId === product.id));
  return <article className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{rule.title}</h3><span className={rule.source === 'MANUAL' || rule.mode === 'MANUAL' ? enabledBadge : 'rounded-full bg-violet-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-violet-300'}>{rule.mode === 'MANUAL' ? 'Manual Override' : 'Automatic'}</span>{!rule.enabled ? <span className={disabledBadge}>Disabled</span> : null}</div><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">{rule.description}</p></div><div className="flex gap-2"><button className={secondaryButton} onClick={onEdit} type="button">Edit Rule</button><button className={secondaryButton} disabled={busy} onClick={onReset} type="button">Reset</button></div></div><div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-4"><span><strong className="text-slate-200">{rule.summary.eligibleProducts}</strong> eligible</span><span><strong className="text-slate-200">{rule.summary.selectedProducts}</strong> selected / {rule.maxProducts}</span><span>{rule.allowedComponentTypes.join(', ') || 'Guidance only'}</span><span>{rule.allowedValueTiers.join(', ') || 'No tier filter'}</span></div>{rule.summary.missingComponentTypes.length || rule.summary.invalidProducts || rule.summary.disabledProducts ? <p className="mt-2 text-xs text-amber-200">Missing: {rule.summary.missingComponentTypes.join(', ') || 'none'} · Invalid URLs: {rule.summary.invalidProducts} · Disabled: {rule.summary.disabledProducts}</p> : null}<div className="mt-3 flex flex-wrap gap-2">{rule.previewProducts.map((product) => <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs" key={product.id}>{product.title}<button className="font-black text-red-300" disabled={busy} onClick={() => onOverride(product.id, 'EXCLUDE')} type="button">Exclude</button></span>)}</div>{rule.overrides.length ? <div className="mt-3 flex flex-wrap gap-2">{rule.overrides.map((override) => <span className="inline-flex items-center gap-2 rounded-lg border border-violet-300/20 bg-violet-500/10 px-2.5 py-1.5 text-xs" key={override.id}>{override.action}: {override.product.title}<button className="font-black text-slate-300" disabled={busy} onClick={() => onOverride(override.productId, 'RESET')} type="button">Clear</button></span>)}</div> : null}<div className="mt-3 flex gap-2"><select className={inputClass} onChange={(event) => setPinProductId(event.target.value)} value={pinProductId}><option value="">Pin an existing product…</option>{availableProducts.map((product) => <option key={product.id} value={product.id}>{product.title} — {product.valueTier ?? 'No tier'}</option>)}</select><button className={secondaryButton} disabled={busy || !pinProductId} onClick={() => { onOverride(pinProductId, 'PIN'); setPinProductId(''); }} type="button">Pin</button></div></article>;
}

function RuleForm({ rule, busy, onSave }: { rule: RecommendationRuleRecord; busy: boolean; onSave: (rule: RecommendationRuleRecord) => void }) {
  const [draft, setDraft] = useState(rule);
  const toggle = (field: 'allowedComponentTypes' | 'fallbackComponentTypes' | 'allowedValueTiers' | 'tierPriority' | 'fallbackValueTiers', value: string, checked: boolean) => setDraft((current) => ({ ...current, [field]: checked ? Array.from(new Set([...current[field], value])) : current[field].filter((item) => item !== value) }));
  return <form className="mt-4 grid gap-4" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}><Field label="Section title"><input className={inputClass} onChange={(event) => setDraft({ ...draft, title: event.target.value })} value={draft.title} /></Field><Field label="Description"><textarea className={`${inputClass} min-h-20`} onChange={(event) => setDraft({ ...draft, description: event.target.value })} value={draft.description} /></Field><div className="grid gap-4 sm:grid-cols-3"><Field label="Mode"><select className={inputClass} onChange={(event) => setDraft({ ...draft, mode: event.target.value as RecommendationRuleRecord['mode'] })} value={draft.mode}><option value="AUTOMATIC">Automatic</option><option value="MANUAL">Manual override</option></select></Field><Field label="Product limit"><input className={inputClass} max={12} min={0} onChange={(event) => setDraft({ ...draft, maxProducts: Number(event.target.value) })} type="number" value={draft.maxProducts} /></Field><Field label="Sort order"><select className={inputClass} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value as RecommendationRuleRecord['sortOrder'] })} value={draft.sortOrder}><option value="TIER_DIVERSITY">Tier diversity</option><option value="COMPONENT_DIVERSITY">Component diversity</option><option value="ADMIN_ORDER">Admin order</option></select></Field></div><RuleChecks label="Allowed component types" options={[...PRODUCT_COMPONENT_TYPES, 'Gaming Desktop', 'Prebuilt Laptop']} selected={draft.allowedComponentTypes} onToggle={(value, checked) => toggle('allowedComponentTypes', value, checked)} /><RuleChecks label="Allowed Value Tiers" options={PRODUCT_VALUE_TIERS} selected={draft.allowedValueTiers} onToggle={(value, checked) => toggle('allowedValueTiers', value, checked)} /><RuleChecks label="Tier priority" options={PRODUCT_VALUE_TIERS} selected={draft.tierPriority} onToggle={(value, checked) => toggle('tierPriority', value, checked)} /><RuleChecks label="Fallback component types" options={[...PRODUCT_COMPONENT_TYPES, 'Gaming Desktop', 'Prebuilt Laptop']} selected={draft.fallbackComponentTypes} onToggle={(value, checked) => toggle('fallbackComponentTypes', value, checked)} /><RuleChecks label="Fallback Value Tiers" options={PRODUCT_VALUE_TIERS} selected={draft.fallbackValueTiers} onToggle={(value, checked) => toggle('fallbackValueTiers', value, checked)} /><label className="flex items-center gap-3 text-sm font-bold"><input checked={draft.enabled} className="size-4 accent-violet-500" onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} type="checkbox" />Rule enabled</label><label className="flex items-center gap-3 text-sm font-bold"><input checked={draft.collapsedByDefault} className="size-4 accent-violet-500" onChange={(event) => setDraft({ ...draft, collapsedByDefault: event.target.checked })} type="checkbox" />Collapsed by default</label><button className={primaryButton} disabled={busy || !draft.title.trim() || !draft.description.trim()} type="submit">{busy ? 'Saving…' : 'Save Rule'}</button></form>;
}

function RuleChecks({ label, options, selected, onToggle }: { label: string; options: readonly string[]; selected: readonly string[]; onToggle: (value: string, checked: boolean) => void }) {
  return <fieldset><legend className="text-sm font-bold text-slate-300">{label}</legend><div className="mt-2 flex flex-wrap gap-2">{options.map((option) => <label className={`rounded-lg border px-2.5 py-1.5 text-xs ${selected.includes(option) ? 'border-violet-300/40 bg-violet-500/15 text-violet-100' : 'border-white/10 text-slate-400'}`} key={option}><input checked={selected.includes(option)} className="mr-1.5 accent-violet-500" onChange={(event) => onToggle(option, event.target.checked)} type="checkbox" />{option}</label>)}</div></fieldset>;
}

function AssignmentForm({ workspace, currentSectionId, source, busy, fieldErrors, onSave }: { workspace: RecommendationWorkspace; currentSectionId: string; source: RecommendationAssignmentRecord | null; busy: boolean; fieldErrors: Record<string, string>; onSave: (input: AssignmentInput) => void }) {
  const [productIds, setProductIds] = useState<string[]>(source ? [source.productId] : []);
  const [sectionIds, setSectionIds] = useState<string[]>(source ? [] : currentSectionId ? [currentSectionId] : []);
  const [badge, setBadge] = useState<AssignmentInput['badge']>(source?.badge ?? 'None');
  const [buttonText, setButtonText] = useState(source?.buttonText ?? 'View Product');
  const [overridePriceText, setOverridePriceText] = useState(source?.overridePriceText ?? '');
  const [overrideDescription, setOverrideDescription] = useState(source?.overrideDescription ?? '');
  const [enabled, setEnabled] = useState(source?.enabled ?? true);
  const [displayOrder, setDisplayOrder] = useState('');
  const localErrors = { ...fieldErrors };
  if (productIds.length === 0) localErrors.productIds = 'Choose at least one product.';
  if (sectionIds.length === 0) localErrors.sectionIds = 'Choose at least one destination section.';
  if (!buttonText.trim()) localErrors.buttonText = 'Button text is required.';

  const toggleScenario = (sectionIdsForScenario: string[], checked: boolean) => setSectionIds((current) => checked ? Array.from(new Set([...current, ...sectionIdsForScenario])) : current.filter((id) => !sectionIdsForScenario.includes(id)));

  return <form className="mt-4 grid gap-5" onSubmit={(event) => { event.preventDefault(); if (productIds.length && sectionIds.length && buttonText.trim()) onSave({ productIds, sectionIds, badge, buttonText, overridePriceText: overridePriceText.trim() || null, overrideDescription: overrideDescription.trim() || null, enabled, displayOrder: displayOrder === '' ? null : Number(displayOrder) }); }}>
    <section><div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-black">Products</h3><a className={secondaryButton} href="/admin/products?new=1">Create New Product</a></div><CatalogProductPicker onSelectionChange={setProductIds} products={workspace.products} selectedProductIds={productIds} selectionLocked={Boolean(source)} />{localErrors.productIds ? <FieldError>{localErrors.productIds}</FieldError> : null}</section>
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
