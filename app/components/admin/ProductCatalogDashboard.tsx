'use client';

import { useMemo, useState, type ReactNode } from 'react';

import {
  AFFILIATE_RETAILERS,
  PRODUCT_COMPONENT_TYPES,
  type AffiliateProductRecord,
  type ProductRecord,
} from '../../lib/affiliate-types';
import type { ProductInput } from '../../lib/catalog-validation';
import type { MediaAssetRecord, MediaFolderRecord } from '../../lib/cms-types';
import { RecommendationProductCard } from '../RecommendationProductCard';
import { AdminImageField } from './AdminImageField';
import { AdminHeader } from './AdminHeader';

interface ProductResponse {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  products?: ProductRecord[];
  warnings?: string[];
}

export function ProductCatalogDashboard({
  initialProducts,
  initialMedia,
  initialMediaFolders,
  openCreateForm = false,
}: {
  initialProducts: ProductRecord[];
  initialMedia: MediaAssetRecord[];
  initialMediaFolders: MediaFolderRecord[];
  openCreateForm?: boolean;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [media, setMedia] = useState(initialMedia);
  const [editor, setEditor] = useState<ProductRecord | 'new' | null>(
    openCreateForm ? 'new' : null,
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [componentType, setComponentType] = useState('all');
  const [retailer, setRetailer] = useState('all');

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) => {
      if (componentType !== 'all' && product.componentType !== componentType) return false;
      if (retailer !== 'all' && product.retailer !== retailer) return false;
      return !normalized || `${product.title} ${product.canonicalName} ${product.retailer}`.toLowerCase().includes(normalized);
    });
  }, [componentType, products, query, retailer]);

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
      const payload = (await response.json()) as ProductResponse;
      if (!response.ok) {
        setFieldErrors(payload.fieldErrors ?? {});
        throw new Error(payload.error || 'The product could not be saved.');
      }
      if (payload.products) setProducts(payload.products);
      setNotice([payload.message, ...(payload.warnings ?? [])].filter(Boolean).join(' '));
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The product request failed.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveProduct = async (input: ProductInput, id?: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[admin/catalog] Submitting product form', {
        mode: id ? 'update' : 'create',
        componentType: input.componentType,
        titleLength: input.title.trim().length,
      });
    }
    const saved = await request(id ? `/api/admin/products/${id}` : '/api/admin/products', id ? 'PATCH' : 'POST', input);
    if (saved) setEditor(null);
  };

  return (
    <main className="admin-theme min-h-screen px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <AdminHeader active="products" />

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">Reusable inventory</p>
              <h1 className="mt-2 text-3xl font-black">Product Catalog</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Create each product once, then assign it to any recommendation section.</p>
            </div>
            <button className={primaryButton} disabled={busy} onClick={() => setEditor('new')} type="button">Add product</button>
          </div>

          {(notice || error) ? <StatusMessage error={error}>{error || notice}</StatusMessage> : null}

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <input aria-label="Search products" className={inputClass} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" type="search" value={query} />
            <select aria-label="Filter by component type" className={inputClass} onChange={(event) => setComponentType(event.target.value)} value={componentType}>
              <option value="all">All component types</option>
              {PRODUCT_COMPONENT_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select aria-label="Filter by retailer" className={inputClass} onChange={(event) => setRetailer(event.target.value)} value={retailer}>
              <option value="all">All retailers</option>
              {AFFILIATE_RETAILERS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          <p className="mt-4 text-xs text-slate-500">{visibleProducts.length} of {products.length} products</p>
          <div className="mt-4 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product) => (
              <article className="flex h-full flex-col rounded-3xl border border-white/10 bg-black/20 p-4" key={product.id}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="truncate text-xs text-slate-500">{getDomain(product.affiliateUrl)}</p>
                  <span className={product.enabled ? enabledBadge : disabledBadge}>{product.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                <RecommendationProductCard preview product={toPreviewProduct(product)} />
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400">
                  <p className="font-bold text-slate-300">Used in {product.usage.length} section{product.usage.length === 1 ? '' : 's'}</p>
                  {product.usage.length > 0 ? (
                    <ul className="mt-2 grid gap-1">
                      {product.usage.slice(0, 4).map((usage) => <li key={usage.assignmentId}>{usage.scenarioCode} / {usage.sectionTitle}</li>)}
                    </ul>
                  ) : <p className="mt-1">Not currently assigned.</p>}
                </div>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <button className={secondaryButton} onClick={() => setEditor(product)} type="button">Edit</button>
                  <button className={secondaryButton} disabled={busy} onClick={() => void saveProduct({ ...toProductInput(product), enabled: !product.enabled }, product.id)} type="button">{product.enabled ? 'Disable' : 'Enable'}</button>
                  <button className={dangerButton} disabled={busy} onClick={() => { if (window.confirm(`Delete ${product.title} and its ${product.usage.length} assignments?`)) void request(`/api/admin/products/${product.id}`, 'DELETE'); }} type="button">Delete</button>
                </div>
              </article>
            ))}
          </div>
          {visibleProducts.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No catalog products match these filters.</p> : null}
        </section>
      </div>

      {editor ? (
        <Modal title={editor === 'new' ? 'Add product' : 'Edit product'} onClose={() => setEditor(null)}>
          {error ? <StatusMessage error={error}>{error}</StatusMessage> : null}
          <ProductForm busy={busy} fieldErrors={fieldErrors} folders={initialMediaFolders} media={media} onMediaChange={setMedia} onSave={saveProduct} product={editor === 'new' ? null : editor} />
        </Modal>
      ) : null}
    </main>
  );
}

