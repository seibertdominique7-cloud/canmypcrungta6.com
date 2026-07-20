'use client';

/* eslint-disable @next/next/no-img-element -- Admin-selected URLs are validated at runtime and can use any HTTPS host. */

import { useMemo, useState, type ReactNode } from 'react';

import type { MediaAssetRecord, MediaFolderRecord } from '../../lib/cms-types';

export interface AdminImageSelection {
  url: string;
  altText: string;
  title: string;
  media: MediaAssetRecord;
}

interface MediaResponse {
  error?: string;
  items?: MediaAssetRecord[];
  folders?: MediaFolderRecord[];
}

export function AdminImageField({ label, value, media, folders, onChange, onMediaChange, helpText }: {
  label: string;
  value: string;
  media: MediaAssetRecord[];
  folders: MediaFolderRecord[];
  onChange: (value: string) => void;
  onMediaChange?: (items: MediaAssetRecord[]) => void;
  helpText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [brokenUrl, setBrokenUrl] = useState('');
  const broken = Boolean(value) && brokenUrl === value;
  return (
    <section className="grid gap-2">
      <span className="text-sm font-bold text-slate-300">{label}</span>
      {value ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-3">
          {!broken ? <img alt="Selected image preview" className="max-h-44 w-full rounded-xl object-contain" onError={() => setBrokenUrl(value)} src={value} /> : <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-4 text-xs text-amber-200">This image could not be loaded. Replace it or verify the remote URL.</p>}
          <p className="mt-2 truncate text-xs text-slate-500">{value}</p>
        </div>
      ) : <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">No image selected</div>}
      <div className="flex flex-wrap gap-2">
        <button className={secondaryButton} onClick={() => setOpen(true)} type="button">{value ? 'Replace image' : 'Choose image'}</button>
        {value ? <button className={dangerButton} onClick={() => onChange('')} type="button">Remove</button> : null}
      </div>
      {helpText ? <span className="text-xs font-normal leading-5 text-slate-500">{helpText}</span> : null}
      <AdminMediaChooser folders={folders} media={media} onClose={() => setOpen(false)} onMediaChange={onMediaChange} onSelect={(selection) => { onChange(selection.url); setOpen(false); }} open={open} title={`Choose ${label.toLowerCase()}`} />
    </section>
  );
}

export function AdminMediaChooser({ open, title, media, folders, onClose, onSelect, onMediaChange, footer }: {
  open: boolean;
  title: string;
  media: MediaAssetRecord[];
  folders: MediaFolderRecord[];
  onClose: () => void;
  onSelect: (selection: AdminImageSelection) => void;
  onMediaChange?: (items: MediaAssetRecord[]) => void;
  footer?: ReactNode;
}) {
  const [mode, setMode] = useState<'upload' | 'url' | 'library'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [imageTitle, setImageTitle] = useState('');
  const [folderId, setFolderId] = useState('');
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<'all' | 'upload' | 'external'>('all');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [remoteState, setRemoteState] = useState<'empty' | 'loading' | 'ready' | 'broken'>('empty');
  const visible = useMemo(() => media.filter((item) => {
    if (source !== 'all' && item.sourceType !== source) return false;
    const normalized = query.trim().toLowerCase();
    return !normalized || `${item.filename} ${item.title} ${item.altText}`.toLowerCase().includes(normalized);
  }), [media, query, source]);

  if (!open) return null;

  const chooseCreated = (before: Set<string>, items: MediaAssetRecord[]) => {
    onMediaChange?.(items);
    const created = items.find((item) => !before.has(item.id)) ?? items[0];
    if (!created) throw new Error('The image was saved but could not be selected. Reopen the media library and choose it.');
    onSelect({ url: created.url, altText: created.altText, title: created.title, media: created });
  };

  const upload = () => {
    if (!file) { setError('Choose an image file.'); return; }
    setBusy(true); setError(''); setProgress(0);
    const before = new Set(media.map((item) => item.id)); const form = new FormData(); form.set('file', file); form.set('altText', altText); form.set('title', imageTitle); if (folderId) form.set('folderId', folderId);
    const xhr = new XMLHttpRequest(); xhr.open('POST', '/api/admin/cms/media'); xhr.responseType = 'json';
    xhr.upload.addEventListener('progress', (event) => { if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100)); });
    xhr.addEventListener('load', () => { setBusy(false); const payload = xhr.response as MediaResponse | null; if (xhr.status < 200 || xhr.status >= 300) { setError(payload?.error || 'Upload failed.'); return; } try { chooseCreated(before, payload?.items ?? []); } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.'); } });
    xhr.addEventListener('error', () => { setBusy(false); setError('The upload connection failed. You can retry without losing your draft.'); });
    xhr.send(form);
  };

  const addUrl = async () => {
    if (remoteState !== 'ready') { setError('Preview a working HTTPS image before saving it.'); return; }
    setBusy(true); setError(''); const before = new Set(media.map((item) => item.id));
    try {
      const response = await fetch('/api/admin/cms/media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, altText, title: imageTitle, folderId: folderId || null }) });
      const payload = await response.json() as MediaResponse;
      if (!response.ok) throw new Error(payload.error || 'The external image could not be added.');
      chooseCreated(before, payload.items ?? []);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'The external image could not be added.'); }
    finally { setBusy(false); }
  };

  return (
    <div aria-modal="true" className="fixed inset-0 z-[70] overflow-y-auto bg-black/80 p-3 backdrop-blur-sm" role="dialog">
      <div className="mx-auto my-6 max-w-4xl rounded-3xl border border-white/15 bg-[#0d111d] p-5 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black text-white">{title}</h2><button className={secondaryButton} onClick={onClose} type="button">Close</button></div>
        <div className="mt-5 grid grid-cols-3 gap-2" role="tablist">{([['upload', 'Upload File'], ['url', 'Use Image URL'], ['library', 'Media Library']] as const).map(([value, label]) => <button aria-selected={mode === value} className={mode === value ? activeTab : tab} key={value} onClick={() => { setMode(value); setError(''); }} role="tab" type="button">{label}</button>)}</div>
        {error ? <p aria-live="polite" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
        {mode !== 'library' ? <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold text-slate-300">Alt text<input className={inputClass} onChange={(event) => setAltText(event.target.value)} placeholder="Describe the image" value={altText} /></label><label className="grid gap-2 text-sm font-bold text-slate-300">Title<input className={inputClass} onChange={(event) => setImageTitle(event.target.value)} placeholder="Internal media title" value={imageTitle} /></label><label className="grid gap-2 text-sm font-bold text-slate-300">Folder (optional)<select className={inputClass} onChange={(event) => setFolderId(event.target.value)} value={folderId}><option value="">No folder</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label></div> : null}
        {mode === 'upload' ? <section className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4"><label className="grid gap-2 text-sm font-bold text-slate-300">Image file<input accept="image/jpeg,image/png,image/webp,image/avif" className={inputClass} onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" /></label>{busy ? <div className="mt-4"><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-violet-400 transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-1 text-xs text-slate-400">Uploading {progress}%</p></div> : null}<button className={`${primaryButton} mt-4`} disabled={busy || !file} onClick={upload} type="button">{busy ? 'Uploading…' : 'Upload and use image'}</button></section> : null}
        {mode === 'url' ? <section className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4"><label className="grid gap-2 text-sm font-bold text-slate-300">HTTPS image URL<input className={inputClass} onChange={(event) => { setUrl(event.target.value); setRemoteState(event.target.value ? 'loading' : 'empty'); }} placeholder="https://cdn.example.com/image.jpg" value={url} /></label>{url ? <div className="mt-4 rounded-xl border border-white/10 p-3"><img alt="Remote image preview" className={`mx-auto max-h-64 max-w-full object-contain ${remoteState === 'broken' ? 'hidden' : ''}`} onError={() => setRemoteState('broken')} onLoad={() => setRemoteState('ready')} src={url} />{remoteState === 'loading' ? <p className="text-sm text-slate-400">Loading preview…</p> : null}{remoteState === 'broken' ? <p className="text-sm text-amber-200">This remote image could not be loaded. Check the URL before saving.</p> : null}</div> : null}<button className={`${primaryButton} mt-4`} disabled={busy || remoteState !== 'ready'} onClick={() => void addUrl()} type="button">{busy ? 'Saving…' : 'Add and use image'}</button></section> : null}
        {mode === 'library' ? <section className="mt-5"><div className="grid gap-3 sm:grid-cols-2"><input aria-label="Search media" className={inputClass} onChange={(event) => setQuery(event.target.value)} placeholder="Search media" value={query} /><select aria-label="Filter media source" className={inputClass} onChange={(event) => setSource(event.target.value as typeof source)} value={source}><option value="all">All sources</option><option value="upload">Uploaded</option><option value="external">External</option></select></div><div className="mt-4 grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">{visible.map((item) => <button className="rounded-xl border border-white/10 bg-black/20 p-2 text-left hover:border-violet-400/60" key={item.id} onClick={() => onSelect({ url: item.url, altText: item.altText, title: item.title, media: item })} type="button"><img alt={item.altText || ''} className="aspect-video w-full rounded-lg object-contain" src={item.url} /><span className="mt-2 block truncate text-xs font-bold text-white">{item.title || item.filename}</span><span className="text-[10px] uppercase text-slate-500">{item.sourceType}</span></button>)}</div>{visible.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">No images match these filters.</p> : null}</section> : null}
        {footer}
      </div>
    </div>
  );
}

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/60';
const primaryButton = 'rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10';
const dangerButton = 'rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/20';
const tab = 'rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-black text-slate-400';
const activeTab = 'rounded-xl border border-violet-400/40 bg-violet-500/15 px-3 py-2.5 text-xs font-black text-violet-200';
