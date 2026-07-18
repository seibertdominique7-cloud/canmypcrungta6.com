'use client';

import { type FormEvent, type RefObject, useId } from 'react';

import {
  MANUAL_CPU_SUGGESTIONS,
  MANUAL_GPU_SUGGESTIONS,
  MANUAL_RAM_SUGGESTIONS,
  MANUAL_STORAGE_CAPACITY_SUGGESTIONS,
  MANUAL_WINDOWS_OPTIONS,
} from '../lib/manual-entry';
import type { EditableHardwareSpecs } from '../lib/hardware-types';
import { MANUAL_STORAGE_TYPES } from '../lib/manual-storage';

export type ManualFormFieldKey =
  | 'cpu'
  | 'gpu'
  | 'ram'
  | 'storage'
  | 'storageType'
  | 'windowsVersion';

interface SpecFormProps {
  specs: EditableHardwareSpecs;
  errorMessage: string | null;
  onChange: (key: ManualFormFieldKey, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  formRef?: RefObject<HTMLFormElement | null>;
  submitLabel?: string;
}

export function SpecForm({
  specs,
  errorMessage,
  onChange,
  onSubmit,
  formRef,
  submitLabel = 'Check My PC',
}: SpecFormProps) {
  const cpuListId = useId();
  const gpuListId = useId();
  const ramListId = useId();
  const storageListId = useId();

  return (
    <form
      ref={formRef}
      noValidate
      className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 shadow-2xl shadow-blue-500/10 backdrop-blur-md sm:p-6"
      onSubmit={onSubmit}
    >
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white">Enter your PC specs</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">
          Start typing to search common CPUs and GPUs. Storage is optional, but if you know it,
          enter both the capacity and the drive type.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="CPU"
          helperText="Example: AMD Ryzen 7 8845HS"
          value={specs.cpu}
          placeholder="Intel Core i7-12700K"
          listId={cpuListId}
          suggestions={MANUAL_CPU_SUGGESTIONS}
          onChange={(value) => onChange('cpu', value)}
        />

        <Field
          label="GPU"
          helperText="Example: AMD Radeon 780M Graphics"
          value={specs.gpu}
          placeholder="NVIDIA RTX 3070"
          listId={gpuListId}
          suggestions={MANUAL_GPU_SUGGESTIONS}
          onChange={(value) => onChange('gpu', value)}
        />

        <Field
          label="RAM"
          helperText="Example: 32 GB"
          value={specs.ram}
          placeholder="16 GB"
          listId={ramListId}
          suggestions={MANUAL_RAM_SUGGESTIONS}
          inputMode="decimal"
          onChange={(value) => onChange('ram', value)}
        />

        <div className="grid gap-4 sm:grid-cols-2 sm:col-span-2">
          <Field
            label="Storage capacity"
            helperText="Example: 512 GB or 1 TB"
            value={specs.storage}
            placeholder="512 GB or 1 TB"
            listId={storageListId}
            suggestions={MANUAL_STORAGE_CAPACITY_SUGGESTIONS}
            inputMode="decimal"
            onChange={(value) => onChange('storage', value)}
          />

          <SelectField
            label="Storage type"
            helperText="Leave both storage fields blank if you do not know them."
            value={specs.storageType}
            placeholder="Select storage type"
            options={MANUAL_STORAGE_TYPES}
            onChange={(value) => onChange('storageType', value)}
          />
        </div>

        <SelectField
          label="Windows version"
          helperText="Example: Windows 11"
          value={specs.windowsVersion}
          placeholder="Select Windows version"
          options={MANUAL_WINDOWS_OPTIONS}
          onChange={(value) => onChange('windowsVersion', value)}
        />
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 sm:w-auto"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  helperText: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  listId?: string;
  suggestions?: string[];
  inputMode?: 'text' | 'decimal';
}

function Field({
  label,
  helperText,
  value,
  placeholder,
  onChange,
  listId,
  suggestions,
  inputMode = 'text',
}: FieldProps) {
  return (
    <label className="grid gap-1.5 text-left">
      <span className="text-sm font-bold text-slate-200">{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        list={listId}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-slate-700/70 bg-slate-950/50 px-3 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="text-xs leading-relaxed text-slate-500">{helperText}</span>
      {suggestions && listId ? (
        <datalist id={listId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      ) : null}
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  helperText: string;
  value: string;
  placeholder: string;
  options: readonly string[];
  onChange: (value: string) => void;
}

function SelectField({ label, helperText, value, placeholder, options, onChange }: SelectFieldProps) {
  return (
    <label className="grid gap-1.5 text-left">
      <span className="text-sm font-bold text-slate-200">{label}</span>
      <select
        value={value}
        className="w-full rounded-lg border border-slate-700/70 bg-slate-950/50 px-3 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="text-xs leading-relaxed text-slate-500">{helperText}</span>
    </label>
  );
}
