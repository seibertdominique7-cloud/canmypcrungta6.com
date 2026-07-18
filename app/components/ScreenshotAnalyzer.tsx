'use client';

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

import { CompatibilityResults } from './CompatibilityResults';
import {
  evaluateCompatibility,
  hasEditableSpecs,
  type CompatibilityResult,
} from '../lib/compatibility';
import {
  HARDWARE_FIELDS,
  createEmptyDetectedSpecs,
  createEmptyEditableSpecs,
  detectedToEditableSpecs,
  type DetectedHardwareSpecs,
  type EditableHardwareSpecs,
  type HardwareFieldKey,
} from '../lib/hardware-types';
import { parseHardwareSpecs } from '../lib/hardware-parser';
import {
  isManualStorageType,
  MANUAL_STORAGE_TYPES,
  parseManualStorageCapacity,
} from '../lib/manual-storage';

const MAX_SCREENSHOT_SIZE_BYTES = 10 * 1024 * 1024;
const SCREENSHOT_UPLOAD_INPUT_ID = 'screenshot-upload-input';
const SCREENSHOT_UPLOAD_LABEL_ID = 'screenshot-upload-label';
const SCREENSHOT_UPLOAD_ERROR_ID = 'screenshot-upload-error';
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
const ACCEPTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'] as const;
const SCREENSHOT_ACCEPT_ATTRIBUTE = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_IMAGE_EXTENSIONS,
].join(',');

const SCREENSHOT_UPLOAD_COPY = {
  uploadButton: '\u{1F4F8} Upload Screenshot',
  inputLabel: 'Upload a screenshot of your system specs',
  manualEntryButton: '\u2699\uFE0F Enter Specs Manually',
  manualEntryLabel: 'Enter your PC specs manually',
  scannerButton: '\u2B07\uFE0F Automatic PC scanner coming soon.',
  scannerLabel: 'Download PC scanner tool in beta',
  previewAlt: 'Screenshot preview for system specs upload',
  fileTypeError: 'Please upload a PNG, JPG, JPEG, or WEBP image.',
  fileSizeError: 'Please choose an image smaller than 10 MB.',
  removeButton: 'Remove Image',
  resetButton: 'Reset',
  analyzeButton: 'Analyze Screenshot',
  reanalyzeButton: 'Reanalyze',
  analyzingButton: 'Analyzing screenshot',
  detectedSpecsTitle: 'Editable detected specs',
  resultsTitle: 'Can my PC run GTA VI?',
  advancedTitle: 'Advanced Details',
  parserDiagnosticsTitle: 'Parser diagnostics',
  missingInfoTitle: 'Missing or Uncertain Information',
  detectedTextTitle: 'Raw OCR Output',
  noDetectedText: 'No text was detected in this screenshot.',
  ocrProgressLabel: 'OCR progress',
  tooLittleText:
    'We could not detect enough useful hardware text. Upload a clearer screenshot or use manual entry.',
  ocrError:
    'We could not read text from this screenshot. Please try a clearer image or check your connection.',
} as const;

