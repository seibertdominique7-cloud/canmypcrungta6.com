'use client';

import { useMemo, useState, type ReactNode } from 'react';

import {
  AFFILIATE_BADGES,
  AFFILIATE_COMPONENT_TYPES,
  AFFILIATE_RETAILERS,
  GAME_PURCHASE_PLATFORMS,
  type AffiliateProductRecord,
  type RecommendationScenarioRecord,
  type RecommendationSectionRecord,
} from '../../lib/affiliate-types';
import type {
  AffiliateProductInput,
  RecommendationSectionInput,
  ScenarioInput,
} from '../../lib/affiliate-validation';
import { RecommendationProductCard } from '../RecommendationProductCard';

interface AffiliateAdminDashboardProps {
  initialScenarios: RecommendationScenarioRecord[];
}

interface AdminResponse {
  error?: string;
  warnings?: string[];
  scenarios?: RecommendationScenarioRecord[];
}

type Editor =
  | { kind: 'scenario'; value: RecommendationScenarioRecord | null }
  | { kind: 'section'; value: RecommendationSectionRecord | null }
  | { kind: 'product'; value: AffiliateProductRecord | null }
  | null;

type AvailabilityFilter = 'all' | 'enabled' | 'disabled';
type AdminSort = 'order' | 'title' | 'status' | 'retailer';
type DraggedItem = { kind: 'scenario' | 'section' | 'product'; id: string } | null;

