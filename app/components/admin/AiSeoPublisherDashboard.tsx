'use client';

import { useMemo, useState, type ReactNode } from 'react';

import type { ProductComponentType } from '../../lib/affiliate-types';
import {
  AI_SEO_ARTICLE_TYPES,
  AI_SEO_TOPIC_PRESETS,
  AI_SEO_WORD_COUNTS,
  type AiSeoArticleType,
  type AiSeoGenerationInput,
  type AiSeoSavedDraft,
  type AiSeoWordCount,
  type AiSeoWorkspace,
} from '../../lib/ai-seo-types';
import {
  runAiSeoBatch,
  type AiSeoBatchStatus,
} from '../../lib/ai-seo-selection';
import { AdminHeader } from './AdminHeader';

interface GeneratorForm {
  topic: string;
  primaryKeyword: string;
  secondaryKeywords: string;
  articleType: AiSeoArticleType;
  targetWordCount: AiSeoWordCount;
  productCategories: ProductComponentType[];
  specificProductIds: string[];
  relatedArticleIds: string[];
}

interface GenerationResponse {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  draft?: AiSeoSavedDraft;
}

interface BulkItem {
  topic: string;
  status: AiSeoBatchStatus;
  draft?: AiSeoSavedDraft;
  error?: string;
}