export function ScreenshotAnalyzer() {
  const {
    inputRef,
    selectedFile,
    previewUrl,
    errorMessage,
    analysisMessage,
    isAnalyzing,
    ocrProgress,
    detectedText,
    detectedSpecs,
    editableSpecs,
    compatibilityResult,
    showAnalysis,
    hasAnalyzed,
    openFilePicker,
    startManualEntry,
    handleFileChange,
    removeImage,
    resetAll,
    analyzeScreenshot,
    updateEditableSpec,
    saveManualStorage,
  } = useScreenshotAnalysis();

  useEffect(() => {
    if (!hasAnalyzed) {
      return;
    }

    document.getElementById('analysis-results')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [hasAnalyzed]);

  return (
    <>
      <section className="mb-16 w-full max-w-3xl px-4 sm:px-0 lg:mb-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-3">
        <input
          ref={inputRef}
          id={SCREENSHOT_UPLOAD_INPUT_ID}
          type="file"
          accept={SCREENSHOT_ACCEPT_ATTRIBUTE}
          className="sr-only"
          tabIndex={-1}
          disabled={isAnalyzing}
          aria-labelledby={SCREENSHOT_UPLOAD_LABEL_ID}
          aria-describedby={errorMessage ? SCREENSHOT_UPLOAD_ERROR_ID : undefined}
          onChange={handleFileChange}
        />
        <label id={SCREENSHOT_UPLOAD_LABEL_ID} htmlFor={SCREENSHOT_UPLOAD_INPUT_ID} className="sr-only">
          {SCREENSHOT_UPLOAD_COPY.inputLabel}
        </label>
        <button
          type="button"
          className="flex-1 py-4 px-8 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-600 disabled:text-slate-300 disabled:hover:bg-slate-600 text-slate-900 font-bold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 hover:shadow-lg hover:shadow-emerald-500/50 disabled:hover:shadow-none disabled:cursor-not-allowed text-center text-lg"
          aria-label={SCREENSHOT_UPLOAD_COPY.inputLabel}
          disabled={isAnalyzing}
          onClick={openFilePicker}
        >
          {SCREENSHOT_UPLOAD_COPY.uploadButton}
        </button>

        <button
          type="button"
          className="flex-1 py-4 px-8 border-2 border-slate-400 hover:border-slate-200 disabled:border-slate-600 text-slate-200 hover:text-white disabled:text-slate-500 font-bold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 hover:bg-slate-800/50 text-center text-lg"
          aria-label={SCREENSHOT_UPLOAD_COPY.manualEntryLabel}
          disabled={isAnalyzing}
          onClick={startManualEntry}
        >
          {SCREENSHOT_UPLOAD_COPY.manualEntryButton}
        </button>

        <a
          href="#download-scanner"
          className="flex-1 py-4 px-8 text-slate-300 hover:text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 border border-transparent hover:border-blue-400/50 text-center text-lg hover:bg-slate-800/30"
          aria-label={SCREENSHOT_UPLOAD_COPY.scannerLabel}
        >
          {SCREENSHOT_UPLOAD_COPY.scannerButton}
        </a>
        </div>

        <ScreenshotGuide />
      </section>

      <ScreenshotUploadPanel
        previewUrl={previewUrl}
        fileName={selectedFile?.name ?? null}
        errorMessage={errorMessage}
        analysisMessage={analysisMessage}
        isAnalyzing={isAnalyzing}
        ocrProgress={ocrProgress}
        detectedText={detectedText}
        detectedSpecs={detectedSpecs}
        editableSpecs={editableSpecs}
        compatibilityResult={compatibilityResult}
        showAnalysis={showAnalysis}
        onRemove={removeImage}
        onReset={resetAll}
        onAnalyze={analyzeScreenshot}
        onSpecChange={updateEditableSpec}
        onStorageSave={saveManualStorage}
      />
    </>
  );
}

function ScreenshotGuide() {
  return (
    <details className="group/guide mt-4 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/45 text-left">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800/50 hover:text-white sm:px-5 [&::-webkit-details-marker]:hidden">
        <span>How to get your PC specs</span>
        <span
          className="text-base text-slate-500 transition-transform group-open/guide:rotate-180"
          aria-hidden="true"
        >
          &#8964;
        </span>
      </summary>

      <div className="border-t border-slate-700/60 px-4 py-4 text-sm text-slate-300 sm:px-5">
        <h3 className="font-bold text-white">Recommended screenshot</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-slate-400 sm:text-sm">
          <li>Press Windows + R</li>
          <li>Type msinfo32</li>
          <li>Press Enter</li>
          <li>Maximize the window</li>
          <li>Press Windows + Shift + S</li>
          <li>Drag over the System Information window</li>
          <li>Upload the screenshot</li>
        </ol>

        <p className="mt-3 rounded-lg border border-slate-700/60 bg-slate-950/35 px-3 py-2 text-xs leading-relaxed text-slate-400">
          This usually finds your CPU, RAM, Windows version, manufacturer, and model. GPU and
          storage may require the steps below.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <section>
            <h3 className="font-bold text-white">GPU</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-slate-400 sm:text-sm">
              <li>Press Ctrl + Shift + Esc</li>
              <li>Open Performance</li>
              <li>Click GPU</li>
              <li>Take a screenshot</li>
            </ol>
          </section>

          <section>
            <h3 className="font-bold text-white">Storage</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-slate-400 sm:text-sm">
              <li>In Task Manager &gt; Performance</li>
              <li>Click Disk</li>
              <li>Note the capacity and whether it says SSD or HDD</li>
            </ol>
          </section>
        </div>
      </div>
    </details>
  );
}

function useScreenshotAnalysis() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const ocrWorkerRef = useRef<OcrWorker | null>(null);
  const ocrRunIdRef = useRef(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [detectedText, setDetectedText] = useState<string | null>(null);
  const [detectedSpecs, setDetectedSpecs] = useState<DetectedHardwareSpecs>(() =>
    createEmptyDetectedSpecs(),
  );
  const [editableSpecs, setEditableSpecs] = useState<EditableHardwareSpecs>(() =>
    createEmptyEditableSpecs(),
  );
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const terminateOcrWorker = useCallback(async () => {
    const worker = ocrWorkerRef.current;
    ocrWorkerRef.current = null;
    await worker?.terminate().catch(() => undefined);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current !== null) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      void terminateOcrWorker();
    };
  }, [terminateOcrWorker]);

  const compatibilityResult = useMemo(
    () => evaluateCompatibility(editableSpecs, detectedSpecs),
    [detectedSpecs, editableSpecs],
  );
  const showAnalysis = hasAnalyzed || hasEditableSpecs(editableSpecs);

  const clearPreviewUrl = () => {
    if (previewUrlRef.current !== null) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setPreviewUrl(null);
  };

  const resetFileInput = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const clearDetectedData = () => {
    setDetectedText(null);
    setDetectedSpecs(createEmptyDetectedSpecs());
    setEditableSpecs(createEmptyEditableSpecs());
    setHasAnalyzed(false);
    setAnalysisMessage(null);
  };

  const clearAnalysisState = (cancelActiveWorker: boolean, clearDetected: boolean) => {
    if (cancelActiveWorker) {
      ocrRunIdRef.current += 1;
      void terminateOcrWorker();
    }

    setIsAnalyzing(false);
    setOcrProgress(null);

    if (clearDetected) {
      clearDetectedData();
    }
  };

  const openFilePicker = () => {
    if (!isAnalyzing) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    clearAnalysisState(true, true);

    if (!file) {
      return;
    }

    if (!isAcceptedScreenshotFile(file)) {
      setSelectedFile(null);
      clearPreviewUrl();
      setErrorMessage(SCREENSHOT_UPLOAD_COPY.fileTypeError);
      resetFileInput();
      return;
    }

    if (file.size > MAX_SCREENSHOT_SIZE_BYTES) {
      setSelectedFile(null);
      clearPreviewUrl();
      setErrorMessage(SCREENSHOT_UPLOAD_COPY.fileSizeError);
      resetFileInput();
      return;
    }

    clearPreviewUrl();
    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setErrorMessage(null);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
  };

  const resetAll = () => {
    clearAnalysisState(true, true);
    setSelectedFile(null);
    clearPreviewUrl();
    setErrorMessage(null);
    resetFileInput();
  };

  const removeImage = () => {
    resetAll();
  };

  const startManualEntry = () => {
    router.push('/manual');
  };

  const analyzeScreenshot = async () => {
    if (!selectedFile || isAnalyzing) {
      return;
    }

    const runId = ocrRunIdRef.current + 1;
    ocrRunIdRef.current = runId;
    setErrorMessage(null);
    setAnalysisMessage(null);
    setOcrProgress(0);
    setIsAnalyzing(true);

    let worker: OcrWorker | null = null;
    const isCurrentRun = () => ocrRunIdRef.current === runId;

    try {
      const Tesseract = await import('tesseract.js');
      worker = await Tesseract.createWorker('eng', Tesseract.OEM.LSTM_ONLY, {
        logger: (message) => {
          if (isCurrentRun()) {
            setOcrProgress(normalizeOcrProgress(message.progress));
          }
        },
      });
      ocrWorkerRef.current = worker;

      const {
        data: { text },
      } = await worker.recognize(selectedFile);
      const parsedHardware = parseHardwareSpecs(text);
      const parsedEditableSpecs = detectedToEditableSpecs(parsedHardware.specs);

      if (isCurrentRun()) {
        setOcrProgress(100);
        setDetectedText(parsedHardware.rawOcrText);
        setDetectedSpecs(parsedHardware.specs);
        setEditableSpecs(parsedEditableSpecs);
        setHasAnalyzed(true);

        if (!parsedHardware.hasUsefulText) {
          setAnalysisMessage(SCREENSHOT_UPLOAD_COPY.tooLittleText);
        }
      }
    } catch {
      if (isCurrentRun()) {
        setErrorMessage(SCREENSHOT_UPLOAD_COPY.ocrError);
      }
    } finally {
      await worker?.terminate().catch(() => undefined);

      if (ocrWorkerRef.current === worker) {
        ocrWorkerRef.current = null;
      }

      if (isCurrentRun()) {
        setIsAnalyzing(false);
      }
    }
  };

  const updateEditableSpec = (key: HardwareFieldKey, value: string) => {
    setEditableSpecs((currentSpecs) => ({
      ...currentSpecs,
      [key]: value,
    }));
  };

  const saveManualStorage = (capacityInput: string, storageTypeInput: string) => {
    const capacity = parseManualStorageCapacity(capacityInput);

    if (!capacity || !isManualStorageType(storageTypeInput)) {
      return false;
    }

    setEditableSpecs((currentSpecs) => ({
      ...currentSpecs,
      storage: capacity.displayValue,
      storageType: storageTypeInput,
    }));
    setDetectedSpecs((currentSpecs) => ({
      ...currentSpecs,
      storage: {
        displayValue: capacity.displayValue,
        numericGb: capacity.numericGb,
        confidence: 'high',
      },
      storageType: {
        displayValue: storageTypeInput,
        numericGb: null,
        confidence: 'high',
      },
    }));

    return true;
  };

  return {
    inputRef,
    selectedFile,
    previewUrl,
    errorMessage,
    analysisMessage,
    isAnalyzing,
    ocrProgress,
    detectedText,
    detectedSpecs,
    editableSpecs,
    compatibilityResult,
    showAnalysis,
    hasAnalyzed,
    openFilePicker,
    startManualEntry,
    handleFileChange,
    removeImage,
    resetAll,
    analyzeScreenshot,
    updateEditableSpec,
    saveManualStorage,
  };
}

