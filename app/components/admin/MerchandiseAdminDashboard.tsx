/* eslint-disable @next/next/no-img-element -- Merchandise images use admin-managed runtime URLs. */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import type { MediaAssetRecord, MediaFolderRecord } from '../../lib/cms-types';
import {
  MERCH_PRODUCT_SOURCES,
  MERCH_PRODUCT_TYPES,
  type MerchandiseProductInput,
  type MerchandiseProductRecord,
} from '../../lib/merch-types';
import { AdminHeader } from './AdminHeader';
import { AdminImageField } from './AdminImageField';

interface MerchandiseResponse {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  products?: MerchandiseProductRecord[];
}

const emptyProduct: MerchandiseProductInput = {
  title: '',
  shortDescription: '',
  productUrl: '',
  imageUrl: null,
  productType: 'T-Shirt',
  badge: '',
  priceText: '',
  enabled: false,
  featured: false,
  displayOrder: 0,
  homepageVisible: false,
  storeVisible: false,
  articleVisible: false,
  notes: '',
  source: 'manual',
};

export function MerchandiseAdminDashboard({
  initialProducts,
  initialMedia,
  initialMediaFolders,
}: {
  initialProducts: MerchandiseProductRecord[];
  initialMedia: MediaAssetRecord[];
  initialMediaFolders: MediaFolderRecord[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [media, setMedia] = useState(initialMedia);
  const [draft, setDraft] = useState<MerchandiseProductInput>(emptyProduct);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const visible = useMemo(
    () =>
      products.filter((product) => {
        const search = query.trim().toLowerCase();
        return (
          (!search ||
            `${product.title} ${product.productType} ${product.badge}`
              .toLowerCase()
              .includes(search)) &&
          (typeFilter === 'all' || product.productType === typeFilter) &&
          (statusFilter === 'all' ||
            (statusFilter === 'enabled' ? product.enabled : !product.enabled))
        );
      }),
    [products, query, statusFilter, typeFilter],
  );

  const set = <Key extends keyof MerchandiseProductInput>(
    key: Key,
    value: MerchandiseProductInput[Key],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const edit = (product: MerchandiseProductRecord) => {
    setDraft({
      title: product.title,
      shortDescription: product.shortDescription,
      productUrl: product.productUrl,
      imageUrl: product.imageUrl,
      productType: product.productType,
      badge: product.badge,
      priceText: product.priceText,
      enabled: product.enabled,
      featured: product.featured,
      displayOrder: product.displayOrder,
      homepageVisible: product.homepageVisible,
      storeVisible: product.storeVisible,
      articleVisible: product.articleVisible,
      notes: product.notes,
      source: product.source,
    });
    setEditingId(product.id);
    setError('');
    setMessage('');
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setDraft(emptyProduct);
    setEditingId(null);
    setFieldErrors({});
    setError('');
  };

  const save = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    setFieldErrors({});
    try {
      const response = await fetch(
        editingId ? `/api/admin/merchandise/${editingId}` : '/api/admin/merchandise',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        },
      );
      const payload = (await response.json()) as MerchandiseResponse;
      if (!response.ok) {
        setFieldErrors(payload.fieldErrors ?? {});
        throw new Error(payload.error || 'Merchandise product could not be saved.');
      }
      setProducts(payload.products ?? products);
      setMessage(payload.message || 'Merchandise product saved.');
      reset();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Merchandise product could not be saved.',
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (product: MerchandiseProductRecord) => {
    if (!window.confirm(`Delete “${product.title || 'Untitled product'}”?`)) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/merchandise/${product.id}`, {
        method: 'DELETE',
      });
      const payload = (await response.json()) as MerchandiseResponse;
      if (!response.ok) throw new Error(payload.error || 'Product could not be deleted.');
      setProducts(payload.products ?? products.filter((item) => item.id !== product.id));
      setMessage(payload.message || 'Product deleted.');
      if (editingId === product.id) reset();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Product could not be deleted.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-theme min-h-screen px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <AdminHeader active="merchandise" />
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">
                Fourthwall-ready catalog
              </p>
              <h1 className="mt-1 text-3xl font-black">Merchandise</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Manage products shown by the optional storefront. This catalog does not create
                carts, orders, or Fourthwall products.
              </p>
            </div>
            <Link className={secondaryButton} href="/admin/settings">
              Store settings
            </Link>
          </div>

          {message ? <Notice tone="success">{message}</Notice> : null}
          {error ? <Notice tone="error">{error}</Notice> : null}

          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="grid content-start gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  aria-label="Search merchandise"
                  className={inputClass}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products"
                  value={query}
                />
                <select
                  aria-label="Filter product type"
                  className={inputClass}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  value={typeFilter}
                >
                  <option value="all">All product types</option>
                  {MERCH_PRODUCT_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
                <select
                  aria-label="Filter status"
                  className={inputClass}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <option value="all">All statuses</option>
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled / draft</option>
                </select>
              </div>

              <div className="grid gap-3">
                {visible.map((product) => (
                  <article
                    className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row"
                    key={product.id}
                  >
                    <div className="flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.04] sm:size-28">
                      {product.imageUrl ? (
                        <img
                          alt=""
                          className="h-full w-full object-contain p-2"
                          src={product.imageUrl}
                        />
                      ) : (
                        <span className="text-xs font-bold uppercase text-slate-600">No image</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="font-black text-white">
                            {product.title || 'Untitled merchandise draft'}
                          </h2>
                          <p className="mt-1 text-xs text-slate-500">
                            {product.productType} · {product.source} · order {product.displayOrder}
                          </p>
                        </div>
                        <Status enabled={product.enabled} />
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                        {product.shortDescription || 'No description yet.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide">
                        {product.featured ? <Pill>Featured</Pill> : null}
                        {product.homepageVisible ? <Pill>Homepage</Pill> : null}
                        {product.storeVisible ? <Pill>Store</Pill> : null}
                        {product.articleVisible ? <Pill>Articles</Pill> : null}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button className={secondaryButton} onClick={() => edit(product)} type="button">
                          Edit
                        </button>
                        <button
                          className={dangerButton}
                          disabled={busy}
                          onClick={() => void remove(product)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {!visible.length ? (
                  <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
                    No merchandise products match these filters.
                  </p>
                ) : null}
              </div>
            </div>

            <section className="h-fit rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5 lg:sticky lg:top-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-violet-300">
                    {editingId ? 'Edit product' : 'New product'}
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    {editingId ? draft.title || 'Untitled product' : 'Add merchandise'}
                  </h2>
                </div>
                {editingId ? (
                  <button className={secondaryButton} onClick={reset} type="button">Cancel</button>
                ) : null}
              </div>
              {editingId ? (
                <p className="mt-3 break-all text-[10px] text-slate-600">Product ID: {editingId}</p>
              ) : null}

              <div className="mt-5 grid gap-4">
                <Field error={fieldErrors.title} label="Title">
                  <input
                    className={inputClass}
                    onChange={(event) => set('title', event.target.value)}
                    placeholder="GTA VI launch T-shirt"
                    value={draft.title}
                  />
                </Field>
                <Field error={fieldErrors.shortDescription} label="Short description">
                  <textarea
                    className={`${inputClass} min-h-24`}
                    onChange={(event) => set('shortDescription', event.target.value)}
                    value={draft.shortDescription}
                  />
                </Field>
                <Field error={fieldErrors.productUrl} label="Fourthwall product URL">
                  <input
                    className={inputClass}
                    onChange={(event) => set('productUrl', event.target.value)}
                    placeholder="https://your-store.fourthwall.com/products/..."
                    value={draft.productUrl}
                  />
                </Field>
                <AdminImageField
                  folders={initialMediaFolders}
                  helpText={fieldErrors.imageUrl}
                  label="Product image"
                  media={media}
                  onChange={(value) => set('imageUrl', value || null)}
                  onMediaChange={setMedia}
                  value={draft.imageUrl ?? ''}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field error={fieldErrors.productType} label="Product type">
                    <select
                      className={inputClass}
                      onChange={(event) =>
                        set('productType', event.target.value as MerchandiseProductInput['productType'])
                      }
                      value={draft.productType}
                    >
                      {MERCH_PRODUCT_TYPES.map((type) => <option key={type}>{type}</option>)}
                    </select>
                  </Field>
                  <Field label="Source">
                    <select
                      className={inputClass}
                      onChange={(event) =>
                        set('source', event.target.value as MerchandiseProductInput['source'])
                      }
                      value={draft.source}
                    >
                      {MERCH_PRODUCT_SOURCES.map((source) => <option key={source}>{source}</option>)}
                    </select>
                  </Field>
                  <Field label="Badge">
                    <input
                      className={inputClass}
                      onChange={(event) => set('badge', event.target.value)}
                      placeholder="New"
                      value={draft.badge}
                    />
                  </Field>
                  <Field error={fieldErrors.priceText} label="Price text">
                    <input
                      className={inputClass}
                      onChange={(event) => set('priceText', event.target.value)}
                      placeholder="$29.99"
                      value={draft.priceText}
                    />
                  </Field>
                  <Field error={fieldErrors.displayOrder} label="Display order">
                    <input
                      className={inputClass}
                      min={0}
                      onChange={(event) => set('displayOrder', Number(event.target.value))}
                      type="number"
                      value={draft.displayOrder}
                    />
                  </Field>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Checkbox checked={draft.enabled} label="Enabled" onChange={(value) => set('enabled', value)} />
                  <Checkbox checked={draft.featured} label="Featured" onChange={(value) => set('featured', value)} />
                  <Checkbox checked={draft.homepageVisible} label="Homepage" onChange={(value) => set('homepageVisible', value)} />
                  <Checkbox checked={draft.storeVisible} label="Store page" onChange={(value) => set('storeVisible', value)} />
                  <Checkbox checked={draft.articleVisible} label="Article picker" onChange={(value) => set('articleVisible', value)} />
                </div>
                <Field label="Internal notes">
                  <textarea
                    className={`${inputClass} min-h-20`}
                    onChange={(event) => set('notes', event.target.value)}
                    value={draft.notes}
                  />
                </Field>
                <p className="text-xs leading-5 text-slate-500">
                  Incomplete products can be saved as disabled drafts. Enabled products require
                  a title, description, HTTPS product URL, image, and price text.
                </p>
                <button
                  className={primaryButton}
                  disabled={busy}
                  onClick={() => void save()}
                  type="button"
                >
                  {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add product'}
                </button>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid content-start gap-2 text-sm font-bold text-slate-300">
      {label}
      {children}
      {error ? <span className="text-xs font-medium text-red-300">{error}</span> : null}
    </label>
  );
}

function Checkbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs font-bold text-slate-300">
      <input
        checked={checked}
        className="size-4 accent-violet-500"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}

function Notice({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'success' | 'error';
}) {
  return (
    <p
      aria-live="polite"
      className={`mt-5 rounded-xl border p-3 text-sm ${
        tone === 'success'
          ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
          : 'border-red-400/30 bg-red-500/10 text-red-200'
      }`}
    >
      {children}
    </p>
  );
}

function Status({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${
        enabled
          ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
          : 'border-slate-500/30 bg-slate-900 text-slate-400'
      }`}
    >
      {enabled ? 'Enabled' : 'Draft'}
    </span>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-violet-200">{children}</span>;
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/60';
const primaryButton =
  'rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton =
  'rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10';
const dangerButton =
  'rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-50';
