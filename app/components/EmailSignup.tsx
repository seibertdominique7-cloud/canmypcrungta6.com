'use client';

import Link from 'next/link';
import { type FormEvent, useId, useState } from 'react';

import type { CoreRecommendationScenarioCode } from '../data/recommendation-scenarios';
import type { EmailSignupSource } from '../lib/subscriber-types';

type EmailSignupProps = {
  heading?: string;
  description?: string;
} & (
  | {
      variant: 'homepage';
      signupSource: 'homepage';
      scenario?: never;
    }
  | {
      variant: 'result';
      signupSource: Exclude<EmailSignupSource, 'homepage' | 'article'>;
      scenario: CoreRecommendationScenarioCode;
    }
  | {
      variant: 'article';
      signupSource: 'article';
      scenario?: never;
    });

interface SignupResponse {
  error?: string;
  message?: string;
  status?: 'subscribed' | 'already-subscribed';
}

export function EmailSignup(props: EmailSignupProps) {
  const formId = useId();
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const isHomepage = props.variant === 'homepage';
  const isArticle = props.variant === 'article';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          gtaUpdatesConsent: true,
          marketingConsent: true,
          company,
          signupSource: props.signupSource,
          scenario: props.variant === 'result' ? props.scenario : null,
        }),
      });
      const payload = (await response.json()) as SignupResponse;

      if (!response.ok) {
        throw new Error(payload.error || 'We could not complete your subscription.');
      }

      setMessage(payload.message || "You're subscribed. We'll send GTA VI updates to your email.");
      setEmail('');
      setCompany('');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'We could not complete your subscription.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby={`${formId}-heading`}
      className={`theme-glass-card w-full rounded-2xl text-left ${isHomepage ? 'max-w-3xl p-5 sm:p-6' : 'border-x-0 border-b-0 px-4 py-5 sm:px-6'}`}
    >
      <div className={isHomepage ? 'sm:flex sm:items-start sm:justify-between sm:gap-8' : ''}>
        <div className={isHomepage ? 'sm:max-w-sm' : ''}>
          <p className="theme-kicker text-[10px] font-black uppercase tracking-[0.18em]">
            Email updates
          </p>
          <h2 id={`${formId}-heading`} className="mt-1 text-xl font-black text-white">
            {props.heading || (isHomepage ? 'GTA VI Launch Alerts' : isArticle ? 'Get GTA VI PC Updates' : 'Stay GTA VI Ready')}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {props.description || (isHomepage
              ? 'Get notified when official PC requirements, release details, and major updates are announced.'
              : isArticle
                ? 'Get requirement updates and occasional gaming hardware offers.'
                : getResultsSignupDescription(props.scenario))}
          </p>
        </div>

        <form
          className={`${isHomepage ? 'mt-5 sm:mt-0 sm:min-w-0 sm:flex-1' : 'mt-4'} grid gap-3`}
          onSubmit={handleSubmit}
        >
          <div className="grid gap-1.5">
            <label
              className="text-xs font-bold text-slate-200"
              htmlFor={`${formId}-email`}
            >
              Email address
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                autoComplete="email"
                className="theme-input min-w-0 flex-1 rounded-lg px-3.5 py-2.5 text-sm font-normal disabled:opacity-60"
                disabled={busy}
                id={`${formId}-email`}
                aria-describedby={`${formId}-consent`}
                maxLength={254}
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
              <button
                className="theme-primary-button shrink-0 rounded-lg px-5 py-2.5 text-sm font-black"
                disabled={busy}
                type="submit"
              >
                {busy ? 'Subscribing...' : 'Notify Me'}
              </button>
            </div>
          </div>

          <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor={`${formId}-company`}>Company</label>
            <input
              autoComplete="off"
              id={`${formId}-company`}
              name="company"
              onChange={(event) => setCompany(event.target.value)}
              tabIndex={-1}
              type="text"
              value={company}
            />
          </div>

          <p id={`${formId}-consent`} className="text-xs leading-5 text-slate-400">
            By submitting your email, you agree to receive GTA VI updates and occasional gaming
            hardware offers from CanMyPCRunGTA6. You can unsubscribe at any time.{' '}
            <Link
              className="theme-link font-semibold underline decoration-fuchsia-300/40 underline-offset-2"
              href="/privacy"
            >
              Privacy Policy
            </Link>
            .
          </p>

          <div aria-live="polite">
            {message ? (
              <p className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}

function getResultsSignupDescription(scenario: CoreRecommendationScenarioCode) {
  const descriptions: Record<CoreRecommendationScenarioCode, string> = {
    FAIL_GPU: 'Get GTA VI updates and occasional GPU deals that match your upgrade needs.',
    FAIL_CPU: 'Get GTA VI updates and occasional CPU upgrade deals.',
    FAIL_RAM: 'Get GTA VI updates and occasional RAM upgrade deals.',
    FAIL_STORAGE: 'Get GTA VI updates and occasional SSD and storage deals.',
    FAIL_CPU_GPU: 'Get GTA VI updates and occasional CPU, GPU, and complete-PC deals.',
    FAIL_GPU_RAM: 'Get GTA VI updates and occasional GPU and RAM upgrade deals.',
    FAIL_CPU_RAM: 'Get GTA VI updates and occasional CPU and RAM upgrade deals.',
    FAIL_MULTIPLE: 'Get GTA VI updates and occasional complete gaming-PC deals.',
    PASS_RECOMMENDED: 'Get notified when GTA VI PC release or purchase details become available.',
    PASS_MINIMUM: 'Get GTA VI updates and occasional upgrade deals for extra performance headroom.',
    UNKNOWN_GPU: 'Get GTA VI updates and occasional GPU recommendations while you verify your specs.',
    UNKNOWN_CPU: 'Get GTA VI updates and occasional CPU recommendations while you verify your specs.',
    UNKNOWN_RAM: 'Get GTA VI updates and occasional RAM recommendations while you verify your specs.',
    UNKNOWN_STORAGE: 'Get GTA VI updates and occasional storage recommendations.',
    CANNOT_DETERMINE: 'Get official GTA VI PC updates while you verify your hardware details.',
  };

  return descriptions[scenario];
}