type OcrWorker = {
  recognize: (image: File) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<unknown>;
};

function normalizeOcrProgress(progress: number) {
  return Math.round(Math.min(1, Math.max(0, progress)) * 100);
}

function isAcceptedScreenshotFile(file: File) {
  const fileName = file.name.toLowerCase();
  const hasAcceptedType = ACCEPTED_IMAGE_TYPES.some((type) => type === file.type);
  const hasAcceptedExtension = ACCEPTED_IMAGE_EXTENSIONS.some((extension) =>
    fileName.endsWith(extension),
  );

  return hasAcceptedType || hasAcceptedExtension;
}

interface ScreenshotUploadPanelProps {
  previewUrl: string | null;
  fileName: string | null;
  errorMessage: string | null;
  analysisMessage: string | null;
  isAnalyzing: boolean;
  ocrProgress: number | null;
  detectedText: string | null;
  detectedSpecs: DetectedHardwareSpecs;
  editableSpecs: EditableHardwareSpecs;
  compatibilityResult: CompatibilityResult;
  showAnalysis: boolean;
  onRemove: () => void;
  onReset: () => void;
  onAnalyze: () => void;
  onSpecChange: (key: HardwareFieldKey, value: string) => void;
  onStorageSave: (capacity: string, storageType: string) => boolean;
}

