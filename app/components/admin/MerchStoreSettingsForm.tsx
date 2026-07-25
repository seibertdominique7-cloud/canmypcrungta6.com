'use client';

import { useState } from 'react';

import type { MerchStoreSettings } from '../../lib/merch-types';

interface SettingsResponse {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  settings?: MerchStoreSettings;
}

export function MerchStoreSettingsForm({
  initialSettings,
}: {
  initialSettings: MerchStoreSettings;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const set = <Key extends keyof MerchStoreSettings>(
    key: Key,
    value: MerchStoreSettings[Key],
  ) => setSettings((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setBusy(true);
    setMessage('');
    setError('');
    setFieldErrors({});
    try {
      const response = await fetch('/api/admin/merchandise/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const payload = (await response.json()) as SettingsResponse;
      if (!response.ok) {
        setFieldErrors(payload.fieldErrors ?? {});
        throw new Error(payload.error || 'Store settings could not be saved.');
      }
      if (payload.settings) setSettings(payload.settings);
      setMessage(payload.message || 'Store settings saved.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Store settings could not be saved.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">
            Merch Store / Fourthwall
          </p>
          <h2 className="mt-1 text-2xl font-black">Storefront settings</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            The public integration stays hidden until the store is enabled and a valid
            HTTPS Fourthwall URL is saved.
          </p>
        </div>
        <Status enabled={settings.storeEnabled} />
      </div>

      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="mt-6 grid gap-5">
        <div className={panelClass}>
          <h3 className="font-black">Store availability</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field error={fieldErrors.storeUrl} label="Fourthwall store URL">
              <input
                className={inputClass}
                onChange={(event) => set('storeUrl', event.target.value)}
                placeholder="https://your-store.fourthwall.com"
                value={settings.storeUrl}
              />
            </Field>
            <Field error={fieldErrors.storeSubdomain} label="Planned store subdomain">
              <input
                className={inputClass}
                onChange={(event) => set('storeSubdomain', event.target.value)}
                placeholder="shop.canmypcrungta6.com"
                value={settings.storeSubdomain}
              />
            </Field>
            <Field error={fieldErrors.storeOpenGraphImage} label="Store social preview image">
              <input
                className={inputClass}
                onChange={(event) => set('storeOpenGraphImage', event.target.value)}
                placeholder="/uploads/store-preview.jpg or https://..."
                value={settings.storeOpenGraphImage}
              />
            </Field>
            <Field error={fieldErrors.navigationLabel} label="Navigation label">
              <input
                className={inputClass}
                onChange={(event) => set('navigationLabel', event.target.value)}
                value={settings.navigationLabel}
              />
            </Field>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Checkbox
              checked={settings.storeEnabled}
              label="Enable public store integration"
              onChange={(value) => set('storeEnabled', value)}
            />
            <Checkbox
              checked={settings.openLinksInNewTab}
              label="Open store links in a new tab"
              onChange={(value) => set('openLinksInNewTab', value)}
            />
          </div>
        </div>

        <div className={panelClass}>
          <h3 className="font-black">Homepage section</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field error={fieldErrors.homepageTitle} label="Section title">
              <input
                className={inputClass}
                onChange={(event) => set('homepageTitle', event.target.value)}
                value={settings.homepageTitle}
              />
            </Field>
            <Field error={fieldErrors.homepageCtaLabel} label="CTA label">
              <input
                className={inputClass}
                onChange={(event) => set('homepageCtaLabel', event.target.value)}
                value={settings.homepageCtaLabel}
              />
            </Field>
            <Field error={fieldErrors.homepageDescription} label="Description">
              <textarea
                className={`${inputClass} min-h-24`}
                onChange={(event) => set('homepageDescription', event.target.value)}
                value={settings.homepageDescription}
              />
            </Field>
            <Field error={fieldErrors.homepageCtaUrl} label="CTA URL (optional)">
              <input
                className={inputClass}
                onChange={(event) => set('homepageCtaUrl', event.target.value)}
                placeholder="Uses the store URL when blank"
                value={settings.homepageCtaUrl}
              />
            </Field>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Checkbox
              checked={settings.homepageSectionEnabled}
              label="Show merchandise on the homepage"
              onChange={(value) => set('homepageSectionEnabled', value)}
            />
            <Checkbox
              checked={settings.showInArticles}
              label="Allow merchandise blocks in articles"
              onChange={(value) => set('showInArticles', value)}
            />
          </div>
        </div>

        <div className={panelClass}>
          <h3 className="font-black">Announcement and disclosure</h3>
          <div className="mt-4 grid gap-4">
            <Field error={fieldErrors.announcementText} label="Announcement text">
              <input
                className={inputClass}
                onChange={(event) => set('announcementText', event.target.value)}
                placeholder="GTA VI launch gear is now available."
                value={settings.announcementText}
              />
            </Field>
            <Checkbox
              checked={settings.announcementEnabled}
              label="Show dismissible store announcement"
              onChange={(value) => set('announcementEnabled', value)}
            />
            <Field label="Fulfillment disclaimer">
              <textarea
                className={`${inputClass} min-h-24`}
                onChange={(event) => set('disclaimerText', event.target.value)}
                value={settings.disclaimerText}
              />
            </Field>
          </div>
        </div>
      </div>

      <button
        className={`${primaryButton} mt-5`}
        disabled={busy}
        onClick={() => void save()}
        type="button"
      >
        {busy ? 'Saving…' : 'Save merch settings'}
      </button>
    </section>
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
    <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm font-bold text-slate-300">
      <input
        checked={checked}
        className="mt-0.5 size-4 accent-violet-500"
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
      className={`rounded-full border px-3 py-1 text-xs font-black ${
        enabled
          ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
          : 'border-slate-500/30 bg-slate-900 text-slate-400'
      }`}
    >
      Store {enabled ? 'enabled' : 'disabled'}
    </span>
  );
}

const panelClass = 'rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5';
const inputClass =
  'w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/60';
const primaryButton =
  'rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50';
