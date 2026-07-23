import { describe, expect, it, vi } from 'vitest';

import type { SubscriberSignupInput } from './subscriber-types';
import { saveSubscriberThenSyncBrevo } from './subscriber-sync';

const signup: SubscriberSignupInput = {
  email: 'Player@Example.com',
  normalizedEmail: 'player@example.com',
  gtaUpdatesConsent: true,
  marketingConsent: true,
  scenario: null,
  signupSource: 'homepage',
};

describe('local-first subscriber sync', () => {
  it('commits locally before calling Brevo', async () => {
    const calls: string[] = [];

    const result = await saveSubscriberThenSyncBrevo(signup, {
      saveLocally: async () => {
        calls.push('local');
        return 'subscribed';
      },
      syncWithBrevo: async (email) => {
        calls.push(`brevo:${email}`);
        return { status: 'synced' };
      },
    });

    expect(calls).toEqual(['local', 'brevo:player@example.com']);
    expect(result).toEqual({ outcome: 'subscribed', brevo: { status: 'synced' } });
  });

  it('upserts an already-subscribed contact instead of skipping Brevo', async () => {
    const syncWithBrevo = vi.fn(async () => ({ status: 'synced' as const }));

    const result = await saveSubscriberThenSyncBrevo(signup, {
      saveLocally: async () => 'already-subscribed',
      syncWithBrevo,
    });

    expect(syncWithBrevo).toHaveBeenCalledWith('player@example.com');
    expect(result.outcome).toBe('already-subscribed');
  });

  it('keeps the successful local result when Brevo is unavailable', async () => {
    const result = await saveSubscriberThenSyncBrevo(signup, {
      saveLocally: async () => 'subscribed',
      syncWithBrevo: async () => {
        throw new Error('provider unavailable');
      },
    });

    expect(result).toEqual({
      outcome: 'subscribed',
      brevo: { status: 'failed', reason: 'network' },
    });
  });

  it('does not send suppressed subscribers to Brevo', async () => {
    const syncWithBrevo = vi.fn(async () => ({ status: 'synced' as const }));

    const result = await saveSubscriberThenSyncBrevo(signup, {
      saveLocally: async () => 'suppressed',
      syncWithBrevo,
    });

    expect(syncWithBrevo).not.toHaveBeenCalled();
    expect(result).toEqual({ outcome: 'suppressed', brevo: null });
  });
});
