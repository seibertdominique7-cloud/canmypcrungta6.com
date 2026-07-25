/* eslint-disable @next/next/no-img-element -- CMS and affiliate images use admin-managed runtime URLs. */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { ContentWorkspace } from '../../lib/cms-types';
import {
  affiliateProductHtml,
  affiliateProductIds,
  bodyToEditorHtml,
  hasInlineAffiliateLinks,
  imageHtml,
  inlineAffiliateProductIds,
  merchandiseProductHtml,
  merchandiseProductIds,
  removeAffiliateProduct,
  removeMerchandiseProduct,
  replaceAffiliateProduct,
  replaceMerchandiseProduct,
} from '../../lib/rich-text-shared';
import { RecommendationProductCard } from '../RecommendationProductCard';
import { AdminMediaChooser, type AdminImageSelection } from './AdminImageField';
import { RichTextEditor, cleanEditorHtml, type RichTextEditorHandle } from './RichTextEditor';

type Product = ContentWorkspace['affiliateProducts'][number];
type Merchandise = ContentWorkspace['merchandiseProducts'][number];

export function ContentComposer({
  body,
  title,
  excerpt,
  featuredImage,
  workspace,
  onChange,
  onMediaChange,
}: {
  body: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  workspace: ContentWorkspace;
  onChange: (body: string) => void;
  onMediaChange: (media: ContentWorkspace['media']) => void;
}) {
  const editorRef = useRef<RichTextEditorHandle>(null);
  const [mode, setMode] = useState<'write' | 'preview' | 'split'>('write');
  const [mediaOpen, setMediaOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<AdminImageSelection | null>(null);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [merchPickerOpen, setMerchPickerOpen] = useState(false);
  const [merchSearch, setMerchSearch] = useState('');
  const [editingMerchId, setEditingMerchId] = useState<string | null>(null);
  const selectedProductIds = affiliateProductIds(body);
  const selectedMerchIds = merchandiseProductIds(body);
  const hasInlineAffiliateLink = hasInlineAffiliateLinks(body);
  const inlineLinkWarnings = inlineAffiliateProductIds(body).flatMap((id) => {
    const product = workspace.affiliateProducts.find((item) => item.id === id);
    if (!product) return [`A linked affiliate product was deleted (${id}). Its saved article URL is preserved.`];
    if (!product.enabled) return [`${product.title} is disabled. Its saved article URL is preserved until you replace or remove the link.`];
    if (!product.affiliateUrl.trim()) return [`${product.title} no longer has an affiliate URL. Its saved article URL is preserved.`];
    return [];
  });

  const insertSpecialBlock = (kind: string, label: string, text = '') => {
    editorRef.current?.insertHtml(
      `<cms-block kind="${kind}" argument="" contenteditable="false"><strong>${label}</strong><span>${text}</span></cms-block><p><br></p>`,
    );
  };

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-300">Content editor</p>
        <div className="flex rounded-xl border border-white/10 bg-black/20 p-1" role="tablist" aria-label="Editor view">
          {(['write', 'preview', 'split'] as const).map((item) => (
            <button
              aria-selected={mode === item}
              className={`rounded-lg px-3 py-1.5 text-xs font-black capitalize ${mode === item ? 'bg-violet-500 text-white' : 'text-slate-400 hover:text-white'}`}
              key={item}
              onClick={() => setMode(item)}
              role="tab"
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className={smallButton} onClick={() => setMediaOpen(true)} type="button">Add Image</button>
        <button className={smallButton} onClick={() => { setEditingProductId(null); setProductPickerOpen(true); }} type="button">Add Product</button>
        <button className={smallButton} onClick={() => { setEditingMerchId(null); setMerchPickerOpen(true); }} type="button">Add Merchandise</button>
        <details className="relative">
          <summary className={`${smallButton} cursor-pointer list-none`}>Add Block</summary>
          <div className="absolute left-0 top-11 z-30 grid min-w-44 gap-1 rounded-xl border border-white/15 bg-[#111827] p-2 shadow-2xl">
            <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Writing blocks</p>
            <button className={menuButton} onClick={() => editorRef.current?.insertHtml('<p><br></p>')} type="button">Paragraph</button>
            <button className={menuButton} onClick={() => editorRef.current?.insertHtml('<h2>Section heading</h2><p><br></p>')} type="button">Heading</button>
            <button className={menuButton} onClick={() => editorRef.current?.insertHtml('<blockquote>Quote text</blockquote><p><br></p>')} type="button">Quote</button>
            <button className={menuButton} onClick={() => editorRef.current?.insertHtml('<table><thead><tr><th>Heading 1</th><th>Heading 2</th></tr></thead><tbody><tr><td>Value</td><td>Value</td></tr></tbody></table><p><br></p>')} type="button">Table</button>
            <button className={menuButton} onClick={() => editorRef.current?.insertHtml('<hr><p><br></p>')} type="button">Divider</button>
            <p className="mt-1 border-t border-white/10 px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Smart blocks</p>
            <button className={menuButton} onClick={() => insertSpecialBlock('callout', 'Callout', 'Helpful note')} type="button">Callout</button>
            <button className={menuButton} onClick={() => insertSpecialBlock('faq', 'FAQ', 'Q: Question?\nA: Answer')} type="button">FAQ</button>
            <button className={menuButton} onClick={() => insertSpecialBlock('email-signup', 'Email signup')} type="button">Email signup</button>
            <button className={menuButton} onClick={() => insertSpecialBlock('checker', 'PC checker', 'Check your PC now')} type="button">Checker CTA</button>
            <button className={menuButton} onClick={() => insertSpecialBlock('ad', 'Ad slot')} type="button">Ad slot</button>
          </div>
        </details>
      </div>

      <div className={`grid gap-4 ${mode === 'split' ? 'xl:grid-cols-2' : ''}`}>
        {mode !== 'preview' ? <RichTextEditor body={body} onChange={onChange} onEditAffiliateProduct={(productId) => { setEditingProductId(productId); setProductPickerOpen(true); }} products={workspace.affiliateProducts} ref={editorRef} /> : null}
        {mode !== 'write' ? (
          <DraftPreview
            body={body}
            excerpt={excerpt}
            featuredImage={featuredImage}
            products={workspace.affiliateProducts}
            merchandise={workspace.merchandiseProducts}
            title={title}
          />
        ) : null}
      </div>

      <BodyImageManager
        body={body}
        onChange={onChange}
        onMediaChange={onMediaChange}
        workspace={workspace}
      />

      {hasInlineAffiliateLink ? (
        <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-200">
          Affiliate disclosure enabled. The site disclosure will appear automatically on the published article and in preview output.
        </p>
      ) : null}

      {inlineLinkWarnings.length ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
          <p className="font-black">Affiliate link warning</p>
          <ul className="mt-1 list-disc pl-5">{inlineLinkWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </div>
      ) : null}

      {selectedProductIds.length ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Products in this content</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {selectedProductIds.map((id) => {
              const product = workspace.affiliateProducts.find((item) => item.id === id);
              return (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3" key={id}>
                  <span className="truncate text-sm font-bold text-white">{product?.title ?? `Missing product (${id})`}</span>
                  <span className="flex gap-2">
                    <button className={smallButton} onClick={() => { setEditingProductId(id); setProductPickerOpen(true); }} type="button">Edit</button>
                    <button className={dangerButton} onClick={() => onChange(removeAffiliateProduct(body, id))} type="button">Remove</button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {selectedMerchIds.length ? (
        <div className="rounded-2xl border border-pink-400/20 bg-pink-500/[0.05] p-3">
          <p className="text-xs font-black uppercase tracking-wide text-pink-200">Merchandise in this content</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {selectedMerchIds.map((id) => {
              const product = workspace.merchandiseProducts.find((item) => item.id === id);
              return (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3" key={id}>
                  <span className="truncate text-sm font-bold text-white">{product?.title || `Missing merchandise (${id})`}</span>
                  <span className="flex gap-2">
                    <button className={smallButton} onClick={() => { setEditingMerchId(id); setMerchPickerOpen(true); }} type="button">Edit</button>
                    <button className={dangerButton} onClick={() => onChange(removeMerchandiseProduct(body, id))} type="button">Remove</button>
                  </span>
                </div>
              );
            })}
          </div>
          {selectedMerchIds.some((id) => {
            const product = workspace.merchandiseProducts.find((item) => item.id === id);
            return !product || !product.enabled || !product.articleVisible;
          }) ? <p className="mt-3 text-xs leading-5 text-amber-200">One or more merchandise blocks are hidden publicly because the product is missing, disabled, or not enabled for articles.</p> : null}
        </div>
      ) : null}

      <AdminMediaChooser
        folders={workspace.mediaFolders}
        media={workspace.media}
        onClose={() => setMediaOpen(false)}
        onMediaChange={onMediaChange}
        onSelect={(selection) => { setSelectedImage(selection); setMediaOpen(false); }}
        open={mediaOpen}
        title="Add image to content"
      />
      {selectedImage ? (
        <ImageDetailsDialog
          initialAlt={selectedImage.altText}
          onClose={() => setSelectedImage(null)}
          onInsert={(options) => {
            editorRef.current?.insertHtml(imageHtml(selectedImage.url, options));
            setSelectedImage(null);
          }}
        />
      ) : null}
      {productPickerOpen ? (
        <ProductPicker
          editingId={editingProductId}
          onAdd={(product) => {
            if (editingProductId) onChange(replaceAffiliateProduct(body, editingProductId, product));
            else editorRef.current?.insertHtml(affiliateProductHtml(product));
            setEditingProductId(null);
            setProductPickerOpen(false);
          }}
          onClose={() => { setEditingProductId(null); setProductPickerOpen(false); }}
          products={workspace.affiliateProducts.filter((item) => item.enabled)}
          search={productSearch}
          selectedIds={selectedProductIds}
          setSearch={setProductSearch}
        />
      ) : null}
      {merchPickerOpen ? (
        <MerchandisePicker
          editingId={editingMerchId}
          onAdd={(product) => {
            if (editingMerchId) onChange(replaceMerchandiseProduct(body, editingMerchId, product));
            else editorRef.current?.insertHtml(merchandiseProductHtml(product));
            setEditingMerchId(null);
            setMerchPickerOpen(false);
          }}
          onClose={() => { setEditingMerchId(null); setMerchPickerOpen(false); }}
          products={workspace.merchandiseProducts.filter((item) => item.enabled && item.articleVisible)}
          search={merchSearch}
          selectedIds={selectedMerchIds}
          setSearch={setMerchSearch}
        />
      ) : null}
    </section>
  );
}

function MerchandisePicker({ products, selectedIds, search, setSearch, onAdd, onClose, editingId }: { products: Merchandise[]; selectedIds: string[]; search: string; setSearch: (value: string) => void; onAdd: (product: Merchandise) => void; onClose: () => void; editingId: string | null }) {
  const visible = products.filter((product) => `${product.title} ${product.productType} ${product.badge}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div aria-modal="true" className="fixed inset-0 z-[90] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" role="dialog">
      <div className="mx-auto my-10 max-w-3xl rounded-3xl border border-white/15 bg-[#0d111d] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-wide text-pink-300">Merchandise catalog</p><h2 className="mt-1 text-xl font-black">{editingId ? 'Edit Merchandise Block' : 'Add Merchandise'}</h2><p className="mt-1 text-sm text-slate-400">Only enabled products approved for article use appear here.</p></div>
          <button className={smallButton} onClick={onClose} type="button">Done</button>
        </div>
        <input autoFocus className={`${inputClass} mt-5`} onChange={(event) => setSearch(event.target.value)} placeholder="Search merchandise" value={search} />
        <div className="mt-4 grid max-h-[60vh] gap-3 overflow-y-auto sm:grid-cols-2">
          {visible.map((product) => {
            const selected = selectedIds.includes(product.id) && product.id !== editingId;
            return (
              <article className="flex min-h-28 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3" key={product.id}>
                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/30">
                  {product.imageUrl ? <img alt="" className="h-full w-full object-contain p-1" src={product.imageUrl} /> : <span className="text-[10px] font-bold uppercase text-slate-600">No image</span>}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate font-black text-white">{product.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{product.productType} · {product.priceText}</p>
                  <button className={`${selected ? smallButton : primaryButton} mt-auto`} disabled={selected} onClick={() => onAdd(product)} type="button">{selected ? 'Added' : editingId ? 'Use this product' : 'Add merchandise'}</button>
                </div>
              </article>
            );
          })}
          {!visible.length ? <p className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No enabled article merchandise matches this search.</p> : null}
        </div>
      </div>
    </div>
  );
}

function ProductPicker({ products, selectedIds, search, setSearch, onAdd, onClose, editingId }: { products: Product[]; selectedIds: string[]; search: string; setSearch: (value: string) => void; onAdd: (product: Product) => void; onClose: () => void; editingId: string | null }) {
  const visible = products.filter((product) => `${product.title} ${product.retailer} ${product.componentType}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div aria-modal="true" className="fixed inset-0 z-[90] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" role="dialog">
      <div className="mx-auto my-10 max-w-3xl rounded-3xl border border-white/15 bg-[#0d111d] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-wide text-violet-300">Affiliate catalog</p><h2 className="mt-1 text-xl font-black">{editingId ? 'Edit Product Block' : 'Add Product'}</h2><p className="mt-1 text-sm text-slate-400">{editingId ? 'Choose a replacement. The block stays in the same article position.' : 'Add any enabled product. The published card stays connected to its admin-managed data.'}</p></div>
          <button className={smallButton} onClick={onClose} type="button">Done</button>
        </div>
        <input autoFocus className={`${inputClass} mt-5`} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" value={search} />
        <div className="mt-4 grid max-h-[60vh] gap-3 overflow-y-auto sm:grid-cols-2">
          {visible.map((product) => {
            const selected = selectedIds.includes(product.id) && product.id !== editingId;
            return (
              <article className="flex min-h-28 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3" key={product.id}>
                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/30">
                  {product.imageUrl ? <img alt="" className="h-full w-full object-contain p-1" src={product.imageUrl} /> : <span className="text-[10px] font-bold uppercase text-slate-600">No image</span>}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate font-black text-white">{product.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{product.retailer} · {product.componentType}</p>
                  <button className={`${selected ? smallButton : primaryButton} mt-auto`} disabled={selected} onClick={() => onAdd(product)} type="button">{selected ? 'Added' : editingId ? 'Use this product' : 'Add product'}</button>
                </div>
              </article>
            );
          })}
          {!visible.length ? <p className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No enabled products match this search.</p> : null}
        </div>
      </div>
    </div>
  );
}

function DraftPreview({ body, title, excerpt, featuredImage, products, merchandise }: { body: string; title: string; excerpt: string; featuredImage: string; products: Product[]; merchandise: Merchandise[] }) {
  const [html, setHtml] = useState('<p class="text-slate-500">Preparing preview…</p>');
  useEffect(() => {
    const frame = requestAnimationFrame(() => setHtml(cleanEditorHtml(bodyToEditorHtml(body))));
    return () => cancelAnimationFrame(frame);
  }, [body]);
  const segments = useMemo(() => previewSegments(html), [html]);
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const merchandiseMap = useMemo(() => new Map(merchandise.map((product) => [product.id, product])), [merchandise]);
  const hasAffiliate = hasInlineAffiliateLinks(body) || segments.some((segment) => segment.kind === 'product' && productMap.has(segment.productId));
  return (
    <div className="max-h-[760px] overflow-y-auto rounded-2xl border border-white/10 bg-[#090d17] p-5 shadow-inner">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">Live article preview</p>
      <h1 className="mt-3 text-3xl font-black leading-tight text-white">{title || 'Untitled article'}</h1>
      {excerpt ? <p className="mt-3 text-lg leading-7 text-slate-300">{excerpt}</p> : null}
      {featuredImage ? <img alt="" className="mt-5 max-h-72 w-full rounded-2xl object-contain" src={featuredImage} /> : null}
      <div className="cms-draft-preview mt-5 grid gap-4 text-base leading-7 text-slate-200 [&_a]:font-bold [&_a]:text-violet-300 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-violet-400 [&_blockquote]:bg-violet-500/10 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-slate-500 [&_h1]:text-2xl [&_h1]:font-black [&_h2]:text-xl [&_h2]:font-black [&_h3]:text-lg [&_h3]:font-black [&_h4]:text-base [&_h4]:font-black [&_img]:max-h-[520px] [&_img]:w-full [&_img]:object-contain [&_li]:ml-6 [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-black/50 [&_pre]:p-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-white/10 [&_td]:p-2 [&_th]:border [&_th]:border-white/10 [&_th]:p-2 [&_ul]:list-disc">
        {segments.map((segment, index) => {
          if (segment.kind === 'html') return <div dangerouslySetInnerHTML={{ __html: segment.html }} key={index} />;
          if (segment.kind === 'block') return <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4" key={index}><strong className="capitalize">{segment.blockKind.replace('-', ' ')}</strong><p className="mt-1 whitespace-pre-line text-sm text-cyan-50/80">{segment.text}</p></div>;
          if (segment.kind === 'merchandise') {
            const merch = merchandiseMap.get(segment.productId);
            return merch ? <div className="rounded-2xl border border-pink-400/25 bg-pink-500/10 p-4" key={index}><p className="text-xs font-black uppercase tracking-wide text-pink-200">Merchandise preview</p><div className="mt-3 flex gap-3">{merch.imageUrl ? <img alt="" className="size-20 rounded-xl bg-black/20 object-contain" src={merch.imageUrl} /> : null}<div><strong className="text-white">{merch.title}</strong><p className="mt-1 text-sm text-slate-300">{merch.shortDescription}</p><p className="mt-2 text-xs font-black text-pink-200">{merch.priceText}</p></div></div></div> : <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-sm text-amber-200" key={index}>This merchandise product is missing.</div>;
          }
          const product = productMap.get(segment.productId);
          return product ? <div className="max-w-xl" key={index}><RecommendationProductCard preview product={{ ...product, badge: 'Recommended', buttonText: 'View Product', platform: null }} /></div> : <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-sm text-amber-200" key={index}>This product is missing or disabled.</div>;
        })}
        {hasAffiliate ? <p className="mt-2 border-t border-white/10 pt-4 text-xs leading-5 text-slate-500">Disclosure: We may earn a commission when you purchase through links on this page, at no additional cost to you.</p> : null}
      </div>
    </div>
  );
}

type PreviewSegment = { kind: 'html'; html: string } | { kind: 'product'; productId: string } | { kind: 'merchandise'; productId: string } | { kind: 'block'; blockKind: string; text: string };
function previewSegments(html: string): PreviewSegment[] {
  const segments: PreviewSegment[] = [];
  const pattern = /<(cms-affiliate|cms-merch|cms-block)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let offset = 0;
  for (const match of html.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > offset) segments.push({ kind: 'html', html: html.slice(offset, index) });
    if (match[1].toLowerCase() === 'cms-affiliate') segments.push({ kind: 'product', productId: attribute(match[2], 'product-id') });
    else if (match[1].toLowerCase() === 'cms-merch') segments.push({ kind: 'merchandise', productId: attribute(match[2], 'product-id') });
    else segments.push({ kind: 'block', blockKind: attribute(match[2], 'kind'), text: stripHtml(match[3]) });
    offset = index + match[0].length;
  }
  if (offset < html.length) segments.push({ kind: 'html', html: html.slice(offset) });
  const monetized = (segment: PreviewSegment) => segment.kind === 'product' || segment.kind === 'merchandise' || (segment.kind === 'block' && ['email-signup', 'ad'].includes(segment.blockKind));
  const early = segments.slice(0, 2).filter(monetized);
  return early.length ? [...segments.slice(0, 2).filter((segment) => !monetized(segment)), ...segments.slice(2), ...early] : segments;
}

function ImageDetailsDialog({ initialAlt, onClose, onInsert }: { initialAlt: string; onClose: () => void; onInsert: (options: ImageOptions) => void }) {
  const [alt, setAlt] = useState(initialAlt);
  const [caption, setCaption] = useState('');
  const [align, setAlign] = useState<ImageOptions['align']>('center');
  const [size, setSize] = useState<ImageOptions['size']>('large');
  const [link, setLink] = useState('');
  return (
    <div aria-modal="true" className="fixed inset-0 z-[95] overflow-y-auto bg-black/80 p-4" role="dialog">
      <div className="mx-auto my-10 max-w-xl rounded-3xl border border-white/15 bg-[#0d111d] p-5">
        <div className="flex items-center justify-between"><h2 className="text-xl font-black">Image details</h2><button className={smallButton} onClick={onClose} type="button">Close</button></div>
        <div className="mt-5 grid gap-4">
          <label className={labelClass}>Alt text<input className={inputClass} onChange={(event) => setAlt(event.target.value)} placeholder="Describe the image for readers who cannot see it" value={alt} /></label>
          <label className={labelClass}>Caption (optional)<input className={inputClass} onChange={(event) => setCaption(event.target.value)} value={caption} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Alignment<select className={inputClass} onChange={(event) => setAlign(event.target.value as ImageOptions['align'])} value={align}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="full">Full width</option></select></label>
            <label className={labelClass}>Size<select className={inputClass} onChange={(event) => setSize(event.target.value as ImageOptions['size'])} value={size}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="full">Full width</option></select></label>
          </div>
          <label className={labelClass}>Optional link<input className={inputClass} onChange={(event) => setLink(event.target.value)} placeholder="https://… or /page" value={link} /></label>
          <button className={primaryButton} onClick={() => onInsert({ alt, caption, align, size, link })} type="button">Insert image</button>
        </div>
      </div>
    </div>
  );
}

function BodyImageManager({ body, workspace, onChange, onMediaChange }: { body: string; workspace: ContentWorkspace; onChange: (body: string) => void; onMediaChange: (media: ContentWorkspace['media']) => void }) {
  const images = editorImages(body);
  const [replacement, setReplacement] = useState<EditorImage | null>(null);
  if (!images.length) return null;
  return (
    <details className="rounded-xl border border-white/10 bg-black/20 p-3">
      <summary className="cursor-pointer text-xs font-black text-slate-300">Manage body images ({images.length})</summary>
      <div className="mt-3 grid gap-2">
        {images.map((image, index) => (
          <div className="flex items-center gap-3 rounded-lg border border-white/10 p-2 text-xs" key={`${image.url}-${index}`}>
            <img alt="" className="size-14 shrink-0 rounded-lg bg-black/30 object-contain" src={image.url} />
            <span className="min-w-0 flex-1 truncate text-slate-400">{image.url}</span>
            <span className="flex gap-2"><button className={smallButton} onClick={() => setReplacement(image)} type="button">Replace</button><button className={dangerButton} onClick={() => onChange(body.replace(image.raw, ''))} type="button">Remove</button></span>
          </div>
        ))}
      </div>
      <AdminMediaChooser folders={workspace.mediaFolders} media={workspace.media} onClose={() => setReplacement(null)} onMediaChange={onMediaChange} onSelect={(selection) => { if (replacement) onChange(body.replace(replacement.raw, replacement.raw.replace(replacement.url, selection.url))); setReplacement(null); }} open={Boolean(replacement)} title="Replace body image" />
    </details>
  );
}

interface ImageOptions { alt: string; caption: string; align: 'left' | 'center' | 'right' | 'full'; size: 'small' | 'medium' | 'large' | 'full'; link: string }
interface EditorImage { raw: string; url: string }
function editorImages(body: string): EditorImage[] {
  const images: EditorImage[] = [];
  for (const match of body.matchAll(/<figure\b[^>]*data-cms-image=["'][^"']+["'][^>]*>[\s\S]*?<\/figure>/gi)) {
    const url = /<img\b[^>]*src=["']([^"']+)["']/i.exec(match[0])?.[1];
    if (url) images.push({ raw: match[0], url });
  }
  for (const match of body.matchAll(/:::image\s*\n([\s\S]*?)\n:::/g)) { const url = /^url:\s*(.+)$/m.exec(match[1])?.[1]?.trim(); if (url) images.push({ raw: match[0], url }); }
  for (const match of body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) images.push({ raw: match[0], url: match[1] });
  return images;
}
function attribute(source: string, name: string) { return new RegExp(`\\b${name}=["']([^"']*)["']`, 'i').exec(source)?.[1] ?? ''; }
function stripHtml(value: string) { if (typeof DOMParser === 'undefined') return value.replace(/<[^>]+>/g, ''); return new DOMParser().parseFromString(value, 'text/html').body.textContent?.trim() ?? ''; }

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/60';
const labelClass = 'grid gap-2 text-sm font-bold text-slate-300';
const primaryButton = 'rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-400 disabled:opacity-50';
const smallButton = 'rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40';
const menuButton = 'rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white';
const dangerButton = 'rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/20';
