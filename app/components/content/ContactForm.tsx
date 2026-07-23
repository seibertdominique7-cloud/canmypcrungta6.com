'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';

import { CONTACT_SUBJECTS } from '../../lib/contact-validation';

interface ContactResponse {
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
}

export function ContactForm() {
  const formId = useId().replace(/:/g, '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError('');
    setSuccess('');
    setFieldErrors({});

    try {
      const data = Object.fromEntries(new FormData(form));
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const payload = await response.json() as ContactResponse;
      if (!response.ok) {
        setFieldErrors(payload.fieldErrors ?? {});
        throw new Error(payload.error || 'We could not send your message.');
      }
      setSuccess(payload.message || 'Thanks. Your message has been received.');
      form.reset();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'We could not send your message.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={`${formId}-heading`} className="theme-glass-strong mt-10 rounded-3xl p-5 sm:p-7">
      <h2 className="text-2xl font-black text-white" id={`${formId}-heading`}>Send a message</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">Messages are stored securely for review in the private admin dashboard.</p>
      <form className="mt-6 grid gap-5" noValidate onSubmit={submit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <ContactField error={fieldErrors.name} id={`${formId}-name`} label="Name">
            <input autoComplete="name" className={inputClass} id={`${formId}-name`} maxLength={100} name="name" required />
          </ContactField>
          <ContactField error={fieldErrors.email} id={`${formId}-email`} label="Email">
            <input autoComplete="email" className={inputClass} id={`${formId}-email`} maxLength={254} name="email" required type="email" />
          </ContactField>
        </div>
        <ContactField error={fieldErrors.subject} id={`${formId}-subject`} label="Subject">
          <select className={inputClass} defaultValue="" id={`${formId}-subject`} name="subject" required>
            <option disabled value="">Choose a subject</option>
            {CONTACT_SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
        </ContactField>
        <ContactField error={fieldErrors.message} id={`${formId}-message`} label="Message">
          <textarea className={`${inputClass} min-h-44 resize-y`} id={`${formId}-message`} maxLength={5000} minLength={10} name="message" required />
        </ContactField>
        <div aria-hidden="true" className="absolute -left-[10000px] top-auto size-px overflow-hidden">
          <label htmlFor={`${formId}-website`}>Website</label>
          <input autoComplete="off" id={`${formId}-website`} name="website" tabIndex={-1} />
        </div>
        <p className="text-xs leading-5 text-slate-500">By submitting, you acknowledge that the information above will be used to review and respond to your request as described in the <Link className="theme-link font-bold" href="/privacy">Privacy Policy</Link>.</p>
        {(success || error) ? <p aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'}`}>{error || success}</p> : null}
        <button className="theme-primary-button inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 font-black disabled:cursor-wait disabled:opacity-60 sm:justify-self-start" disabled={busy} type="submit">{busy ? 'Sending…' : 'Send Message'}</button>
      </form>
    </section>
  );
}

function ContactField({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-200" htmlFor={id}><span>{label}</span>{children}{error ? <span className="text-xs font-medium text-red-300">{error}</span> : null}</label>;
}

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/25 px-3.5 py-3 text-base text-white outline-none placeholder:text-slate-600 focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/20';
