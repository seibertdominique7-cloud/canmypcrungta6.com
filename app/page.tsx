'use client';

import { type ChangeEvent, useEffect, useRef, useState } from 'react';

const MAX_SCREENSHOT_SIZE_BYTES = 10 * 1024 * 1024;
const ANALYSIS_DELAY_MS = 2000;
const SCREENSHOT_UPLOAD_INPUT_ID = 'screenshot-upload-input';
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
  previewAlt: 'Screenshot preview for system specs upload',
  fileTypeError: 'Please upload a PNG, JPG, JPEG, or WEBP image.',
  fileSizeError: 'Please choose an image smaller than 10 MB.',
  removeButton: 'Remove Image',
  analyzeButton: 'Analyze Screenshot',
  analyzingButton: 'Analyzing screenshot',
  analysisComingSoon: 'Screenshot analysis coming soon',
} as const;

export default function Home() {
  const {
    inputRef,
    selectedFile,
    previewUrl,
    errorMessage,
    isAnalyzing,
    analysisMessage,
    handleFileChange,
    removeImage,
    analyzeScreenshot,
  } = useScreenshotUpload();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Subtle background gradient overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-900/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-900/20 rounded-full blur-3xl"></div>
      </div>

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        
        {/* Header section with headline and subtitle */}
        <header className="flex flex-col items-center justify-center w-full max-w-4xl mb-12 sm:mb-16 lg:mb-20 text-center">
          {/* Main headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight leading-tight">
            Can My PC Run<br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              GTA VI?
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mb-6 leading-relaxed">
            Check if your gaming rig meets the estimated requirements for Grand Theft Auto VI. Get instant compatibility results and personalized upgrade recommendations.
          </p>

          {/* Disclaimer */}
          <p className="text-sm text-slate-400 italic max-w-2xl">
            ⚠️ Disclaimer: Rockstar Games has not released official PC requirements. These are community estimates based on available information.
          </p>
        </header>

        {/* CTA Buttons section */}
        <section className="flex flex-col sm:flex-row gap-4 sm:gap-3 mb-16 lg:mb-24 w-full max-w-3xl px-4 sm:px-0">
          {/* Primary button - Upload Screenshot */}
          <input
            ref={inputRef}
            id={SCREENSHOT_UPLOAD_INPUT_ID}
            type="file"
            accept={SCREENSHOT_ACCEPT_ATTRIBUTE}
            className="fixed -left-96 -top-96 h-px w-px overflow-hidden opacity-0"
            tabIndex={-1}
            aria-hidden="true"
            aria-describedby={
              errorMessage ? SCREENSHOT_UPLOAD_ERROR_ID : undefined
            }
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="flex-1 py-4 px-8 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/50 text-center text-lg cursor-pointer"
            aria-label={SCREENSHOT_UPLOAD_COPY.inputLabel}
            onClick={() => inputRef.current?.click()}
          >
            {SCREENSHOT_UPLOAD_COPY.uploadButton}
          </button>

          {/* Secondary button - Manual Entry */}
          <a
            href="#manual-entry"
            className="flex-1 py-4 px-8 border-2 border-slate-400 hover:border-slate-200 text-slate-200 hover:text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 hover:bg-slate-800/50 text-center text-lg"
            aria-label="Enter your PC specs manually"
          >
            ⚙️ Enter Specs Manually
          </a>

          {/* Tertiary button - Download Scanner */}
          <a
            href="#download-scanner"
            className="flex-1 py-4 px-8 text-slate-300 hover:text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 border border-transparent hover:border-blue-400/50 text-center text-lg hover:bg-slate-800/30"
            aria-label="Download PC scanner tool in beta"
          >
            ⬇️ Download Scanner (Beta)
          </a>
        </section>

        <ScreenshotUploadPanel
          previewUrl={previewUrl}
          fileName={selectedFile?.name ?? null}
          errorMessage={errorMessage}
          isAnalyzing={isAnalyzing}
          analysisMessage={analysisMessage}
          onRemove={removeImage}
          onAnalyze={analyzeScreenshot}
        />

        {/* Feature cards section */}
        <section className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-4 sm:px-0">
          
          {/* Card 1: Screenshot Detection */}
          <FeatureCard
            icon="📷"
            title="Screenshot Detection"
            description="Upload a screenshot of your system specs to instantly check compatibility."
          />

          {/* Card 2: Manual Compatibility Check */}
          <FeatureCard
            icon="🔧"
            title="Manual Compatibility Check"
            description="Enter your components manually and get a detailed breakdown of your PC's performance."
          />

          {/* Card 3: Upgrade Recommendations */}
          <FeatureCard
            icon="⚡"
            title="Upgrade Recommendations"
            description="Get personalized upgrade suggestions to meet the estimated GTA VI requirements."
          />

        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-slate-800 bg-slate-950/50 py-8 text-center text-sm text-slate-400">
        <p>
          Made for gaming enthusiasts • Stay tuned for GTA VI • 
          <a href="#privacy" className="text-blue-400 hover:text-blue-300 ml-1">Privacy Policy</a>
        </p>
      </footer>
    </div>
  );
}

