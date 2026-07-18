'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { CompatibilityResults } from './CompatibilityResults';
import { SpecForm, type ManualFormFieldKey } from './SpecForm';
import { evaluateCompatibility } from '../lib/compatibility';
import {
  createManualDetectedSpecs,
  normalizeManualEntry,
} from '../lib/manual-entry';
import { createEmptyDetectedSpecs, createEmptyEditableSpecs, type EditableHardwareSpecs } from '../lib/hardware-types';

const MANUAL_RESULTS_TITLE = 'Can my PC run GTA VI?';

export function ManualEntryWorkflow() {
  const [specs, setSpecs] = useState<EditableHardwareSpecs>(() => createEmptyEditableSpecs());
  const [hasChecked, setHasChecked] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const detectedSpecs = useMemo(
    () => (hasChecked ? createManualDetectedSpecs(specs) : createEmptyDetectedSpecs()),
    [hasChecked, specs],
  );

  const compatibilityResult = useMemo(
    () => evaluateCompatibility(specs, detectedSpecs),
    [detectedSpecs, specs],
  );

  useEffect(() => {
    if (!hasChecked) {
      return;
    }

    resultsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [hasChecked]);

  const updateSpec = (key: ManualFormFieldKey, value: string) => {
    setErrorMessage(null);
    setSpecs((currentSpecs) => ({
      ...currentSpecs,
      [key]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = normalizeManualEntry({
      cpu: specs.cpu,
      gpu: specs.gpu,
      ram: specs.ram,
      storageCapacity: specs.storage,
      storageType: specs.storageType,
      windowsVersion: specs.windowsVersion,
    });

    if (normalized.errors.length > 0) {
      setErrorMessage(normalized.errors[0]);
      return;
    }

    setSpecs(normalized.specs);
    setErrorMessage(null);
    setHasChecked(true);
    setIsEditing(false);
  };

  const handleEditSpecs = () => {
    setIsEditing(true);
    formRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleReset = () => {
    setSpecs(createEmptyEditableSpecs());
    setHasChecked(false);
    setIsEditing(true);
    setErrorMessage(null);
    formRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <section className="w-full max-w-4xl px-4 sm:px-0">
      <div ref={resultsRef} className="space-y-5">
        {isEditing ? (
          <SpecForm
            specs={specs}
            errorMessage={errorMessage}
            formRef={formRef}
            submitLabel="Check My PC"
            onChange={updateSpec}
            onSubmit={handleSubmit}
          />
        ) : (
          <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 shadow-2xl shadow-blue-500/10 backdrop-blur-md sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Checked specs
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-white">
                  Review or edit your specs
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                  Edit Specs reopens the form. The result updates immediately when you change a field.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="rounded-lg border border-slate-500 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-slate-300 hover:bg-slate-700/40"
                  onClick={handleEditSpecs}
                >
                  Edit Specs
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
                  onClick={handleReset}
                >
                  Check Another PC
                </button>
              </div>
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['CPU', specs.cpu],
                ['GPU', specs.gpu],
                ['RAM', specs.ram],
                ['Storage', formatStorageSummary(specs.storage, specs.storageType)],
                ['Windows', specs.windowsVersion],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-700/60 bg-slate-950/30 px-4 py-3"
                >
                  <dt className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-100">
                    {value || 'Unknown'}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Storage can stay unknown. If you know it later, enter both the capacity and the drive
              type.
            </p>
          </section>
        )}

        {hasChecked ? (
          <CompatibilityResults
            result={compatibilityResult}
            storageValue={specs.storage}
            storageType={specs.storageType}
            onStorageSave={(capacity, storageType) => {
              setSpecs((currentSpecs) => ({
                ...currentSpecs,
                storage: capacity,
                storageType,
              }));
              return true;
            }}
            title={MANUAL_RESULTS_TITLE}
            allowStorageQuickEdit={false}
            sectionId="manual-results"
          />
        ) : null}
      </div>
    </section>
  );
}

function formatStorageSummary(storage: string, storageType: string) {
  const parts = [storage.trim(), storageType.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Unknown';
}
