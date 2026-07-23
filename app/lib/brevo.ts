import 'server-only';

import { upsertBrevoContact, type BrevoContactSyncResult } from './brevo-client';
import { parseBrevoConfiguration } from './brevo-config';

export type BrevoSubscriberSyncResult =
  | BrevoContactSyncResult
  | { status: 'failed'; reason: 'configuration'; issues: string[] };

export async function syncSubscriberToBrevo(
  normalizedEmail: string,
): Promise<BrevoSubscriberSyncResult> {
  const hasApiKey = Boolean(process.env.BREVO_API_KEY?.trim());
  const listId = Number(process.env.BREVO_LIST_ID?.trim());

  if (process.env.NODE_ENV === 'development') {
    console.info(
      `[Brevo sync] Starting contact sync. ${JSON.stringify({
        hasApiKey,
        listId: Number.isInteger(listId) && listId > 0 ? listId : null,
        email: normalizedEmail,
      })}`,
    );
  }

  const parsed = parseBrevoConfiguration(process.env);

  if (!parsed.configuration) {
    return {
      status: 'failed',
      reason: 'configuration',
      issues: parsed.issues,
    };
  }

  return upsertBrevoContact({
    apiKey: parsed.configuration.apiKey,
    email: normalizedEmail,
    listId: parsed.configuration.listId,
    onResponse:
      process.env.NODE_ENV === 'development'
        ? ({ status, body }) => {
            console.info(
              `[Brevo sync] Contact API response. ${JSON.stringify({
                status,
                body: body || '<empty>',
              })}`,
            );
          }
        : undefined,
  });
}