export function AiSeoPublisherDashboard({
  initialWorkspace,
}: {
  initialWorkspace: AiSeoWorkspace;
}) {
  const [tab, setTab] = useState<'single' | 'bulk'>('single');
  const [single, setSingle] = useState<GeneratorForm>(initialForm());
  const [singleDraft, setSingleDraft] = useState<AiSeoSavedDraft | null>(null);
  const [singleBusy, setSingleBusy] = useState(false);
  const [singleNotice, setSingleNotice] = useState('');
  const [singleError, setSingleError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bulkTopics, setBulkTopics] = useState('');
  const [bulkType, setBulkType] = useState<AiSeoArticleType>('Buying Guide');
  const [bulkWordCount, setBulkWordCount] = useState<AiSeoWordCount>(2000);
  const [bulkCategories, setBulkCategories] = useState<ProductComponentType[]>([]);
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState('');

  const providerReady = initialWorkspace.providerStatus.configured;

  const generateSingle = async (regenerate = false) => {
    setSingleBusy(true);
    setSingleError('');
    setSingleNotice('');
    setFieldErrors({});
    try {
      const draft = await requestDraft({
        ...toGenerationInput(single),
        ...(regenerate && singleDraft ? { articleId: singleDraft.id } : {}),
      });
      setSingleDraft(draft);
      setSingleNotice(regenerate ? 'Draft regenerated and saved.' : 'Draft generated and saved.');
    } catch (error) {
      if (error instanceof GenerationRequestError) setFieldErrors(error.fieldErrors);
      setSingleError(error instanceof Error ? error.message : 'Generation failed.');
    } finally {
      setSingleBusy(false);
    }
  };

  const generateBulk = async () => {
    const topics = Array.from(
      new Set(
        bulkTopics
          .split(/\r?\n/)
          .map((topic) => topic.trim())
          .filter(Boolean),
      ),
    );
    if (!topics.length) {
      setBulkError('Enter at least one article topic.');
      return;
    }
    if (topics.length > 15) {
      setBulkError('Generate at most 15 topics in one batch.');
      return;
    }

    setBulkError('');
    setBulkBusy(true);
    setBulkItems(topics.map((topic) => ({ topic, status: 'Waiting' })));
    try {
      await runAiSeoBatch(
        topics,
        (topic) =>
          requestDraft({
            topic,
            primaryKeyword: topic,
            secondaryKeywords: [],
            articleType: bulkType,
            targetWordCount: bulkWordCount,
            productCategories: bulkCategories,
            specificProductIds: [],
            relatedArticleIds: [],
            saveAsDraft: true,
          }),
        (index, status, detail) => {
          setBulkItems((current) =>
            current.map((item, itemIndex) =>
              itemIndex === index
                ? {
                    ...item,
                    status,
                    ...(status === 'Saved'
                      ? { draft: detail as AiSeoSavedDraft, error: undefined }
                      : status === 'Failed'
                        ? { error: String(detail ?? 'Generation failed.') }
                        : {}),
                  }
                : item,
            ),
          );
        },
        2,
      );
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <main className="admin-theme min-h-screen px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <AdminHeader active="ai-seo-publisher" />
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">
                Content management
              </p>
              <h1 className="mt-2 text-3xl font-black">AI SEO Publisher</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Generate review-ready GTA VI articles using only published internal links and
                products already managed in this site.
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1.5 text-xs font-black ${
                providerReady
                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-amber-400/30 bg-amber-500/10 text-amber-200'
              }`}
            >
              {providerReady ? 'Provider ready' : 'Setup required'}
            </span>
          </div>

          <p
            className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${
              providerReady
                ? 'border-emerald-400/20 bg-emerald-500/[0.07] text-emerald-100'
                : 'border-amber-400/25 bg-amber-500/10 text-amber-100'
            }`}
          >
            {initialWorkspace.providerStatus.message}
          </p>

          <div className="mt-6 flex gap-2 border-b border-white/10" role="tablist">
            <TabButton active={tab === 'single'} onClick={() => setTab('single')}>
              Single Article
            </TabButton>
            <TabButton active={tab === 'bulk'} onClick={() => setTab('bulk')}>
              Bulk Generator
            </TabButton>
          </div>

          {tab === 'single' ? (
            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className="grid gap-5 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field error={fieldErrors.topic} label="Article topic">
                    <input
                      className={inputClass}
                      onChange={(event) => setSingle({ ...single, topic: event.target.value })}
                      placeholder="Best GPU for GTA 6"
                      value={single.topic}
                    />
                  </Field>
                  <Field error={fieldErrors.primaryKeyword} label="Primary keyword">
                    <input
                      className={inputClass}
                      onChange={(event) =>
                        setSingle({ ...single, primaryKeyword: event.target.value })
                      }
                      placeholder="best GPU for GTA 6"
                      value={single.primaryKeyword}
                    />
                  </Field>
                </div>
                <Field label="Secondary keywords">
                  <input
                    className={inputClass}
                    onChange={(event) =>
                      setSingle({ ...single, secondaryKeywords: event.target.value })
                    }
                    placeholder="GTA 6 graphics card, budget GPU, recommended GPU"
                    value={single.secondaryKeywords}
                  />
                  <span className={helpClass}>Separate keywords with commas.</span>
                </Field>
                <SharedSettings
                  articleType={single.articleType}
                  categories={single.productCategories}
                  onArticleType={(articleType) => setSingle({ ...single, articleType })}
                  onCategories={(productCategories) =>
                    setSingle({ ...single, productCategories })
                  }
                  onWordCount={(targetWordCount) =>
                    setSingle({ ...single, targetWordCount })
                  }
                  productCategories={initialWorkspace.productCategories}
                  targetWordCount={single.targetWordCount}
                />
                <SearchMultiSelect
                  emptyText="No eligible products match this search."
                  label="Specific products"
                  onChange={(specificProductIds) =>
                    setSingle({ ...single, specificProductIds })
                  }
                  options={initialWorkspace.products.map((product) => ({
                    id: product.id,
                    label: product.title,
                    meta: [
                      product.componentType,
                      product.valueTier,
                      product.retailer,
                    ]
                      .filter(Boolean)
                      .join(' · '),
                  }))}
                  selectedIds={single.specificProductIds}
                />
                <SearchMultiSelect
                  emptyText="No published articles are available."
                  label="Related existing articles"
                  onChange={(relatedArticleIds) =>
                    setSingle({ ...single, relatedArticleIds })
                  }
                  options={initialWorkspace.publishedArticles.map((article) => ({
                    id: article.id,
                    label: article.title,
                    meta: `/articles/${article.slug}`,
                  }))}
                  selectedIds={single.relatedArticleIds}
                />
                <DraftOnlyNotice />
                {(singleNotice || singleError) ? (
                  <Status error={Boolean(singleError)}>{singleError || singleNotice}</Status>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    className={primaryButton}
                    disabled={!providerReady || singleBusy}
                    onClick={() => void generateSingle(false)}
                    type="button"
                  >
                    {singleBusy ? 'Generating…' : 'Generate'}
                  </button>
                  {singleDraft ? (
                    <button
                      className={secondaryButton}
                      disabled={!providerReady || singleBusy}
                      onClick={() => void generateSingle(true)}
                      type="button"
                    >
                      Regenerate
                    </button>
                  ) : null}
                </div>
              </section>

              <aside className="grid content-start gap-4">
                <DraftResult
                  draft={singleDraft}
                  onConfirm={() =>
                    setSingleNotice('This article is already saved as a CMS draft.')
                  }
                />
                <SafetySummary />
              </aside>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className="grid gap-5 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                <Field label="Article topics — one per line">
                  <textarea
                    className={`${inputClass} min-h-72`}
                    onChange={(event) => setBulkTopics(event.target.value)}
                    placeholder={'Best GPU for GTA 6\nBest SSD for GTA 6\nCan My Laptop Run GTA 6?'}
                    value={bulkTopics}
                  />
                </Field>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className={helpClass}>Up to 15 separate draft articles per batch.</span>
                  <button
                    className={secondaryButton}
                    disabled={bulkBusy}
                    onClick={() => setBulkTopics(AI_SEO_TOPIC_PRESETS.join('\n'))}
                    type="button"
                  >
                    Load 15 presets
                  </button>
                </div>
                <SharedSettings
                  articleType={bulkType}
                  categories={bulkCategories}
                  onArticleType={setBulkType}
                  onCategories={setBulkCategories}
                  onWordCount={setBulkWordCount}
                  productCategories={initialWorkspace.productCategories}
                  targetWordCount={bulkWordCount}
                />
                <DraftOnlyNotice />
                {bulkError ? <Status error>{bulkError}</Status> : null}
                <button
                  className={`${primaryButton} justify-self-start`}
                  disabled={!providerReady || bulkBusy}
                  onClick={() => void generateBulk()}
                  type="button"
                >
                  {bulkBusy ? 'Generating batch…' : 'Generate All'}
                </button>
              </section>

              <aside className="grid content-start gap-4">
                <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-black">Batch progress</h2>
                    {bulkItems.length ? (
                      <span className="text-xs text-slate-500">
                        {bulkItems.filter((item) => item.status === 'Saved').length}/
                        {bulkItems.length} saved
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 grid max-h-[680px] gap-3 overflow-y-auto pr-1">
                    {bulkItems.map((item, index) => (
                      <BulkProgressItem item={item} key={`${item.topic}-${index}`} />
                    ))}
                    {!bulkItems.length ? (
                      <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                        Batch progress will appear here.
                      </p>
                    ) : null}
                  </div>
                </section>
                <SafetySummary />
              </aside>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SharedSettings({
  articleType,
  targetWordCount,
  categories,
  productCategories,
  onArticleType,
  onWordCount,
  onCategories,
}: {
  articleType: AiSeoArticleType;
  targetWordCount: AiSeoWordCount;
  categories: ProductComponentType[];
  productCategories: ProductComponentType[];
  onArticleType: (value: AiSeoArticleType) => void;
  onWordCount: (value: AiSeoWordCount) => void;
  onCategories: (value: ProductComponentType[]) => void;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Article type">
          <select
            className={inputClass}
            onChange={(event) => onArticleType(event.target.value as AiSeoArticleType)}
            value={articleType}
          >
            {AI_SEO_ARTICLE_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </Field>
        <Field label="Target word count">
          <select
            className={inputClass}
            onChange={(event) => onWordCount(Number(event.target.value) as AiSeoWordCount)}
            value={targetWordCount}
          >
            {AI_SEO_WORD_COUNTS.map((count) => (
              <option key={count} value={count}>
                {count.toLocaleString()}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset>
        <legend className="text-sm font-bold text-slate-300">Product categories</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {productCategories.map((category) => {
            const selected = categories.includes(category);
            return (
              <label
                className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-bold transition ${
                  selected
                    ? 'border-violet-400/50 bg-violet-500/20 text-violet-100'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.07]'
                }`}
                key={category}
              >
                <input
                  checked={selected}
                  className="sr-only"
                  onChange={(event) =>
                    onCategories(
                      event.target.checked
                        ? [...categories, category]
                        : categories.filter((item) => item !== category),
                    )
                  }
                  type="checkbox"
                />
                {category}
              </label>
            );
          })}
          {!productCategories.length ? (
            <span className={helpClass}>No eligible product categories are available.</span>
          ) : null}
        </div>
      </fieldset>
    </>
  );
}

function SearchMultiSelect({
  label,
  options,
  selectedIds,
  onChange,
  emptyText,
}: {
  label: string;
  options: Array<{ id: string; label: string; meta: string }>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyText: string;
}) {
  const [search, setSearch] = useState('');
  const visible = useMemo(
    () =>
      options.filter((option) =>
        `${option.label} ${option.meta}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [options, search],
  );
  return (
    <fieldset className="rounded-2xl border border-white/10 p-4">
      <legend className="px-1 text-sm font-black text-white">{label}</legend>
      <input
        aria-label={`Search ${label}`}
        className={inputClass}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={`Search ${label.toLowerCase()}`}
        value={search}
      />
      <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto">
        {visible.map((option) => (
          <label
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:bg-white/[0.07]"
            key={option.id}
          >
            <input
              checked={selectedIds.includes(option.id)}
              className="mt-0.5 size-4 accent-violet-500"
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? Array.from(new Set([...selectedIds, option.id]))
                    : selectedIds.filter((id) => id !== option.id),
                )
              }
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-bold text-white">{option.label}</span>
              <span className="mt-1 block text-xs text-slate-500">{option.meta}</span>
            </span>
          </label>
        ))}
        {!visible.length ? (
          <p className="p-4 text-center text-sm text-slate-500">{emptyText}</p>
        ) : null}
      </div>
      {selectedIds.length ? (
        <p className="mt-2 text-xs text-violet-300">{selectedIds.length} selected</p>
      ) : null}
    </fieldset>
  );
}

function DraftResult({
  draft,
  onConfirm,
}: {
  draft: AiSeoSavedDraft | null;
  onConfirm: () => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <h2 className="font-black">Generated draft</h2>
      {draft ? (
        <div className="mt-4 grid gap-3">
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] p-3">
            <p className="font-black text-emerald-100">{draft.title}</p>
            <p className="mt-1 break-all text-xs text-emerald-300">
              /articles/{draft.slug}
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center text-xs">
            <Metric label="Products" value={draft.productIds.length} />
            <Metric label="Related" value={draft.relatedArticleIds.length} />
            <Metric label="Read time" value={`${draft.estimatedReadingTime}m`} />
          </dl>
          <details className="rounded-xl border border-white/10 p-3 text-sm">
            <summary className="cursor-pointer font-bold text-slate-200">
              Featured image prompt
            </summary>
            <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-400">
              {draft.featuredImagePrompt}
            </p>
          </details>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <a className={`${primaryButton} text-center`} href={`/admin/articles?edit=${draft.id}`}>
              Open in Editor
            </a>
            <a
              className={`${secondaryButton} text-center`}
              href={`/admin/preview/articles/${draft.id}`}
              rel="noreferrer"
              target="_blank"
            >
              Preview
            </a>
            <button className={secondaryButton} onClick={onConfirm} type="button">
              Save Draft
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
          A saved draft summary will appear here after generation.
        </p>
      )}
    </section>
  );
}

function BulkProgressItem({ item }: { item: BulkItem }) {
  const statusClass =
    item.status === 'Saved'
      ? 'bg-emerald-500/15 text-emerald-200'
      : item.status === 'Failed'
        ? 'bg-red-500/15 text-red-200'
        : item.status === 'Generating'
          ? 'bg-violet-500/15 text-violet-200'
          : 'bg-slate-500/15 text-slate-400';
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-white">{item.topic}</p>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${statusClass}`}>
          {item.status}
        </span>
      </div>
      {item.error ? <p className="mt-2 text-xs leading-5 text-red-300">{item.error}</p> : null}
      {item.draft ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <a className={smallButton} href={`/admin/articles?edit=${item.draft.id}`}>
            Open in Editor
          </a>
          <a
            className={smallButton}
            href={`/admin/preview/articles/${item.draft.id}`}
            rel="noreferrer"
            target="_blank"
          >
            Preview
          </a>
        </div>
      ) : null}
    </article>
  );
}

function SafetySummary() {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
      <h2 className="font-black">Generation safeguards</h2>
      <ul className="mt-3 grid gap-2 text-xs leading-5 text-slate-400">
        <li>Draft status only — publishing still uses the existing article editor.</li>
        <li>Product blocks reference existing Product IDs, never copied affiliate URLs.</li>
        <li>Internal links are restricted to published CMS articles.</li>
        <li>Malformed or incomplete provider responses are rejected before saving.</li>
      </ul>
    </section>
  );
}

function DraftOnlyNotice() {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
      <input checked className="mt-0.5 size-4 accent-violet-500" disabled type="checkbox" />
      <span>
        <strong className="block text-white">Save as draft</strong>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          Always enabled. AI-generated articles can only be published from the existing editor.
        </span>
      </span>
    </label>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      aria-selected={active}
      className={`border-b-2 px-4 py-3 text-sm font-black transition ${
        active
          ? 'border-violet-400 text-white'
          : 'border-transparent text-slate-500 hover:text-slate-200'
      }`}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {children}
    </button>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-300">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </label>
  );
}

function Status({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <p
      aria-live="polite"
      className={`rounded-xl border px-3 py-2 text-sm ${
        error
          ? 'border-red-400/30 bg-red-500/10 text-red-200'
          : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
      }`}
    >
      {children}
    </p>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 p-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-black text-white">{value}</dd>
    </div>
  );
}

function initialForm(): GeneratorForm {
  return {
    topic: '',
    primaryKeyword: '',
    secondaryKeywords: '',
    articleType: 'Buying Guide',
    targetWordCount: 2000,
    productCategories: [],
    specificProductIds: [],
    relatedArticleIds: [],
  };
}

function toGenerationInput(form: GeneratorForm): AiSeoGenerationInput {
  return {
    ...form,
    secondaryKeywords: form.secondaryKeywords
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean),
    saveAsDraft: true,
  };
}

async function requestDraft(input: AiSeoGenerationInput) {
  const response = await fetch('/api/admin/ai-seo-publisher/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as GenerationResponse;
  if (!response.ok || !payload.draft) {
    throw new GenerationRequestError(
      payload.error || 'The article could not be generated.',
      payload.fieldErrors,
    );
  }
  return payload.draft;
}

class GenerationRequestError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'GenerationRequestError';
  }
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/60';
const primaryButton =
  'inline-flex items-center justify-center rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton =
  'inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40';
const smallButton =
  'inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10';
const helpClass = 'text-xs font-normal leading-5 text-slate-500';
