import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createUnsubscribeLink,
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from './unsubscribe-token';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('unsubscribe tokens', () => {
  it('signs and verifies an opaque unsubscribe key', () => {
    vi.stubEnv('EMAIL_UNSUBSCRIBE_SECRET', 'test-secret-with-at-least-thirty-two-characters');
    const token = createUnsubscribeToken('unsubscribe_key_123456789');

    expect(verifyUnsubscribeToken(token)).toBe('unsubscribe_key_123456789');
    expect(verifyUnsubscribeToken(`${token}tampered`)).toBeNull();
  });

  it('creates a reusable unsubscribe URL without a database id parameter', () => {
    vi.stubEnv('EMAIL_UNSUBSCRIBE_SECRET', 'test-secret-with-at-least-thirty-two-characters');
    const link = createUnsubscribeLink('https://checker.example', {
      unsubscribeKey: 'unsubscribe_key_987654321',
    });
    const url = new URL(link);

    expect(url.pathname).toBe('/unsubscribe');
    expect(url.searchParams.has('id')).toBe(false);
    expect(verifyUnsubscribeToken(url.searchParams.get('token') ?? '')).toBe(
      'unsubscribe_key_987654321',
    );
  });
});
