'use client';

/* eslint-disable @next/next/no-img-element -- Product images are administrator-managed remote URLs. */

import { useMemo, useState } from 'react';

import {
  AFFILIATE_RETAILERS,
  PRODUCT_COMPONENT_TYPES,
  type ProductRecord,
} from '../../lib/affiliate-types';

export function CatalogProductPicker({
  products,
  selectedProductIds,
  onSelectionChange,
  selectionLocked = false,
}: {
  products: ProductRecord[];
  selectedProductIds: string[];
  onSelectionChange: (productIds: string[]) => void;
  selectionLocked?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [retailer, setRetailer] = useState('all');
  const [family, setFamily] = useState('all');
  const [productType, setProductType] = useState('all');
  const [status, setStatus] = useState('all');
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      if (normalizedQuery && !`${product.title} ${product.componentType} ${product.retailer}`.toLowerCase().includes(normalizedQuery)) return false;
      if (retailer !== 'all' && product.retailer !== retailer) return false;
      if (family !== 'all' && getProductFamily(product.componentType) !== family) return false;
      if (productType !== 'all' && product.componentType !== productType) return false;
      if (status === 'enabled' && !product.enabled) return false;
      if (status === 'disabled' && product.enabled) return false;
      if (status === 'url-ready' && !hasReadyUrl(product.affiliateUrl)) return false;
      if (status === 'url-missing' && hasReadyUrl(product.affiliateUrl)) return false;
      return true;
    });
  }, [family, productType, products, query, retailer, status]);
  const filteredIds = filteredProducts.map((product) => product.id);
  const allVisibleSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedProductIds.includes(id));

  const toggle = (productId: string, checked: boolean) => {
    onSelectionChange(checked ? Array.from(new Set([...selectedProductIds, productId])) : selectedProductIds.filter((id) => id !== productId));
  };

  return (
    <section>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <input aria-label="Search catalog products" className={inputClass} onChange={(event) => setQuery(event.target.value)} placeholder="Search product title" type="search" value={query} />
        <select aria-label="Filter products by retailer" className={inputClass} onChange={(event) => setRetailer(event.target.value)} value={retailer}><option value="all">All retailers</option>{AFFILIATE_RETAILERS.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select aria-label="Filter products by category" className={inputClass} onChange={(event) => setFamily(event.target.value)} value={family}><option value="all">All categories</option><option value="hardware">Hardware upgrades</option><option value="creator">Creator peripherals</option><option value="systems">Complete systems</option><option value="games">Games</option></select>
        <select aria-label="Filter products by product type" className={inputClass} onChange={(event) => setProductType(event.target.value)} value={productType}><option value="all">All product types</option>{PRODUCT_COMPONENT_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select aria-label="Filter products by status" className={inputClass} onChange={(event) => setStatus(event.target.value)} value={status}><option value="all">All statuses</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option><option value="url-ready">Affiliate URL ready</option><option value="url-missing">Affiliate URL missing</option></select>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>{filteredProducts.length} products · {selectedProductIds.length} selected</span>
        {!selectionLocked ? <div className="flex gap-2"><button className={smallButton} disabled={filteredIds.length === 0} onClick={() => onSelectionChange(Array.from(new Set([...selectedProductIds, ...filteredIds])))} type="button">Select visible</button><button className={smallButton} disabled={!filteredIds.some((id) => selectedProductIds.includes(id))} onClick={() => onSelectionChange(selectedProductIds.filter((id) => !filteredIds.includes(id)))} type="button">Clear visible</button></div> : null}
      </div>

      <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {filteredProducts.map((product) => (
          <label className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-sm ${selectedProductIds.includes(product.id) ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-black/20'}`} key={product.id}>
            <input checked={selectedProductIds.includes(product.id)} className="size-4 shrink-0 accent-violet-500" disabled={selectionLocked} onChange={(event) => toggle(product.id, event.target.checked)} type="checkbox" />
            <ProductThumb product={product} />
            <span className="min-w-0 flex-1"><span className="block truncate font-bold text-slate-100">{product.title}</span><span className="mt-1 block truncate text-xs text-slate-500">{product.componentType} · {product.retailer}</span><span className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-wide"><span className={product.enabled ? readyBadge : warningBadge}>{product.enabled ? 'Enabled' : 'Disabled'}</span><span className={hasReadyUrl(product.affiliateUrl) ? readyBadge : warningBadge}>{hasReadyUrl(product.affiliateUrl) ? 'URL ready' : 'URL missing'}</span></span></span>
          </label>
        ))}
      </div>
      {filteredProducts.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-white/10 p-5 text-center text-sm text-slate-500">No catalog products match these filters.</p> : null}
      {allVisibleSelected ? <p className="mt-2 text-xs font-semibold text-violet-300">All visible products are selected.</p> : null}
    </section>
  );
}

function ProductThumb({ product }: { product: ProductRecord }) {
  return <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-950 text-[10px] font-black text-slate-600">{product.imageUrl ? <>{/* Admin-entered remote URLs intentionally use a normal img element. */}<img alt="" className="h-full w-full object-contain p-1" loading="lazy" src={product.imageUrl} /></> : product.componentType.slice(0, 3).toUpperCase()}</span>;
}

function getProductFamily(componentType: ProductRecord['componentType']) { if (['GPU', 'CPU', 'RAM', 'Storage'].includes(componentType)) return 'hardware'; if (['Prebuilt Desktop', 'Gaming Laptop'].includes(componentType)) return 'systems'; if (componentType === 'Game') return 'games'; return 'creator'; }
function hasReadyUrl(value: string) { try { const url = new URL(value); return url.protocol === 'https:' && url.hostname !== 'example.com'; } catch { return false; } }

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/60';
const smallButton = 'rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30';
const readyBadge = 'rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300';
const warningBadge = 'rounded-full bg-amber-500/10 px-1.5 py-0.5 text-amber-200';
