export const CONTACT_SUBJECTS = [
  'General question',
  'Technical support',
  'Report a correction',
  'Privacy request',
  'Business or partnerships',
  'Other',
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

export interface ContactSubmissionInput {
  name: string;
  email: string;
  subject: ContactSubject;
  message: string;
  consentAcknowledged: true;
}

export interface ContactValidationResult {
  data: ContactSubmissionInput | null;
  errors: Record<string, string>;
  isBot: boolean;
}

export function validateContactSubmission(value: unknown): ContactValidationResult {
  const input = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  const website = cleanText(input.website, 200);
  if (website) return { data: null, errors: {}, isBot: true };

  const name = cleanText(input.name, 100);
  const email = cleanText(input.email, 254).toLowerCase();
  const subject = cleanText(input.subject, 80) as ContactSubject;
  const message = cleanText(input.message, 5000);
  const errors: Record<string, string> = {};

  if (name.length < 2) errors.name = 'Enter your name.';
  if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!CONTACT_SUBJECTS.includes(subject)) errors.subject = 'Choose a subject.';
  if (message.length < 10) errors.message = 'Enter at least 10 characters so we can understand your request.';

  return {
    data: Object.keys(errors).length
      ? null
      : { name, email, subject, message, consentAcknowledged: true },
    errors,
    isBot: false,
  };
}

function cleanText(value: unknown, maximum: number) {
  return (typeof value === 'string' ? value : '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maximum);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