function ScreenshotUploadPanel({
  previewUrl,
  fileName,
  errorMessage,
  analysisMessage,
  isAnalyzing,
  ocrProgress,
  detectedText,
  detectedSpecs,
  editableSpecs,
  compatibilityResult,
  showAnalysis,
  onRemove,
  onReset,
  onAnalyze,
  onSpecChange,
  onStorageSave,
}: ScreenshotUploadPanelProps) {
  if (!previewUrl && !errorMessage && !isAnalyzing && !showAnalysis) {
    return null;
  }

  return (
    <section
      id="upload-screenshot"
      className="w-full max-w-3xl px-4 sm:px-0 mb-16 lg:mb-24"
      aria-live="polite"
    >
      {errorMessage ? <FileUploadError id={SCREENSHOT_UPLOAD_ERROR_ID} message={errorMessage} /> : null}

      {previewUrl || showAnalysis || isAnalyzing ? (
        <div className="rounded-xl backdrop-blur-md bg-slate-800/40 border border-slate-700/50 shadow-2xl shadow-blue-500/10 overflow-hidden">
          {showAnalysis ? (
            <>
              <CompatibilityResults
                result={compatibilityResult}
                storageValue={editableSpecs.storage}
                storageType={editableSpecs.storageType}
                onStorageSave={onStorageSave}
                title={SCREENSHOT_UPLOAD_COPY.resultsTitle}
                allowStorageQuickEdit
                signupSource="screenshot-result"
                actions={
                  <>
                    {analysisMessage ? <AnalysisNotice message={analysisMessage} /> : null}
                    <div className="flex flex-col gap-3 sm:flex-row">
                      {previewUrl ? (
                        <button
                          type="button"
                          className="flex-1 rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-bold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-500"
                          aria-label={SCREENSHOT_UPLOAD_COPY.reanalyzeButton}
                          disabled={isAnalyzing}
                          onClick={onAnalyze}
                        >
                          {isAnalyzing ? (
                            <LoadingSpinner label={SCREENSHOT_UPLOAD_COPY.analyzingButton} />
                          ) : (
                            SCREENSHOT_UPLOAD_COPY.reanalyzeButton
                          )}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="flex-1 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600"
                        aria-label="Check another PC"
                        disabled={isAnalyzing}
                        onClick={onReset}
                      >
                        Check Another PC
                      </button>
                    </div>
                    {isAnalyzing && ocrProgress !== null ? <OcrProgress progress={ocrProgress} /> : null}
                  </>
                }
                advancedDetails={
                  <AdvancedDetails
                    specs={editableSpecs}
                    detectedSpecs={detectedSpecs}
                    detectedText={detectedText}
                    result={compatibilityResult}
                    disabled={isAnalyzing}
                    onSpecChange={onSpecChange}
                  />
                }
              />
            </>
          ) : (
            <>
              {previewUrl ? <ImagePreview src={previewUrl} fileName={fileName} /> : null}

              <div className="flex flex-col gap-3 border-t border-slate-700/50 p-4 sm:flex-row sm:p-6">
                <button
                  type="button"
                  className="flex-1 rounded-lg border-2 border-slate-400 px-6 py-3 text-center font-bold text-slate-200 transition hover:border-slate-200 hover:bg-slate-800/50 hover:text-white disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500"
                  aria-label={SCREENSHOT_UPLOAD_COPY.removeButton}
                  disabled={isAnalyzing}
                  onClick={onRemove}
                >
                  {SCREENSHOT_UPLOAD_COPY.removeButton}
                </button>

                <button
                  type="button"
                  className="flex-1 rounded-lg bg-emerald-500 px-6 py-3 text-center font-bold text-slate-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                  aria-label={SCREENSHOT_UPLOAD_COPY.analyzeButton}
                  disabled={!previewUrl || isAnalyzing}
                  onClick={onAnalyze}
                >
                  {isAnalyzing ? (
                    <LoadingSpinner label={SCREENSHOT_UPLOAD_COPY.analyzingButton} />
                  ) : (
                    SCREENSHOT_UPLOAD_COPY.analyzeButton
                  )}
                </button>
              </div>

              {isAnalyzing && ocrProgress !== null ? <OcrProgress progress={ocrProgress} /> : null}
              {analysisMessage ? <AnalysisNotice message={analysisMessage} /> : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}

interface OcrProgressProps {
  progress: number;
}

function OcrProgress({ progress }: OcrProgressProps) {
  return (
    <div className="border-t border-slate-700/50 px-4 py-4 sm:px-6">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-300">
        <span>Reading your hardware…</span>
        <span className="text-slate-500">Usually under a minute</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-950/60"
        role="progressbar"
        aria-label={SCREENSHOT_UPLOAD_COPY.ocrProgressLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div
          className="h-full rounded-full bg-emerald-400 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

interface AnalysisNoticeProps {
  message: string;
}

function AnalysisNotice({ message }: AnalysisNoticeProps) {
  return (
    <div
      role="status"
      className="border-t border-slate-700/50 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-100 sm:px-6"
    >
      {message}
    </div>
  );
}

interface DetectedSpecsEditorProps {
  specs: EditableHardwareSpecs;
  detectedSpecs: DetectedHardwareSpecs;
  disabled: boolean;
  onSpecChange: (key: HardwareFieldKey, value: string) => void;
}

function DetectedSpecsEditor({
  specs,
  detectedSpecs,
  disabled,
  onSpecChange,
}: DetectedSpecsEditorProps) {
  return (
    <section id="manual-entry" className="border-t border-slate-700/50 px-4 py-5 sm:px-6">
      <h2 className="mb-4 text-left text-lg font-bold text-white">
        {SCREENSHOT_UPLOAD_COPY.detectedSpecsTitle}
      </h2>
      <p className="-mt-2 mb-4 text-left text-xs leading-relaxed text-slate-500">
        Confidence labels reflect the OCR match. Changes update the result instantly.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {HARDWARE_FIELDS.map((field) => {
          if (field.key === 'storageType') {
            return null;
          }

          if (field.key === 'storage') {
            return (
              <StorageFieldsEditor
                key="storage-fields"
                specs={specs}
                detectedSpecs={detectedSpecs}
                disabled={disabled}
                onSpecChange={onSpecChange}
              />
            );
          }

          const fieldId = `hardware-field-${field.key}`;
          const detectedField = detectedSpecs[field.key];

          return (
            <div key={field.key} className="text-left">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor={fieldId} className="text-sm font-bold text-slate-200">
                  {field.label}
                </label>
                <ConfidenceBadge confidence={detectedField.confidence} />
              </div>
              <input
                id={fieldId}
                type="text"
                value={specs[field.key]}
                placeholder={field.placeholder}
                disabled={disabled}
                className="w-full rounded-lg border border-slate-700/70 bg-slate-950/50 px-3 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:bg-slate-900/70 disabled:text-slate-500"
                aria-label={field.label}
                onChange={(event) => onSpecChange(field.key, event.target.value)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StorageFieldsEditor({
  specs,
  detectedSpecs,
  disabled,
  onSpecChange,
}: DetectedSpecsEditorProps) {
  return (
    <div className="text-left sm:col-span-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="hardware-field-storage" className="text-sm font-bold text-slate-200">
              Storage Capacity
            </label>
            <ConfidenceBadge confidence={detectedSpecs.storage.confidence} />
          </div>
          <input
            id="hardware-field-storage"
            type="text"
            inputMode="decimal"
            value={specs.storage}
            placeholder="512 GB or 1 TB"
            disabled={disabled}
            className="w-full rounded-lg border border-slate-700/70 bg-slate-950/50 px-3 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:bg-slate-900/70 disabled:text-slate-500"
            aria-label="Storage Capacity"
            onChange={(event) => onSpecChange('storage', event.target.value)}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="hardware-field-storageType" className="text-sm font-bold text-slate-200">
              Storage Type
            </label>
            <ConfidenceBadge confidence={detectedSpecs.storageType.confidence} />
          </div>
          <select
            id="hardware-field-storageType"
            value={specs.storageType}
            disabled={disabled}
            className="w-full rounded-lg border border-slate-700/70 bg-slate-950/50 px-3 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:bg-slate-900/70 disabled:text-slate-500"
            aria-label="Storage Type"
            onChange={(event) => onSpecChange('storageType', event.target.value)}
          >
            <option value="">Select storage type</option>
            {MANUAL_STORAGE_TYPES.map((storageType) => (
              <option key={storageType} value={storageType}>
                {storageType}
              </option>
            ))}
          </select>
        </div>
      </div>

      <details className="group/storage mt-3 rounded-lg border border-slate-700/60 bg-slate-950/30">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:text-white [&::-webkit-details-marker]:hidden">
          <span>How do I find my storage?</span>
          <span
            className="text-base text-slate-500 transition-transform group-open/storage:rotate-180"
            aria-hidden="true"
          >
            &#8964;
          </span>
        </summary>
        <ol className="border-t border-slate-700/50 px-8 py-3 text-xs leading-6 text-slate-400">
          <li>1. Press Ctrl + Shift + Esc</li>
          <li>2. Open Performance</li>
          <li>3. Click Disk</li>
          <li>4. Enter the capacity</li>
          <li>5. Select SSD, NVMe SSD, or HDD</li>
        </ol>
      </details>
    </div>
  );
}

interface ConfidenceBadgeProps {
  confidence: DetectedHardwareSpecs[HardwareFieldKey]['confidence'];
}

function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const badgeClass = {
    high: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
    medium: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
    low: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
    none: 'border-slate-600/50 bg-slate-900/50 text-slate-400',
  }[confidence];

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold capitalize ${badgeClass}`}>
      {confidence}
    </span>
  );
}

interface InfoListProps {
  values: string[];
}

function InfoList({ values }: InfoListProps) {
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {values.map((value) => (
        <li
          key={value}
          className="rounded-full border border-slate-600/70 bg-slate-950/40 px-3 py-1 text-xs font-semibold text-slate-300"
        >
          {value}
        </li>
      ))}
    </ul>
  );
}

interface AdvancedDetailsProps extends DetectedSpecsEditorProps {
  detectedText: string | null;
  result: CompatibilityResult;
}

function AdvancedDetails({
  specs,
  detectedSpecs,
  detectedText,
  result,
  disabled,
  onSpecChange,
}: AdvancedDetailsProps) {
  const issues = [...result.missingInfo, ...result.uncertainInfo];
  const detectedFieldCount = HARDWARE_FIELDS.filter(
    (field) => detectedSpecs[field.key].displayValue.trim().length > 0,
  ).length;
  const validResultFieldCount = result.components.filter(
    (component) => component.status !== 'unknown',
  ).length;

  return (
    <details className="group border-t border-slate-700/50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-left sm:px-6 [&::-webkit-details-marker]:hidden">
        <div>
          <div className="text-sm font-bold text-emerald-300">
            {SCREENSHOT_UPLOAD_COPY.advancedTitle}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            Edit detected specs or review OCR diagnostics
          </div>
        </div>
        <span
          className="text-lg text-slate-500 transition-transform group-open:rotate-180"
          aria-hidden="true"
        >
          &#8964;
        </span>
      </summary>

      <div className="border-t border-slate-700/50">
        <DetectedSpecsEditor
          specs={specs}
          detectedSpecs={detectedSpecs}
          disabled={disabled}
          onSpecChange={onSpecChange}
        />

        <section className="border-t border-slate-700/50 px-4 py-5 text-left sm:px-6">
          <h3 className="text-sm font-bold text-slate-200">
            {SCREENSHOT_UPLOAD_COPY.parserDiagnosticsTitle}
          </h3>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
            <DiagnosticItem label="Detected fields" value={`${detectedFieldCount} of ${HARDWARE_FIELDS.length}`} />
            <DiagnosticItem label="Usable result fields" value={`${validResultFieldCount} of 5`} />
            <DiagnosticItem label="OCR characters" value={`${detectedText?.length ?? 0}`} />
          </dl>
        </section>

        {issues.length > 0 ? (
          <section className="border-t border-slate-700/50 px-4 py-5 text-left sm:px-6">
            <h3 className="text-sm font-bold text-slate-200">
              {SCREENSHOT_UPLOAD_COPY.missingInfoTitle}
            </h3>
            <InfoList values={issues} />
          </section>
        ) : null}

        <DetectedText text={detectedText ?? ''} />
      </div>
    </details>
  );
}

function DiagnosticItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 px-3 py-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-bold text-slate-200">{value}</dd>
    </div>
  );
}

function DetectedText({ text }: { text: string }) {
  return (
    <section className="border-t border-slate-700/50 px-4 py-5 text-left sm:px-6">
      <h3 className="text-sm font-bold text-slate-200">
        {SCREENSHOT_UPLOAD_COPY.detectedTextTitle}
      </h3>
      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-700/60 bg-slate-950/60 p-4 text-left text-sm leading-relaxed text-slate-200">
        {text || SCREENSHOT_UPLOAD_COPY.noDetectedText}
      </pre>
    </section>
  );
}

interface ImagePreviewProps {
  src: string;
  fileName: string | null;
}

function ImagePreview({ src, fileName }: ImagePreviewProps) {
  return (
    <div className="p-4 sm:p-6">
      <div className="overflow-hidden rounded-lg border border-slate-700/60 bg-slate-950/40 shadow-2xl shadow-slate-950/40">
        {/* Blob previews cannot be optimized by next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={SCREENSHOT_UPLOAD_COPY.previewAlt}
          className="h-auto max-h-[28rem] w-full object-contain bg-slate-950/60"
        />
      </div>

      {fileName ? (
        <p className="mt-3 truncate text-sm text-slate-300" title={fileName}>
          {fileName}
        </p>
      ) : null}
    </div>
  );
}

interface FileUploadErrorProps {
  id: string;
  message: string;
}

function FileUploadError({ id, message }: FileUploadErrorProps) {
  return (
    <div
      id={id}
      role="alert"
      className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 shadow-lg shadow-rose-950/20"
    >
      {message}
    </div>
  );
}

interface LoadingSpinnerProps {
  label: string;
}

function LoadingSpinner({ label }: LoadingSpinnerProps) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900"
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}