export function AffiliateAdminDashboard({
  initialScenarios,
}: AffiliateAdminDashboardProps) {
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [selectedScenarioId, setSelectedScenarioId] = useState(
    initialScenarios[0]?.id ?? '',
  );
  const [selectedSectionId, setSelectedSectionId] = useState(
    initialScenarios[0]?.sections[0]?.id ?? '',
  );
  const [editor, setEditor] = useState<Editor>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [scenarioQuery, setScenarioQuery] = useState('');
  const [scenarioStatus, setScenarioStatus] = useState<AvailabilityFilter>('all');
  const [scenarioSort, setScenarioSort] = useState<AdminSort>('order');
  const [sectionQuery, setSectionQuery] = useState('');
  const [sectionStatus, setSectionStatus] = useState<AvailabilityFilter>('all');
  const [sectionSort, setSectionSort] = useState<AdminSort>('order');
  const [productQuery, setProductQuery] = useState('');
  const [productStatus, setProductStatus] = useState<AvailabilityFilter>('all');
  const [productSort, setProductSort] = useState<AdminSort>('order');
  const [productRetailer, setProductRetailer] = useState('all');
  const [draggedItem, setDraggedItem] = useState<DraggedItem>(null);

  const selectedScenario =
    scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0] ?? null;
  const selectedSection =
    selectedScenario?.sections.find((section) => section.id === selectedSectionId) ??
    selectedScenario?.sections[0] ??
    null;
  const sectionOptions = useMemo(
    () =>
      scenarios.flatMap((scenario) =>
        scenario.sections.map((section) => ({
          section,
          label: `${scenario.displayName} — ${section.title}`,
        })),
      ),
    [scenarios],
  );
  const visibleScenarios = useMemo(
    () =>
      filterAndSort(
        scenarios,
        scenarioQuery,
        scenarioStatus,
        scenarioSort,
        (scenario) =>
          `${scenario.code} ${scenario.displayName} ${scenario.resultHeading}`,
        (scenario) => scenario.displayName,
      ),
    [scenarios, scenarioQuery, scenarioSort, scenarioStatus],
  );
  const visibleSections = useMemo(
    () =>
      filterAndSort(
        selectedScenario?.sections ?? [],
        sectionQuery,
        sectionStatus,
        sectionSort,
        (section) => `${section.title} ${section.description} ${section.purpose}`,
        (section) => section.title,
      ),
    [selectedScenario, sectionQuery, sectionSort, sectionStatus],
  );
  const visibleProducts = useMemo(() => {
    const products = filterAndSort(
      selectedSection?.products ?? [],
      productQuery,
      productStatus,
      productSort,
      (product) =>
        `${product.title} ${product.retailer} ${product.componentType} ${product.badge}`,
      (product) => product.title,
      (product) => product.retailer,
    );
    return productRetailer === 'all'
      ? products
      : products.filter((product) => product.retailer === productRetailer);
  }, [
    productQuery,
    productRetailer,
    productSort,
    productStatus,
    selectedSection,
  ]);
  const canDragScenarios =
    !scenarioQuery && scenarioStatus === 'all' && scenarioSort === 'order';
  const canDragSections =
    !sectionQuery && sectionStatus === 'all' && sectionSort === 'order';
  const canDragProducts =
    !productQuery &&
    productStatus === 'all' &&
    productRetailer === 'all' &&
    productSort === 'order';
  const totalSections = scenarios.reduce(
    (total, scenario) => total + scenario.sections.length,
    0,
  );
  const totalProducts = scenarios.reduce(
    (scenarioTotal, scenario) =>
      scenarioTotal +
      scenario.sections.reduce(
        (sectionTotal, section) => sectionTotal + section.products.length,
        0,
      ),
    0,
  );

  const selectScenario = (scenario: RecommendationScenarioRecord) => {
    setSelectedScenarioId(scenario.id);
    setSelectedSectionId(scenario.sections[0]?.id ?? '');
  };

  const applyResponse = (payload: AdminResponse) => {
    if (payload.scenarios) setScenarios(payload.scenarios);
    setNotice(payload.warnings?.join(' ') ?? 'Saved.');
  };

  const request = async (
    url: string,
    method: 'POST' | 'PATCH' | 'DELETE',
    body?: unknown,
  ) => {
    setBusy(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const payload = (await response.json()) as AdminResponse;

      if (!response.ok) throw new Error(payload.error || 'The request failed.');
      applyResponse(payload);
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The request failed.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const reorder = async (
    kind: Exclude<DraggedItem, null>['kind'],
    draggedId: string,
    targetId: string,
  ) => {
    if (draggedId === targetId) return;

    const items =
      kind === 'scenario'
        ? scenarios
        : kind === 'section'
          ? selectedScenario?.sections ?? []
          : selectedSection?.products ?? [];
    const orderedIds = moveIdBefore(
      items.map((item) => item.id),
      draggedId,
      targetId,
    );
    const url =
      kind === 'scenario'
        ? `/api/admin/scenarios/${draggedId}`
        : kind === 'section'
          ? `/api/admin/sections/${draggedId}`
          : `/api/admin/affiliate-links/${draggedId}`;

    await request(url, 'PATCH', { action: 'reorder', orderedIds });
    setDraggedItem(null);
  };

  const saveScenario = async (input: ScenarioInput, id?: string) => {
    const saved = await request(
      id ? `/api/admin/scenarios/${id}` : '/api/admin/scenarios',
      id ? 'PATCH' : 'POST',
      input,
    );
    if (saved) setEditor(null);
  };

  const saveSection = async (input: RecommendationSectionInput, id?: string) => {
    const saved = await request(
      id ? `/api/admin/sections/${id}` : '/api/admin/sections',
      id ? 'PATCH' : 'POST',
      input,
    );
    if (saved) setEditor(null);
  };

  const saveProduct = async (input: AffiliateProductInput, id?: string) => {
    const saved = await request(
      id ? `/api/admin/affiliate-links/${id}` : '/api/admin/affiliate-links',
      id ? 'PATCH' : 'POST',
      input,
    );
    if (saved) setEditor(null);
  };

  return (
    <main className="admin-theme min-h-screen px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">
              Private admin
            </p>
            <h1 className="mt-2 text-3xl font-black">Recommendation Manager</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Choose a result scenario, then a section, then manage the products shown
              to visitors. Changes are stored in the database—no source edits required.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className={secondaryButton} href="/admin/subscribers">Subscribers</a>
            <form action="/api/admin/logout" method="post">
              <button className={secondaryButton} type="submit">Log out</button>
            </form>
          </div>
        </header>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <AdminMetric label="Scenarios" value={scenarios.length} />
          <AdminMetric label="Sections" value={totalSections} />
          <AdminMetric label="Products" value={totalProducts} />
        </div>

        {(notice || error) && (
          <div
            className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
              error
                ? 'border-red-400/30 bg-red-500/10 text-red-200'
                : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
            }`}
          >
            {error || notice}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="self-start rounded-3xl border border-white/10 bg-white/[0.04] p-4 lg:sticky lg:top-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Step 1
                </p>
                <h2 className="font-black">Scenarios</h2>
              </div>
              <button
                className={smallButton}
                disabled={busy}
                onClick={() => setEditor({ kind: 'scenario', value: null })}
                type="button"
              >
                Add
              </button>
            </div>
            <AdminToolbar
              onQueryChange={setScenarioQuery}
              onSortChange={setScenarioSort}
              onStatusChange={setScenarioStatus}
              query={scenarioQuery}
              searchLabel="Search scenarios"
              sort={scenarioSort}
              sortOptions={baseSortOptions}
              status={scenarioStatus}
            />
            <DragHint enabled={canDragScenarios} />
            <div className="grid max-h-[70vh] gap-2 overflow-y-auto pr-1">
              {visibleScenarios.map((scenario) => {
                const scenarioIndex = scenarios.findIndex((item) => item.id === scenario.id);
                const productCount = scenario.sections.reduce(
                  (total, section) => total + section.products.length,
                  0,
                );
                return (
                  <div
                    className={`rounded-2xl border p-3 transition ${
                      selectedScenario?.id === scenario.id
                        ? 'border-violet-400/50 bg-violet-500/10'
                        : 'border-white/10 bg-black/15 hover:border-white/20'
                    } ${draggedItem?.id === scenario.id ? 'opacity-45' : ''} ${canDragScenarios ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    draggable={canDragScenarios && !busy}
                    key={scenario.id}
                    onDragEnd={() => setDraggedItem(null)}
                    onDragOver={(event) => {
                      if (canDragScenarios) event.preventDefault();
                    }}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      setDraggedItem({ kind: 'scenario', id: scenario.id });
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggedItem?.kind === 'scenario') {
                        void reorder('scenario', draggedItem.id, scenario.id);
                      }
                    }}
                  >
                    <button
                      className="w-full text-left"
                      onClick={() => selectScenario(scenario)}
                      type="button"
                    >
                      <span className="block text-sm font-bold">{scenario.displayName}</span>
                      <span className="mt-1 block text-[11px] text-slate-500">
                        {scenario.code} · {scenario.sections.length} sections · {productCount} products
                      </span>
                    </button>
                    <div className="mt-2 flex gap-1">
                      <IconButton
                        disabled={busy || scenarioIndex === 0}
                        label="Move scenario up"
                        onClick={() => request(`/api/admin/scenarios/${scenario.id}`, 'PATCH', { action: 'move', direction: 'up' })}
                      >↑</IconButton>
                      <IconButton
                        disabled={busy || scenarioIndex === scenarios.length - 1}
                        label="Move scenario down"
                        onClick={() => request(`/api/admin/scenarios/${scenario.id}`, 'PATCH', { action: 'move', direction: 'down' })}
                      >↓</IconButton>
                      <IconButton label="Edit scenario" onClick={() => setEditor({ kind: 'scenario', value: scenario })}>Edit</IconButton>
                      <IconButton
                        label={scenario.enabled ? 'Disable scenario' : 'Enable scenario'}
                        onClick={() => request(`/api/admin/scenarios/${scenario.id}`, 'PATCH', { ...toScenarioInput(scenario), enabled: !scenario.enabled })}
                      >{scenario.enabled ? 'On' : 'Off'}</IconButton>
                      {!scenario.isCore ? (
                        <IconButton
                          label="Delete scenario"
                          onClick={() => confirmAction('Delete this empty scenario?', () => request(`/api/admin/scenarios/${scenario.id}`, 'DELETE'))}
                        >Delete</IconButton>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {visibleScenarios.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">
                  No scenarios match these filters.
                </p>
              ) : null}
            </div>
          </aside>

          <section className="min-w-0">
            {selectedScenario ? (
              <>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">
                        {selectedScenario.code}
                      </p>
                      <h2 className="mt-2 text-2xl font-black">{selectedScenario.resultHeading}</h2>
                      <p className="mt-2 text-sm text-slate-400">{selectedScenario.resultDescription}</p>
                    </div>
                    <span className={selectedScenario.enabled ? enabledBadge : disabledBadge}>
                      {selectedScenario.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Step 2</p>
                      <h3 className="font-black">Recommendation sections</h3>
                    </div>
                    <button
                      className={primaryButton}
                      disabled={busy}
                      onClick={() => setEditor({ kind: 'section', value: null })}
                      type="button"
                    >
                      Add section
                    </button>
                  </div>

                  <div className="mt-4">
                    <AdminToolbar
                      onQueryChange={setSectionQuery}
                      onSortChange={setSectionSort}
                      onStatusChange={setSectionStatus}
                      query={sectionQuery}
                      searchLabel="Search sections"
                      sort={sectionSort}
                      sortOptions={baseSortOptions}
                      status={sectionStatus}
                    />
                    <DragHint enabled={canDragSections} />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {visibleSections.map((section) => {
                      const sectionIndex = selectedScenario.sections.findIndex(
                        (item) => item.id === section.id,
                      );
                      return (
                        <div
                        className={`rounded-2xl border p-4 transition ${
                          selectedSection?.id === section.id
                            ? 'border-violet-400/50 bg-violet-500/10'
                            : 'border-white/10 bg-black/15'
                        } ${draggedItem?.id === section.id ? 'opacity-45' : ''} ${canDragSections ? 'cursor-grab active:cursor-grabbing' : ''}`}
                        draggable={canDragSections && !busy}
                        key={section.id}
                        onDragEnd={() => setDraggedItem(null)}
                        onDragOver={(event) => {
                          if (canDragSections) event.preventDefault();
                        }}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move';
                          setDraggedItem({ kind: 'section', id: section.id });
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (draggedItem?.kind === 'section') {
                            void reorder('section', draggedItem.id, section.id);
                          }
                        }}
                      >
                        <button className="w-full text-left" onClick={() => setSelectedSectionId(section.id)} type="button">
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-bold">{section.title}</span>
                            <span className={section.enabled ? enabledBadge : disabledBadge}>{section.enabled ? 'On' : 'Off'}</span>
                          </span>
                          <span className="mt-2 block text-xs leading-5 text-slate-500">
                            {section.layout} · max {section.maxProducts} · {section.products.length} products
                            {section.collapsedByDefault ? ' · collapsed' : ''}
                          </span>
                        </button>
                        <div className="mt-3 flex flex-wrap gap-1">
                          <IconButton disabled={busy || sectionIndex === 0} label="Move section up" onClick={() => request(`/api/admin/sections/${section.id}`, 'PATCH', { action: 'move', direction: 'up' })}>↑</IconButton>
                          <IconButton disabled={busy || sectionIndex === selectedScenario.sections.length - 1} label="Move section down" onClick={() => request(`/api/admin/sections/${section.id}`, 'PATCH', { action: 'move', direction: 'down' })}>↓</IconButton>
                          <IconButton label="Edit section" onClick={() => setEditor({ kind: 'section', value: section })}>Edit</IconButton>
                          <IconButton label="Duplicate section" onClick={() => request(`/api/admin/sections/${section.id}/duplicate`, 'POST')}>Duplicate</IconButton>
                          <IconButton label={section.enabled ? 'Disable section' : 'Enable section'} onClick={() => request(`/api/admin/sections/${section.id}`, 'PATCH', { ...toSectionInput(section), enabled: !section.enabled })}>{section.enabled ? 'On' : 'Off'}</IconButton>
                          {!section.isCore && (
                            <IconButton label="Delete section" onClick={() => confirmAction('Delete this empty section?', () => request(`/api/admin/sections/${section.id}`, 'DELETE'))}>Delete</IconButton>
                          )}
                        </div>
                        </div>
                      );
                    })}
                    {visibleSections.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500 md:col-span-2">
                        No sections match these filters.
                      </p>
                    ) : null}
                  </div>
                </div>

                {selectedSection && (
                  <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-300">Step 3 · Products</p>
                        <h3 className="mt-2 text-xl font-black">{selectedSection.title}</h3>
                        <p className="mt-1 max-w-2xl text-sm text-slate-400">{selectedSection.description}</p>
                      </div>
                      <button className={primaryButton} disabled={busy} onClick={() => setEditor({ kind: 'product', value: null })} type="button">Add product</button>
                    </div>

                    <div className="mt-4">
                      <AdminToolbar
                        extra={
                          <select
                            aria-label="Filter products by retailer"
                            className={compactInputClass}
                            onChange={(event) => setProductRetailer(event.target.value)}
                            value={productRetailer}
                          >
                            <option value="all">All retailers</option>
                            {AFFILIATE_RETAILERS.map((retailer) => (
                              <option key={retailer} value={retailer}>{retailer}</option>
                            ))}
                          </select>
                        }
                        onQueryChange={setProductQuery}
                        onSortChange={setProductSort}
                        onStatusChange={setProductStatus}
                        query={productQuery}
                        searchLabel="Search products"
                        sort={productSort}
                        sortOptions={productSortOptions}
                        status={productStatus}
                      />
                      <DragHint enabled={canDragProducts} />
                    </div>

                    {selectedSection.products.length > 0 ? (
                      visibleProducts.length > 0 ? (
                        <div className="mt-5 grid gap-5 xl:grid-cols-2">
                          {visibleProducts.map((product) => {
                            const productIndex = selectedSection.products.findIndex(
                              (item) => item.id === product.id,
                            );
                            return (
                              <div
                                className={`${draggedItem?.id === product.id ? 'opacity-45' : ''} ${canDragProducts ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                draggable={canDragProducts && !busy}
                                key={product.id}
                                onDragEnd={() => setDraggedItem(null)}
                                onDragOver={(event) => {
                                  if (canDragProducts) event.preventDefault();
                                }}
                                onDragStart={(event) => {
                                  event.dataTransfer.effectAllowed = 'move';
                                  setDraggedItem({ kind: 'product', id: product.id });
                                }}
                                onDrop={(event) => {
                                  event.preventDefault();
                                  if (draggedItem?.kind === 'product') {
                                    void reorder('product', draggedItem.id, product.id);
                                  }
                                }}
                              >
                                <ProductAdminCard
                                  busy={busy}
                                  index={productIndex}
                                  onDelete={() => confirmAction('Delete this product from the active recommendation system?', () => request(`/api/admin/affiliate-links/${product.id}`, 'DELETE'))}
                                  onDuplicate={() => request(`/api/admin/affiliate-links/${product.id}/copy`, 'POST', { sectionIds: [product.sectionId] })}
                                  onEdit={() => setEditor({ kind: 'product', value: product })}
                                  onMove={(direction) => request(`/api/admin/affiliate-links/${product.id}`, 'PATCH', { action: 'move', direction })}
                                  onToggle={() => request(`/api/admin/affiliate-links/${product.id}`, 'PATCH', { ...toProductInput(product), enabled: !product.enabled })}
                                  product={product}
                                  total={selectedSection.products.length}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-500">
                          No products match these filters.
                        </div>
                      )
                    ) : (
                      <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-slate-500">
                        This section has no products yet. Empty sections are not shown publicly.
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-3xl border border-white/10 p-8 text-slate-400">No scenarios found.</div>
            )}
          </section>
        </div>
      </div>

      {editor && selectedScenario && (
        <EditorModal onClose={() => setEditor(null)} title={editorTitle(editor)}>
          {editor.kind === 'scenario' && (
            <ScenarioForm busy={busy} onSave={saveScenario} scenario={editor.value} />
          )}
          {editor.kind === 'section' && (
            <SectionForm busy={busy} onSave={saveSection} scenarioId={selectedScenario.id} section={editor.value} />
          )}
          {editor.kind === 'product' && selectedSection && (
            <ProductForm busy={busy} onSave={saveProduct} product={editor.value} sectionId={selectedSection.id} sections={sectionOptions} />
          )}
        </EditorModal>
      )}
    </main>
  );
}

function ProductAdminCard({
  product,
  index,
  total,
  busy,
  onEdit,
  onDelete,
  onDuplicate,
  onToggle,
  onMove,
}: {
  product: AffiliateProductRecord;
  index: number;
  total: number;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
  onMove: (direction: 'up' | 'down') => void;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-black/20 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <p className="min-w-0 truncate text-xs text-slate-500">
          {getDomain(product.affiliateUrl) || 'Invalid domain'}
        </p>
        <span className={product.enabled ? enabledBadge : disabledBadge}>
          {product.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
      <RecommendationProductCard preview product={product} />
      <div className="flex flex-wrap gap-1 px-1 pt-4">
        <IconButton disabled={busy || index === 0} label="Move product up" onClick={() => onMove('up')}>↑</IconButton>
        <IconButton disabled={busy || index === total - 1} label="Move product down" onClick={() => onMove('down')}>↓</IconButton>
        <IconButton label="Edit or move product" onClick={onEdit}>Edit / Move</IconButton>
        <IconButton label="Duplicate product" onClick={onDuplicate}>Duplicate</IconButton>
        <IconButton label={product.enabled ? 'Disable product' : 'Enable product'} onClick={onToggle}>{product.enabled ? 'On' : 'Off'}</IconButton>
        <IconButton label="Delete product" onClick={onDelete}>Delete</IconButton>
      </div>
    </article>
  );
}

function ScenarioForm({ scenario, busy, onSave }: { scenario: RecommendationScenarioRecord | null; busy: boolean; onSave: (input: ScenarioInput, id?: string) => void }) {
  const [draft, setDraft] = useState<ScenarioInput>(() => scenario ? toScenarioInput(scenario) : { code: '', displayName: '', resultHeading: '', resultDescription: '', enabled: true });
  return (
    <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); onSave(draft, scenario?.id); }}>
      <Field label="Scenario code"><TextInput disabled={Boolean(scenario?.isCore)} onChange={(value) => setDraft({ ...draft, code: value.toUpperCase() })} placeholder="FAIL_NETWORK" value={draft.code} /></Field>
      <Field label="Display name"><TextInput onChange={(value) => setDraft({ ...draft, displayName: value })} placeholder="Fail — Network" value={draft.displayName} /></Field>
      <Field label="Result heading"><TextInput onChange={(value) => setDraft({ ...draft, resultHeading: value })} placeholder="Recommended upgrades" value={draft.resultHeading} /></Field>
      <Field label="Result description"><TextArea onChange={(value) => setDraft({ ...draft, resultDescription: value })} value={draft.resultDescription} /></Field>
      <Check label="Scenario enabled" onChange={(enabled) => setDraft({ ...draft, enabled })} value={draft.enabled} />
      <SaveButton busy={busy} />
    </form>
  );
}

function SectionForm({ section, scenarioId, busy, onSave }: { section: RecommendationSectionRecord | null; scenarioId: string; busy: boolean; onSave: (input: RecommendationSectionInput, id?: string) => void }) {
  const [draft, setDraft] = useState<RecommendationSectionInput>(() => section ? toSectionInput(section) : { scenarioId, title: '', description: '', enabled: true, maxProducts: 3, collapsedByDefault: false, layout: 'grid', purpose: 'GENERAL' });
  return (
    <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); onSave(draft, section?.id); }}>
      <Field label="Section title"><TextInput onChange={(value) => setDraft({ ...draft, title: value })} placeholder="GPU Upgrades" value={draft.title} /></Field>
      <Field label="Description"><TextArea onChange={(value) => setDraft({ ...draft, description: value })} value={draft.description} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Layout"><SelectInput onChange={(value) => setDraft({ ...draft, layout: value as RecommendationSectionInput['layout'] })} options={[['grid', 'Grid'], ['horizontal', 'Horizontal'], ['featured', 'Featured']]} value={draft.layout} /></Field>
        <Field label="Section type"><SelectInput onChange={(value) => setDraft({ ...draft, purpose: value as RecommendationSectionInput['purpose'] })} options={[['GENERAL', 'General recommendations'], ['PREBUILT', 'Prebuilt gaming PCs'], ['GAME_PURCHASE', 'Game purchase / preorder']]} value={draft.purpose} /></Field>
      </div>
      <Field label="Maximum products"><input className={inputClass} max={12} min={1} onChange={(event) => setDraft({ ...draft, maxProducts: Number(event.target.value) })} type="number" value={draft.maxProducts} /></Field>
      <Check label="Section enabled" onChange={(enabled) => setDraft({ ...draft, enabled })} value={draft.enabled} />
      <Check label="Collapsed by default" onChange={(collapsedByDefault) => setDraft({ ...draft, collapsedByDefault })} value={draft.collapsedByDefault} />
      <SaveButton busy={busy} />
    </form>
  );
}

function ProductForm({ product, sectionId, sections, busy, onSave }: { product: AffiliateProductRecord | null; sectionId: string; sections: Array<{ section: RecommendationSectionRecord; label: string }>; busy: boolean; onSave: (input: AffiliateProductInput, id?: string) => void }) {
  const [draft, setDraft] = useState<AffiliateProductInput>(() => product ? toProductInput(product) : { title: '', retailer: 'Other', affiliateUrl: '', imageUrl: null, priceText: 'Check current price', badge: 'None', shortDescription: '', buttonText: 'View option', componentType: 'Other', platform: null, enabled: true, sectionId });
  const domain = getDomain(draft.affiliateUrl);
  return (
    <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); onSave(draft, product?.id); }}>
      <Field label="Destination section"><SelectInput onChange={(value) => setDraft({ ...draft, sectionId: value })} options={sections.map(({ section, label }) => [section.id, label])} value={draft.sectionId} /></Field>
      <Field label="Title"><TextInput onChange={(value) => setDraft({ ...draft, title: value })} placeholder="NVIDIA RTX 4070" value={draft.title} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Retailer"><SelectInput onChange={(value) => setDraft({ ...draft, retailer: value as AffiliateProductInput['retailer'] })} options={AFFILIATE_RETAILERS.map((value) => [value, value])} value={draft.retailer} /></Field>
        <Field label="Component type"><SelectInput onChange={(value) => setDraft({ ...draft, componentType: value as AffiliateProductInput['componentType'] })} options={AFFILIATE_COMPONENT_TYPES.map((value) => [value, value])} value={draft.componentType} /></Field>
      </div>
      <Field label="Exact HTTPS affiliate URL"><TextInput onChange={(value) => setDraft({ ...draft, affiliateUrl: value })} placeholder="https://retailer.example/product" value={draft.affiliateUrl} /><span className="mt-1 block text-xs text-slate-500">Detected domain: {domain || 'Enter a valid HTTPS URL'}. The URL is stored exactly as entered.</span></Field>
      <Field label="Optional HTTPS image URL"><TextInput onChange={(value) => setDraft({ ...draft, imageUrl: value || null })} placeholder="https://..." value={draft.imageUrl ?? ''} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Admin-entered price text"><TextInput onChange={(value) => setDraft({ ...draft, priceText: value })} placeholder="Check current price" value={draft.priceText} /></Field>
        <Field label="Badge"><SelectInput onChange={(value) => setDraft({ ...draft, badge: value as AffiliateProductInput['badge'] })} options={AFFILIATE_BADGES.map((value) => [value, value])} value={draft.badge} /></Field>
      </div>
      <Field label="Short description"><TextArea onChange={(value) => setDraft({ ...draft, shortDescription: value })} value={draft.shortDescription} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Button text"><TextInput onChange={(value) => setDraft({ ...draft, buttonText: value })} value={draft.buttonText} /></Field>
        <Field label="Platform (purchase links only)"><SelectInput onChange={(value) => setDraft({ ...draft, platform: value ? value as AffiliateProductInput['platform'] : null })} options={[['', 'Not applicable'], ...GAME_PURCHASE_PLATFORMS.map((value) => [value, value] as [string, string])]} value={draft.platform ?? ''} /></Field>
      </div>
      {draft.platform === 'PC' && <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-200">Only enable a PC purchase link after an official PC listing exists.</p>}
      <Check label="Product enabled" onChange={(enabled) => setDraft({ ...draft, enabled })} value={draft.enabled} />
      <p className="text-xs leading-5 text-slate-500">Prices, ratings, reviews, and images are never scraped. Only administrator-entered content is displayed.</p>
      <section className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-violet-300">
          Live card preview
        </p>
        <div className="mx-auto max-w-sm">
          <RecommendationProductCard preview product={draft} />
        </div>
      </section>
      <SaveButton busy={busy} />
    </form>
  );
}

function EditorModal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
      <div className="mx-auto my-6 max-w-2xl rounded-3xl border border-white/15 bg-[#0d111d] p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-xl font-black">{title}</h2><button className={secondaryButton} onClick={onClose} type="button">Close</button></div>
        {children}
      </div>
    </div>
  );
}

function AdminMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function AdminToolbar({
  query,
  status,
  sort,
  searchLabel,
  sortOptions,
  onQueryChange,
  onStatusChange,
  onSortChange,
  extra,
}: {
  query: string;
  status: AvailabilityFilter;
  sort: AdminSort;
  searchLabel: string;
  sortOptions: readonly (readonly [AdminSort, string])[];
  onQueryChange: (value: string) => void;
  onStatusChange: (value: AvailabilityFilter) => void;
  onSortChange: (value: AdminSort) => void;
  extra?: ReactNode;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(11rem,1fr)_auto_auto_auto]">
      <input
        aria-label={searchLabel}
        className={compactInputClass}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={searchLabel}
        type="search"
        value={query}
      />
      <select
        aria-label="Filter by enabled status"
        className={compactInputClass}
        onChange={(event) => onStatusChange(event.target.value as AvailabilityFilter)}
        value={status}
      >
        <option value="all">All statuses</option>
        <option value="enabled">Enabled</option>
        <option value="disabled">Disabled</option>
      </select>
      {extra}
      <select
        aria-label="Sort items"
        className={compactInputClass}
        onChange={(event) => onSortChange(event.target.value as AdminSort)}
        value={sort}
      >
        {sortOptions.map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </div>
  );
}

function DragHint({ enabled }: { enabled: boolean }) {
  return (
    <p className="mt-2 text-[10px] leading-4 text-slate-600">
      {enabled
        ? 'Drag cards to change the saved display order.'
        : 'Clear filters and choose Display order to enable drag ordering.'}
    </p>
  );
}

function filterAndSort<T extends { enabled: boolean; displayOrder: number }>(
  items: readonly T[],
  query: string,
  status: AvailabilityFilter,
  sort: AdminSort,
  searchableText: (item: T) => string,
  title: (item: T) => string,
  retailer: (item: T) => string = () => '',
) {
  const normalizedQuery = query.trim().toLowerCase();
  return items
    .filter((item) => {
      if (status === 'enabled' && !item.enabled) return false;
      if (status === 'disabled' && item.enabled) return false;
      return !normalizedQuery || searchableText(item).toLowerCase().includes(normalizedQuery);
    })
    .slice()
    .sort((left, right) => {
      if (sort === 'title') return title(left).localeCompare(title(right));
      if (sort === 'retailer') {
        return retailer(left).localeCompare(retailer(right)) || title(left).localeCompare(title(right));
      }
      if (sort === 'status') {
        return Number(right.enabled) - Number(left.enabled) || title(left).localeCompare(title(right));
      }
      return left.displayOrder - right.displayOrder;
    });
}

function moveIdBefore(ids: string[], draggedId: string, targetId: string) {
  const next = ids.filter((id) => id !== draggedId);
  const targetIndex = next.indexOf(targetId);
  if (targetIndex === -1) return ids;
  next.splice(targetIndex, 0, draggedId);
  return next;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="grid gap-2 text-sm font-bold text-slate-300"><span>{label}</span>{children}</label>; }
function TextInput({ value, onChange, placeholder = '', disabled = false }: { value: string; onChange: (value: string) => void; placeholder?: string; disabled?: boolean }) { return <input className={inputClass} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />; }
function TextArea({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <textarea className={`${inputClass} min-h-24 resize-y`} onChange={(event) => onChange(event.target.value)} value={value} />; }
function SelectInput({ value, options, onChange }: { value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }) { return <select className={inputClass} onChange={(event) => onChange(event.target.value)} value={value}>{options.map(([optionValue, label]) => <option className="bg-slate-950" key={optionValue} value={optionValue}>{label}</option>)}</select>; }
function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center gap-3 text-sm font-bold text-slate-300"><input checked={value} className="size-4 accent-violet-500" onChange={(event) => onChange(event.target.checked)} type="checkbox" />{label}</label>; }
function SaveButton({ busy }: { busy: boolean }) { return <button className={primaryButton} disabled={busy} type="submit">{busy ? 'Saving…' : 'Save changes'}</button>; }
function IconButton({ children, label, disabled = false, onClick }: { children: ReactNode; label: string; disabled?: boolean; onClick: () => void }) { return <button aria-label={label} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30" disabled={disabled} onClick={onClick} title={label} type="button">{children}</button>; }

function toScenarioInput(scenario: RecommendationScenarioRecord): ScenarioInput { return { code: scenario.code, displayName: scenario.displayName, resultHeading: scenario.resultHeading, resultDescription: scenario.resultDescription, enabled: scenario.enabled }; }
function toSectionInput(section: RecommendationSectionRecord): RecommendationSectionInput { return { scenarioId: section.scenarioId, title: section.title, description: section.description, enabled: section.enabled, maxProducts: section.maxProducts, collapsedByDefault: section.collapsedByDefault, layout: section.layout, purpose: section.purpose }; }
function toProductInput(product: AffiliateProductRecord): AffiliateProductInput { return { title: product.title, retailer: product.retailer, affiliateUrl: product.affiliateUrl, imageUrl: product.imageUrl, priceText: product.priceText, badge: product.badge, shortDescription: product.shortDescription, buttonText: product.buttonText, componentType: product.componentType, platform: product.platform, enabled: product.enabled, sectionId: product.sectionId }; }
function editorTitle(editor: Exclude<Editor, null>) { if (editor.kind === 'scenario') return editor.value ? 'Edit scenario' : 'Add scenario'; if (editor.kind === 'section') return editor.value ? 'Edit section' : 'Add section'; return editor.value ? 'Edit or move product' : 'Add product'; }
function getDomain(value: string) { try { return new URL(value).hostname.toLowerCase(); } catch { return ''; } }
function confirmAction(message: string, action: () => void) { if (window.confirm(message)) action(); }

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/60 disabled:opacity-50';
const compactInputClass = 'min-w-0 rounded-lg border border-white/10 bg-black/25 px-2.5 py-2 text-xs text-white outline-none placeholder:text-slate-600 focus:border-violet-400/60';
const primaryButton = 'rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10';
const smallButton = 'rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50';
const enabledBadge = 'rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300';
const disabledBadge = 'rounded-full bg-slate-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-400';
const baseSortOptions = [
  ['order', 'Display order'],
  ['title', 'Title A–Z'],
  ['status', 'Enabled first'],
] as const satisfies readonly (readonly [AdminSort, string])[];
const productSortOptions = [
  ...baseSortOptions,
  ['retailer', 'Retailer A–Z'],
] as const satisfies readonly (readonly [AdminSort, string])[];
