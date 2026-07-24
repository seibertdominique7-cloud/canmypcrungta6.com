'use client';

import { type FormEvent, type ReactNode, useState } from 'react';

import { AffiliateRecommendations } from './AffiliateRecommendations';
import { CreatorRecommendations } from './CreatorRecommendations';
import { EmailSignup } from './EmailSignup';
import {
  getRequirementDisclaimer,
  getRequirementLabel,
  getRequirementLastUpdated,
} from '../data/gta6-requirements';
import type { ComponentStatus, CompatibilityResult } from '../lib/compatibility';
import { determineRecommendationScenario } from '../lib/recommendation-scenario';
import type { EmailSignupSource } from '../lib/subscriber-types';

interface CompatibilityResultsProps {
  result: CompatibilityResult;
  storageValue: string;
  storageType: string;
  onStorageSave: (capacity: string, storageType: string) => boolean;
  title: string;
  allowStorageQuickEdit?: boolean;
  sectionId?: string;
  actions?: ReactNode;
  advancedDetails?: ReactNode;
  signupSource: Exclude<EmailSignupSource, 'homepage' | 'article'>;
}

export function CompatibilityResults({
  result,
  storageValue,
  storageType,
  onStorageSave,
  title,
  allowStorageQuickEdit = true,
  sectionId = 'analysis-results',
  actions,
  advancedDetails,
  signupSource,
}: CompatibilityResultsProps) {
  const [isStorageEditorOpen, setIsStorageEditorOpen] = useState(false);
  const [storageCapacityDraft, setStorageCapacityDraft] = useState(storageValue);
  const [storageTypeDraft, setStorageTypeDraft] = useState(storageType);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [recommendedProductIds, setRecommendedProductIds] = useState<string[]>([]);

  const openStorageEditor = () => {
    setStorageCapacityDraft(storageValue);
    setStorageTypeDraft(storageType);
    setStorageError(null);
    setIsStorageEditorOpen(true);
  };

  const saveStorage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!onStorageSave(storageCapacityDraft, storageTypeDraft)) {
      setStorageError('Enter a storage size such as 512 GB or 1 TB and select a storage type.');
      return;
    }

    setStorageError(null);
    setIsStorageEditorOpen(false);
  };

  const overallStyle = {
    recommended: {
      border: 'border-emerald-400/30',
      background: 'from-emerald-500/20 via-emerald-500/8 to-transparent',
      icon: 'bg-emerald-400 text-emerald-950',
      title: 'text-emerald-300',
      symbol: '\u2713',
    },
    minimum: {
      border: 'border-amber-400/30',
      background: 'from-amber-500/20 via-amber-500/8 to-transparent',
      icon: 'bg-amber-400 text-amber-950',
      title: 'text-amber-200',
      symbol: '\u2713',
    },
    fail: {
      border: 'border-rose-400/30',
      background: 'from-rose-500/20 via-rose-500/8 to-transparent',
      icon: 'bg-rose-400 text-rose-950',
      title: 'text-rose-300',
      symbol: '\u00d7',
    },
    unknown: {
      border: 'border-slate-500/40',
      background: 'from-slate-500/15 via-slate-500/5 to-transparent',
      icon: 'bg-slate-400 text-slate-950',
      title: 'text-slate-200',
      symbol: '?',
    },
  }[result.overall.status];
  return (
    <section id={sectionId} className="theme-glass-strong scroll-mt-4 overflow-hidden rounded-2xl text-left">
      <div className={`border-b bg-gradient-to-br px-5 py-6 sm:px-7 ${overallStyle.border} ${overallStyle.background}`}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{title}</p>
        <div className="mt-3 flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl font-black ${overallStyle.icon}`}
            aria-hidden="true"
          >
            {overallStyle.symbol}
          </span>
          <h2 className={`text-2xl font-black tracking-tight sm:text-3xl ${overallStyle.title}`}>
            {result.overall.title}
          </h2>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-base">
          {result.overall.description}
        </p>
      </div>

      <div className="divide-y divide-slate-700/60 px-4 sm:px-6">
        {result.components.map((component) => (
          <div
            key={component.key}
            className="grid grid-cols-[4.25rem_minmax(0,1fr)_auto] items-center gap-3 py-3.5"
          >
            <div className="text-sm font-bold text-white">{component.label}</div>
            <div className="min-w-0">
              <div className="truncate text-sm text-slate-300" title={component.detected}>
                {component.detected || 'Not detected'}
              </div>
              {component.key === 'storage' &&
              component.status === 'unknown' &&
              allowStorageQuickEdit ? (
                <button
                  type="button"
                  className="theme-link mt-1 text-left text-xs font-semibold leading-relaxed underline decoration-fuchsia-300/50 underline-offset-2"
                  aria-expanded={isStorageEditorOpen}
                  onClick={openStorageEditor}
                >
                  Press here to enter storage size and type
                </button>
              ) : null}
            </div>
            <StatusBadge status={component.status} label={component.statusLabel} />

            {component.key === 'storage' &&
            component.status === 'unknown' &&
            isStorageEditorOpen &&
            allowStorageQuickEdit ? (
              <form
                className="col-span-3 mt-1 grid gap-3 rounded-lg border border-slate-700/70 bg-slate-950/35 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
                onSubmit={saveStorage}
              >
                <label className="grid gap-1.5 text-xs font-bold text-slate-300">
                  Storage size
                  <input
                    type="text"
                    inputMode="decimal"
                    value={storageCapacityDraft}
                    placeholder="512 GB or 1 TB"
                    className="theme-input w-full rounded-md px-3 py-2 text-sm font-normal"
                    onChange={(event) => setStorageCapacityDraft(event.target.value)}
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-bold text-slate-300">
                  Storage type
                  <select
                    value={storageTypeDraft}
                    className="theme-input w-full rounded-md px-3 py-2 text-sm font-normal"
                    onChange={(event) => setStorageTypeDraft(event.target.value)}
                  >
                    <option value="">Select storage type</option>
                    {['NVMe SSD', 'SSD', 'HDD'].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="submit"
                  className="theme-primary-button rounded-md px-4 py-2 text-sm font-bold"
                >
                  Save
                </button>

                {storageError ? (
                  <p className="text-xs leading-relaxed text-rose-300 sm:col-span-3" role="alert">
                    {storageError}
                  </p>
                ) : null}
              </form>
            ) : null}
          </div>
        ))}
      </div>

      <AffiliateRecommendations
        onProductsLoaded={setRecommendedProductIds}
        result={result}
      />

      <CreatorRecommendations
        excludeProductIds={recommendedProductIds}
        result={result}
      />

      <EmailSignup
        scenario={determineRecommendationScenario(result)}
        signupSource={signupSource}
        variant="result"
      />

      {actions ? <div className="border-t border-slate-700/50 p-4 sm:px-6">{actions}</div> : null}

      {advancedDetails}

      <div className="border-t border-slate-700/50 px-4 py-3 sm:px-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          {getRequirementLabel()}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {getRequirementDisclaimer()}
        </p>
        <p className="mt-1 text-[11px] text-slate-600">
          Last updated: {getRequirementLastUpdated()}
        </p>
      </div>
    </section>
  );
}

interface StatusBadgeProps {
  status: ComponentStatus;
  label: string;
}

function StatusBadge({ status, label }: StatusBadgeProps) {
  const badgeClass = {
    recommended: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
    minimum: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
    below: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
    unknown: 'border-slate-500/50 bg-slate-900/60 text-slate-300',
  }[status];

  return (
    <span
      className={`inline-flex w-fit whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold sm:px-3 sm:text-xs ${badgeClass}`}
    >
      {label}
    </span>
  );
}
