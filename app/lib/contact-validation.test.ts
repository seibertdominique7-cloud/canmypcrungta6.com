import { describe, expect, it } from 'vitest';

import { validateContactSubmission } from './contact-validation';

describe('validateContactSubmission', () => {
  it('normalizes and accepts a complete contact message', () => {
    const result = validateContactSubmission({
      name: '  Alex Player  ',
      email: ' ALEX@example.com ',
      subject: 'Technical support',
      message: 'The screenshot checker did not identify my laptop GPU.',
      website: '',
    });

    expect(result.data).toEqual({
      name: 'Alex Player',
      email: 'alex@example.com',
      subject: 'Technical support',
      message: 'The screenshot checker did not identify my laptop GPU.',
      consentAcknowledged: true,
    });
    expect(result.errors).toEqual({});
  });

  it('rejects incomplete or invalid fields on the server', () => {
    const result = validateContactSubmission({ name: '', email: 'invalid', subject: '', message: 'short' });
    expect(result.data).toBeNull();
    expect(Object.keys(result.errors)).toEqual(['name', 'email', 'subject', 'message']);
  });

  it('silently identifies the honeypot field', () => {
    const result = validateContactSubmission({ website: 'https://bot.example' });
    expect(result.isBot).toBe(true);
    expect(result.errors).toEqual({});
  });
});
