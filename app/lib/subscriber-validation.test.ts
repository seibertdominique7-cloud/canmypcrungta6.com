import { describe, expect, it } from 'vitest';

import {
  normalizeSubscriberEmail,
  parseSubscriberAdminFilters,
  validateSubscriberSignup,
} from './subscriber-validation';

describe('subscriber signup validation', () => {
  it('normalizes email while preserving optional marketing consent', () => {
    const result = validateSubscriberSignup({
      email: '  Player.One@Example.COM ',
      gtaUpdatesConsent: true,
      marketingConsent: false,
      signupSource: 'homepage',
      scenario: null,
      company: '',
    });

    expect(result.data).toMatchObject({
      email: 'Player.One@Example.COM',
      normalizedEmail: 'player.one@example.com',
      gtaUpdatesConsent: true,
      marketingConsent: false,
      scenario: null,
      signupSource: 'homepage',
    });
    expect(normalizeSubscriberEmail(' TEST@EXAMPLE.COM ')).toBe('test@example.com');
  });

  it('requires GTA update consent', () => {
    const result = validateSubscriberSignup({
      email: 'player@example.com',
      gtaUpdatesConsent: false,
      marketingConsent: true,
      signupSource: 'homepage',
      company: '',
    });

    expect(result.data).toBeNull();
    expect(result.errors[0]).toMatch(/agree to receive gta vi updates/i);
  });

  it('stores the exact result scenario and source', () => {
    const result = validateSubscriberSignup({
      email: 'player@example.com',
      gtaUpdatesConsent: true,
      marketingConsent: true,
      signupSource: 'screenshot-result',
      scenario: 'FAIL_GPU',
      company: '',
    });

    expect(result.data).toMatchObject({
      scenario: 'FAIL_GPU',
      signupSource: 'screenshot-result',
      marketingConsent: true,
    });
  });

  it('rejects a result signup without a recognized scenario', () => {
    const result = validateSubscriberSignup({
      email: 'player@example.com',
      gtaUpdatesConsent: true,
      marketingConsent: false,
      signupSource: 'manual-result',
      scenario: 'fail gpu',
      company: '',
    });

    expect(result.data).toBeNull();
  });

  it('accepts a filled honeypot without storing signup data', () => {
    const result = validateSubscriberSignup({ company: 'bot company' });

    expect(result).toEqual({ data: null, errors: [], isBot: true });
  });
});

describe('subscriber admin filters', () => {
  it('parses supported filters and defaults invalid values', () => {
    const params = new URLSearchParams({
      search: ' Player@Example.COM ',
      status: 'active',
      gtaUpdatesConsent: 'true',
      marketingConsent: 'false',
      scenario: 'FAIL_RAM',
      signupSource: 'manual-result',
      sort: 'oldest',
    });

    expect(parseSubscriberAdminFilters(params)).toEqual({
      search: 'player@example.com',
      status: 'active',
      gtaUpdatesConsent: 'true',
      marketingConsent: 'false',
      scenario: 'FAIL_RAM',
      signupSource: 'manual-result',
      sort: 'oldest',
    });
  });
});
