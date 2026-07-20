'use client';

import { useState } from 'react';
import Link from 'next/link';

import {
  AD_DEVICE_TARGETS,
  AD_FORMATS,
  AD_PROVIDERS,
  type AdAdminWorkspace,
  type AdGlobalSettingsRecord,
  type AdPlacementRecord,
} from '../../lib/ad-types';
import { AdminHeader } from './AdminHeader';

interface AdminResponse {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  workspace?: AdAdminWorkspace;
}

export function AdsAdminDashboard({ initialWorkspace }: { initialWorkspace: AdAdminWorkspace }) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [busyKey, setBusyKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  const updateGlobal = <K extends keyof AdGlobalSettingsRecord>(
    key: K,
    value: AdGlobalSettingsRecord[K],
  ) => setWorkspace((current) => ({ ...current, global: { ...current.global, [key]: value } }));

  const updatePlacement = (code: string, patch: Partial<AdPlacementRecord>) => {
    setWorkspace((current) => ({
      ...current,
      placements: current.placements.map((placement) =>
        placement.code === code ? { ...placement, ...patch } : placement,
      ),
    }));
  };

  const request = async (key: string, url: string, method: 'PATCH' | 'POST', body?: unknown) => {
    setBusyKey(key);
    setMessage('');
    setError('');
    setFieldErrors({});
    try {
      const response = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const payload = await response.json() as AdminResponse;
      if (!response.ok) {
        setFieldErrors(payload.fieldErrors ?? {});
        throw new Error(payload.error || 'The ad settings could not be saved.');
      }
      if (payload.workspace) setWorkspace(payload.workspace);
      setMessage(payload.message ?? 'Saved.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The request failed.');
    } finally {
      setBusyKey('');
    }
  };

  const saveGlobal = () => request('global', '/api/admin/ads', 'PATCH', workspace.global);
  const savePlacement = (placement: AdPlacementRecord) => request(
    placement.code,
    `/api/admin/ads/placements/${placement.code}`,
    'PATCH',
    placement,
  );
  const resetPlacement = (placement: AdPlacementRecord) => request(
    `reset-${placement.code}`,
    `/api/admin/ads/placements/${placement.code}/reset`,
    'POST',
  );

  return (
    <main className="admin-theme min-h-screen px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <AdminHeader active="ads" />
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500">
          <Link className="hover:text-violet-300" href="/admin">Dashboard</Link>
          <span className="mx-2">/</span>
          <span>Monetization</span>
          <span className="mx-2">/</span>
          <span className="text-slate-300">Ads</span>
        </nav>

        <header className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">Monetization</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Ads</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Configure the seven existing ad positions. Nothing renders publicly unless both the
            master switch and a valid placement are enabled.
          </p>
          {message || error ? (
            <p className={`mt-4 rounded-xl border p-3 text-sm ${error ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'}`}>
              {error || message}
            </p>
          ) : null}
        </header>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-violet-300">Global settings</p>
              <h2 className="mt-1 text-2xl font-black">Global Ad Settings</h2>
            </div>
            <StatusBadge enabled={workspace.global.masterEnabled} />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ToggleField
              checked={workspace.global.masterEnabled}
              description="Required before any placement can render a live ad."
              label="Master ads enabled"
              onChange={(checked) => updateGlobal('masterEnabled', checked)}
            />
            <SelectField
              label="Default ad provider"
              onChange={(value) => updateGlobal('defaultProvider', value as AdGlobalSettingsRecord['defaultProvider'])}
              options={AD_PROVIDERS}
              value={workspace.global.defaultProvider}
            />
            <TextField
              error={fieldErrors.adsenseClient}
              help={workspace.environmentFallback.clientConfigured && !workspace.global.adsenseClient ? 'A valid NEXT_PUBLIC_ADSENSE_CLIENT fallback is configured.' : 'Example: ca-pub-1234567890123456'}
              label="Default Google AdSense client ID"
              onChange={(value) => updateGlobal('adsenseClient', value)}
              value={workspace.global.adsenseClient}
            />
            <TextField
              error={fieldErrors.defaultLabel}
              label="Default advertisement label"
              onChange={(value) => updateGlobal('defaultLabel', value)}
              value={workspace.global.defaultLabel}
            />
            <ToggleField
              checked={workspace.global.debugPlaceholders}
              description="Visible in development only. Production visitors never receive this debug mode."
              label="Development debug placeholders"
              onChange={(checked) => updateGlobal('debugPlaceholders', checked)}
            />
            <ToggleField
              checked={workspace.global.defaultResponsive}
              description="Used by fallback and newly initialized placements."
              label="Default responsive behavior"
              onChange={(checked) => updateGlobal('defaultResponsive', checked)}
            />
          </div>
          <button
            className={primaryButtonClass}
            disabled={Boolean(busyKey)}
            onClick={() => void saveGlobal()}
            type="button"
          >
            {busyKey === 'global' ? 'Saving...' : 'Save Global Settings'}
          </button>
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-wider text-violet-300">Fixed positions</p>
            <h2 className="mt-1 text-2xl font-black">Ad Placements</h2>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            {workspace.placements.map((placement) => (
              <PlacementEditor
                busyKey={busyKey}
                environmentSlotConfigured={workspace.environmentFallback.slotsConfigured[placement.code]}
                fieldErrors={fieldErrors}
                isPreviewing={previewCode === placement.code}
                key={placement.code}
                onPreview={() => setPreviewCode((current) => current === placement.code ? null : placement.code)}
                onReset={() => void resetPlacement(placement)}
                onSave={() => void savePlacement(placement)}
                onUpdate={(patch) => updatePlacement(placement.code, patch)}
                placement={placement}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function PlacementEditor({
  placement,
  environmentSlotConfigured,
  busyKey,
  fieldErrors,
  isPreviewing,
  onUpdate,
  onSave,
  onReset,
  onPreview,
}: {
  placement: AdPlacementRecord;
  environmentSlotConfigured: boolean;
  busyKey: string;
  fieldErrors: Record<string, string>;
  isPreviewing: boolean;
  onUpdate: (patch: Partial<AdPlacementRecord>) => void;
  onSave: () => void;
  onReset: () => void;
  onPreview: () => void;
}) {
  const setProvider = (provider: AdPlacementRecord['provider']) => onUpdate({
    provider,
    enabled: provider === 'google-adsense' ? placement.enabled : false,
  });
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-300">{placement.code}</p>
          <h3 className="mt-1 text-xl font-black">{placement.displayName}</h3>
        </div>
        <StatusBadge enabled={placement.enabled} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{placement.description}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <SummaryValue label="Provider" value={placement.provider} />
        <SummaryValue label="Device" value={placement.deviceTarget} />
        <SummaryValue label="Validation" value={placement.validationStatus} />
        <SummaryValue label="Updated" value={formatDate(placement.updatedAt)} />
      </dl>
      <p className={`mt-3 rounded-xl border px-3 py-2 text-xs ${validationClass(placement.validationStatus)}`}>
        {placement.validationMessage}
      </p>

      <div className="mt-5 grid gap-4">
        <ToggleField
          checked={placement.enabled}
          description="The global master switch must also be enabled."
          label="Enable placement"
          onChange={(checked) => onUpdate({ enabled: checked })}
        />
        <SelectField
          error={fieldErrors.provider}
          label="Provider"
          onChange={(value) => setProvider(value as AdPlacementRecord['provider'])}
          options={AD_PROVIDERS}
          value={placement.provider}
        />

        {placement.provider === 'google-adsense' ? (
          <>
            <ToggleField
              checked={placement.useGlobalClient}
              description="Use the client ID from Global Ad Settings or its environment fallback."
              label="Use global client ID"
              onChange={(checked) => onUpdate({ useGlobalClient: checked })}
            />
            {!placement.useGlobalClient ? (
              <TextField
                error={fieldErrors.adClientOverride}
                label="AdSense client ID override"
                onChange={(value) => onUpdate({ adClientOverride: value })}
                value={placement.adClientOverride}
              />
            ) : null}
            <TextField
              error={fieldErrors.adSlot}
              help={environmentSlotConfigured && !placement.adSlot ? 'A numeric environment-variable fallback is configured.' : 'Digits only'}
              label="AdSense slot ID"
              onChange={(value) => onUpdate({ adSlot: value })}
              value={placement.adSlot}
            />
            <SelectField
              label="Ad format"
              onChange={(value) => onUpdate({ format: value as AdPlacementRecord['format'] })}
              options={AD_FORMATS}
              value={placement.format}
            />
            <ToggleField
              checked={placement.responsive}
              description="Allow AdSense to adapt the unit to its content width."
              label="Responsive unit"
              onChange={(checked) => onUpdate({ responsive: checked })}
            />
          </>
        ) : null}

        {placement.provider === 'custom-html' ? (
          <div className="grid gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
            <p className="text-sm font-bold text-amber-200">Custom ad code can affect site security and performance.</p>
            <p className="text-xs leading-5 text-amber-100/80">Code can be stored for future use, but public rendering remains disabled until an isolated renderer is implemented.</p>
            <label className="grid gap-2 text-sm font-bold">
              <span>Custom HTML</span>
              <textarea
                className={`${inputClass} min-h-32 font-mono text-xs`}
                onChange={(event) => onUpdate({ customHtml: event.target.value })}
                value={placement.customHtml}
              />
            </label>
            <ToggleField
              checked={placement.customHtmlTrusted}
              description="Required before custom code can be stored. This does not enable rendering."
              label="I trust this custom code"
              onChange={(checked) => onUpdate({ customHtmlTrusted: checked })}
            />
            {fieldErrors.customHtmlTrusted ? <FieldError message={fieldErrors.customHtmlTrusted} /> : null}
          </div>
        ) : null}

        <SelectField
          disabled={placement.code === 'article-sidebar'}
          error={fieldErrors.deviceTarget}
          label="Device target"
          onChange={(value) => onUpdate({ deviceTarget: value as AdPlacementRecord['deviceTarget'] })}
          options={AD_DEVICE_TARGETS}
          value={placement.deviceTarget}
        />
        <TextField
          error={fieldErrors.label}
          help="Leave blank to use the global advertisement label."
          label="Advertisement label"
          onChange={(value) => onUpdate({ label: value })}
          value={placement.label}
        />
      </div>

      {isPreviewing ? <PlacementPreview placement={placement} slotConfigured={Boolean(placement.adSlot) || environmentSlotConfigured} /> : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button className={primaryButtonClass} disabled={Boolean(busyKey)} onClick={onSave} type="button">
          {busyKey === placement.code ? 'Saving...' : 'Save'}
        </button>
        <button className={secondaryButtonClass} disabled={Boolean(busyKey)} onClick={onReset} type="button">
          {busyKey === `reset-${placement.code}` ? 'Resetting...' : 'Reset to disabled'}
        </button>
        <button className={secondaryButtonClass} onClick={onPreview} type="button">
          {isPreviewing ? 'Hide preview' : 'Preview placeholder'}
        </button>
        <Link
          className={secondaryButtonClass}
          href={`/api/admin/ads/preview?code=${encodeURIComponent(placement.code)}`}
          rel="noopener"
          target="_blank"
        >
          Preview on Site
        </Link>
      </div>
      {placement.code === 'results' ? <p className="mt-3 text-xs text-slate-500">Run a manual or screenshot check in the preview tab to reach the results placement.</p> : null}
    </article>
  );
}

function PlacementPreview({ placement, slotConfigured }: { placement: AdPlacementRecord; slotConfigured: boolean }) {
  const width = placement.deviceTarget === 'desktop' ? 'Approximately 300px desktop column' : placement.deviceTarget === 'mobile' ? 'Mobile content width' : 'Responsive content width';
  return (
    <aside className="mt-5 rounded-xl border border-dashed border-violet-300/35 bg-slate-950/40 p-4 text-center text-xs leading-5 text-slate-400">
      <p className="font-black text-slate-200">Ad preview: {placement.displayName}</p>
      <p>{width}</p>
      <p>Provider: {placement.provider} / Format: {placement.format}</p>
      <p>Device: {placement.deviceTarget} / Slot: {slotConfigured ? 'configured' : 'missing'}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">No live ad is loaded in this preview</p>
    </aside>
  );
}

function ToggleField({ checked, label, description, onChange }: { checked: boolean; label: string; description: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <input checked={checked} className="mt-1 h-4 w-4 accent-violet-500" onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span><span className="block text-sm font-bold text-slate-100">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span>
    </label>
  );
}

function TextField({ label, value, onChange, help, error }: { label: string; value: string; onChange: (value: string) => void; help?: string; error?: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      <span>{label}</span>
      <input className={inputClass} onChange={(event) => onChange(event.target.value)} type="text" value={value} />
      {error ? <FieldError message={error} /> : help ? <span className="text-xs font-normal text-slate-500">{help}</span> : null}
    </label>
  );
}

function SelectField({ label, value, options, onChange, error, disabled = false }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void; error?: string; disabled?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      <span>{label}</span>
      <select className={inputClass} disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}

function FieldError({ message }: { message: string }) {
  return <span className="text-xs font-normal text-red-300">{message}</span>;
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${enabled ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-200' : 'border-slate-500/30 bg-slate-900/60 text-slate-400'}`}>{enabled ? 'Enabled' : 'Disabled'}</span>;
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-black/20 p-2"><dt className="text-slate-600">{label}</dt><dd className="mt-1 truncate font-bold text-slate-300">{value}</dd></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value));
}

function validationClass(status: AdPlacementRecord['validationStatus']) {
  if (status === 'valid') return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200';
  if (status === 'invalid' || status === 'unavailable') return 'border-amber-400/25 bg-amber-500/10 text-amber-200';
  return 'border-white/10 bg-black/20 text-slate-500';
}

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm font-normal text-white outline-none focus:border-violet-400/60 disabled:cursor-not-allowed disabled:opacity-60';
const primaryButtonClass = 'mt-5 inline-flex rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButtonClass = 'mt-5 inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50';