function ProductForm({ product, busy, fieldErrors, media, folders, onMediaChange, onSave }: { product: ProductRecord | null; busy: boolean; fieldErrors: Record<string, string>; media: MediaAssetRecord[]; folders: MediaFolderRecord[]; onMediaChange: (media: MediaAssetRecord[]) => void; onSave: (input: ProductInput, id?: string) => void }) {
  const [draft, setDraft] = useState<ProductInput>(() => product ? toProductInput(product) : {
    title: '', componentType: 'Other', affiliateUrl: '', imageUrl: null, shortDescription: '', retailer: 'Other', defaultPriceText: 'Check Current Price', platform: null, enabled: true,
  });
  const clientErrors: Record<string, string> = {};
  if (!draft.title.trim()) clientErrors.title = 'Title is required.';
  if (!draft.affiliateUrl.trim()) clientErrors.affiliateUrl = 'Affiliate URL is required.';
  const errors = { ...clientErrors, ...fieldErrors };
  const domain = getDomain(draft.affiliateUrl);

  return (
    <form className="mt-4 grid gap-4" onSubmit={(event) => { event.preventDefault(); if (Object.keys(clientErrors).length === 0) onSave(draft, product?.id); }}>
      <Field error={errors.title} label="Title"><input className={inputClass} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="NVIDIA GeForce RTX 4070" value={draft.title} /></Field>
      <Field error={errors.componentType} label="Component type"><select className={inputClass} onChange={(event) => setDraft({ ...draft, componentType: event.target.value as ProductInput['componentType'] })} value={draft.componentType}>{PRODUCT_COMPONENT_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
      <Field error={errors.affiliateUrl} label="Affiliate URL"><input className={inputClass} onChange={(event) => setDraft({ ...draft, affiliateUrl: event.target.value })} placeholder="https://retailer.example/product" value={draft.affiliateUrl} /><span className="text-xs font-normal text-slate-500">Detected domain: {domain || 'Enter a valid HTTPS URL'}. The exact URL is preserved.</span></Field>
      <AdminImageField folders={folders} helpText={errors.imageUrl} label="Product image (optional)" media={media} onChange={(value) => setDraft({ ...draft, imageUrl: value || null })} onMediaChange={onMediaChange} value={draft.imageUrl ?? ''} />
      <Field error={errors.shortDescription} label="Description (optional)"><textarea className={`${inputClass} min-h-24 resize-y`} onChange={(event) => setDraft({ ...draft, shortDescription: event.target.value })} value={draft.shortDescription} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field error={errors.retailer} label="Retailer"><select className={inputClass} onChange={(event) => setDraft({ ...draft, retailer: event.target.value as ProductInput['retailer'] })} value={draft.retailer}>{AFFILIATE_RETAILERS.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
        <Field error={errors.defaultPriceText} label="Default price text (optional)"><input className={inputClass} onChange={(event) => setDraft({ ...draft, defaultPriceText: event.target.value })} placeholder="Check Current Price" value={draft.defaultPriceText} /></Field>
      </div>
      <label className="flex items-center gap-3 text-sm font-bold text-slate-300"><input checked={draft.enabled} className="size-4 accent-violet-500" onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} type="checkbox" />Product enabled</label>
      <section className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-violet-300">Card preview</p><div className="mx-auto max-w-sm"><RecommendationProductCard preview product={toPreviewProduct({ ...draft, id: product?.id ?? 'preview' })} /></div></section>
      <button className={primaryButton} disabled={busy} type="submit">{busy ? 'Saving…' : 'Save Product'}</button>
    </form>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"><div className="mx-auto my-6 max-w-2xl rounded-3xl border border-white/15 bg-[#0d111d] p-5 shadow-2xl sm:p-6"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black">{title}</h2><button className={secondaryButton} onClick={onClose} type="button">Close</button></div>{children}</div></div>; }
function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) { return <label className="grid gap-2 text-sm font-bold text-slate-300"><span>{label}</span>{children}{error ? <span className="text-xs text-red-300">{error}</span> : null}</label>; }
function StatusMessage({ children, error }: { children: ReactNode; error?: string }) { return <p aria-live="polite" className={`mt-4 rounded-xl border px-3 py-2 text-sm ${error ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'}`}>{children}</p>; }
function toProductInput(product: ProductRecord): ProductInput { return { title: product.title, componentType: product.componentType, affiliateUrl: product.affiliateUrl, imageUrl: product.imageUrl, shortDescription: product.shortDescription, retailer: product.retailer, defaultPriceText: product.defaultPriceText, platform: product.platform, enabled: product.enabled }; }
function toPreviewProduct(product: Pick<ProductRecord, 'id' | 'title' | 'retailer' | 'affiliateUrl' | 'imageUrl' | 'defaultPriceText' | 'shortDescription' | 'componentType' | 'platform' | 'enabled'>): AffiliateProductRecord { return { id: product.id, productId: product.id, title: product.title, retailer: product.retailer, affiliateUrl: product.affiliateUrl, imageUrl: product.imageUrl, priceText: product.defaultPriceText, badge: 'None', shortDescription: product.shortDescription, buttonText: 'View Product', componentType: product.componentType, platform: product.platform, enabled: product.enabled, displayOrder: 0, sectionId: '', createdAt: '', updatedAt: '' }; }
function getDomain(value: string) { try { return new URL(value).hostname.toLowerCase(); } catch { return ''; } }

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/60 disabled:opacity-50';
const primaryButton = 'rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10 disabled:opacity-50';
const dangerButton = 'rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-500/20 disabled:opacity-50';
const enabledBadge = 'rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300';
const disabledBadge = 'rounded-full bg-slate-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-400';
