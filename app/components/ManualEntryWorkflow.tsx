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
        ) : null}

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
            actions={
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-slate-500 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-slate-300 hover:bg-slate-700/40"
                  onClick={handleEditSpecs}
                >
                  Edit Specs
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
                  onClick={handleReset}
                >
                  Check Another PC
                </button>
              </div>
            }
          />
        ) : null}
      </div>
    </section>
  );
}
