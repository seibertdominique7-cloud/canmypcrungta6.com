import type { BrevoSubscriberSyncResult } from './brevo';
import type { SubscribeEmailOutcome } from './subscriber-data';
import type { SubscriberSignupInput } from './subscriber-types';

interface SubscriberSyncDependencies {
  saveLocally(input: SubscriberSignupInput): Promise<SubscribeEmailOutcome>;
  syncWithBrevo(normalizedEmail: string): Promise<BrevoSubscriberSyncResult>;
}

export type SubscriberSyncResult =
  | {
      outcome: Exclude<SubscribeEmailOutcome, 'suppressed'>;
      brevo: BrevoSubscriberSyncResult;
    }
  | { outcome: 'suppressed'; brevo: null };

export async function saveSubscriberThenSyncBrevo(
  input: SubscriberSignupInput,
  dependencies: SubscriberSyncDependencies,
): Promise<SubscriberSyncResult> {
  const outcome = await dependencies.saveLocally(input);

  if (outcome === 'suppressed') {
    return { outcome, brevo: null };
  }

  try {
    const brevo = await dependencies.syncWithBrevo(input.normalizedEmail);
    return { outcome, brevo };
  } catch {
    return {
      outcome,
      brevo: { status: 'failed', reason: 'network' },
    };
  }
}
