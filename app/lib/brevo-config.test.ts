import { describe, expect, it } from 'vitest';

import { parseBrevoConfiguration } from './brevo-config';

describe('Brevo server configuration', () => {
  it('accepts complete private configuration', () => {
    const result = parseBrevoConfiguration({
      BREVO_API_KEY: 'test-api-key',
      BREVO_LIST_ID: '3',
      BREVO_SENDER_EMAIL: 'updates@canmypcrungta6.com',
      BREVO_SENDER_NAME: 'CanMyPCRunGTA6',
    });

    expect(result).toEqual({
      configuration: {
        apiKey: 'test-api-key',
        listId: 3,
        senderEmail: 'updates@canmypcrungta6.com',
        senderName: 'CanMyPCRunGTA6',
      },
      issues: [],
    });
  });

  it('reports every missing or invalid value without exposing a secret', () => {
    const result = parseBrevoConfiguration({
      BREVO_API_KEY: '',
      BREVO_LIST_ID: 'not-a-list',
      BREVO_SENDER_EMAIL: 'invalid',
      BREVO_SENDER_NAME: '',
    });

    expect(result.configuration).toBeNull();
    expect(result.issues).toEqual([
      'BREVO_API_KEY is not configured.',
      'BREVO_LIST_ID must be a positive integer.',
      'BREVO_SENDER_EMAIL must be a valid email address.',
      'BREVO_SENDER_NAME is not configured.',
    ]);
  });
});