function useScreenshotUpload() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const analysisTimeoutRef = useRef<number | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (analysisTimeoutRef.current !== null) {
        window.clearTimeout(analysisTimeoutRef.current);
      }

      if (previewUrlRef.current !== null) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

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

  const clearAnalysisState = () => {
    if (analysisTimeoutRef.current !== null) {
      window.clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = null;
    }

    setIsAnalyzing(false);
    setAnalysisMessage(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    clearAnalysisState();

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

  const removeImage = () => {
    clearAnalysisState();
    setSelectedFile(null);
    clearPreviewUrl();
    setErrorMessage(null);
    resetFileInput();
  };

  const analyzeScreenshot = () => {
    if (!selectedFile || isAnalyzing) {
      return;
    }

    setErrorMessage(null);
    setAnalysisMessage(null);
    setIsAnalyzing(true);

    analysisTimeoutRef.current = window.setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisMessage(SCREENSHOT_UPLOAD_COPY.analysisComingSoon);
      analysisTimeoutRef.current = null;
    }, ANALYSIS_DELAY_MS);
  };

  return {
    inputRef,
    selectedFile,
    previewUrl,
    errorMessage,
    isAnalyzing,
    analysisMessage,
    handleFileChange,
    removeImage,
    analyzeScreenshot,
  };
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
  isAnalyzing: boolean;
  analysisMessage: string | null;
  onRemove: () => void;
  onAnalyze: () => void;
}

function ScreenshotUploadPanel({
  previewUrl,
  fileName,
  errorMessage,
  isAnalyzing,
  analysisMessage,
  onRemove,
  onAnalyze,
}: ScreenshotUploadPanelProps) {
  if (!previewUrl && !errorMessage && !isAnalyzing && !analysisMessage) {
    return null;
  }

  return (
    <section
      id="upload-screenshot"
      className="w-full max-w-3xl px-4 sm:px-0 mb-16 lg:mb-24"
      aria-live="polite"
    >
      {errorMessage ? (
        <FileUploadError id={SCREENSHOT_UPLOAD_ERROR_ID} message={errorMessage} />
      ) : null}

      {previewUrl ? (
        <div className="rounded-xl backdrop-blur-md bg-slate-800/40 border border-slate-700/50 shadow-2xl shadow-blue-500/10 overflow-hidden">
          <ImagePreview src={previewUrl} fileName={fileName} />

          <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-700/50 p-4 sm:p-6">
            <button
              type="button"
              className="flex-1 py-3 px-6 border-2 border-slate-400 hover:border-slate-200 text-slate-200 hover:text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 hover:bg-slate-800/50 text-center"
              aria-label={SCREENSHOT_UPLOAD_COPY.removeButton}
              onClick={onRemove}
            >
              {SCREENSHOT_UPLOAD_COPY.removeButton}
            </button>

            <button
              type="button"
              className="flex-1 py-3 px-6 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-600 disabled:text-slate-300 disabled:hover:bg-slate-600 text-slate-900 font-bold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 hover:shadow-lg hover:shadow-emerald-500/50 disabled:hover:shadow-none text-center"
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

          {analysisMessage ? (
            <p className="border-t border-slate-700/50 px-4 py-4 sm:px-6 text-center text-sm font-semibold text-emerald-300">
              {analysisMessage}
            </p>
          ) : null}
        </div>
      ) : null}
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

/**
 * FeatureCard Component
 * A glass-morphism styled card with icon, title, and description
 * Includes hover effects for interactivity
 */
interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="group relative p-8 rounded-xl backdrop-blur-md bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent pointer-events-none"></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col gap-4">
        {/* Icon */}
        <span className="text-5xl mb-2 block transform group-hover:scale-110 transition-transform duration-300">
          {icon}
        </span>
        
        {/* Title */}
        <h3 className="text-xl font-bold text-white leading-tight">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-slate-300 leading-relaxed text-base">
          {description}
        </p>
      </div>

      {/* Subtle bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full"></div>
    </div>
  );
}
