import { createHash } from 'node:crypto';

import { isRequestSameOrigin } from '../../lib/admin-auth';
import { syncSubscriberToBrevo, type BrevoSubscriberSyncResult } from '../../lib/brevo';
import { getRequestClientKey, consumeRateLimit } from '../../lib/rate-limit';
import { subscribeEmail } from '../../lib/subscriber-data';
import { saveSubscriberThenSyncBrevo } from '../../lib/subscriber-sync';
import { validateSubscriberSignup } from '../../lib/subscriber-validation';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  if (!isRequestSameOrigin(request)) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const clientLimit = consumeRateLimit(`subscriber-ip:${getRequestClientKey(request)}`, {
    limit: 8,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });

  if (!clientLimit.allowed) {
    return rateLimitResponse(clientLimit.retryAfterSeconds);
  }

  const validation = validateSubscriberSignup(await readRequestJson(request));

  if (validation.isBot) {
    return subscriberResponse(
      { status: 'subscribed', message: "You're subscribed. We'll send GTA VI updates to your email." },
      201,
    );
  }

  if (!validation.data) {
    return subscriberResponse({ error: validation.errors[0] }, 400);
  }

  const emailKey = createHash('sha256')
    .update(validation.data.normalizedEmail)
    .digest('base64url');
  const emailLimit = consumeRateLimit(`subscriber-email:${emailKey}`, {
    limit: 4,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });

  if (!emailLimit.allowed) {
    return rateLimitResponse(emailLimit.retryAfterSeconds);
  }

  try {
    const { outcome, brevo } = await saveSubscriberThenSyncBrevo(validation.data, {
      saveLocally: subscribeEmail,
      syncWithBrevo: syncSubscriberToBrevo,
    });

    if (outcome === 'suppressed') {
      return subscriberResponse({ error: 'This email address cannot be subscribed.' }, 409);
    }

    const brevoSynced = brevo.status === 'synced';
    if (!brevoSynced) logBrevoFailure(brevo);

    if (outcome === 'already-subscribed') {
      return subscriberResponse(
        {
          status: outcome,
          message: brevoSynced
            ? "You're already subscribed."
            : 'Your subscription is saved. Email delivery is temporarily delayed.',
          ...developmentBrevoDetails(brevo),
        },
        200,
      );
    }

    return subscriberResponse(
      {
        status: outcome,
        message: brevoSynced
          ? "You're subscribed. We'll send GTA VI updates to your email."
          : 'Your subscription is saved. Email delivery is temporarily delayed.',
        ...developmentBrevoDetails(brevo),
      },
      201,
    );
  } catch (error) {
    console.error(
      '[subscriber signup] Database operation failed.',
      error instanceof Error ? error.name : 'UnknownError',
    );
    return subscriberResponse(
      { error: 'We could not complete your subscription. Please try again.' },
      500,
    );
  }
}

function logBrevoFailure(result: Extract<BrevoSubscriberSyncResult, { status: 'failed' }>) {
  if (result.reason === 'configuration') {
    console.error(
      '[subscriber signup] Brevo sync was not attempted after the local save.',
      result.issues.join(' '),
    );
    return;
  }

  console.error(
    `[subscriber signup] Brevo sync failed after the local save. ${JSON.stringify({
      reason: result.reason,
      ...(result.httpStatus ? { httpStatus: result.httpStatus } : {}),
      ...(result.safeMessage ? { message: result.safeMessage } : {}),
    })}`,
  );
}

function developmentBrevoDetails(result: BrevoSubscriberSyncResult) {
  if (process.env.NODE_ENV !== 'development' || result.status === 'synced') return {};

  return {
    brevoSync: {
      status: result.status,
      reason: result.reason,
      ...('httpStatus' in result && result.httpStatus
        ? { httpStatus: result.httpStatus }
        : {}),
      ...('safeMessage' in result && result.safeMessage
        ? { message: result.safeMessage }
        : {}),
      ...('issues' in result ? { issues: result.issues } : {}),
    },
  };
}

async function readRequestJson(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

function subscriberResponse(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function rateLimitResponse(retryAfterSeconds: number) {
  return Response.json(
    { error: 'Too many signup attempts. Please try again shortly.' },
    {
      status: 429,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(retryAfterSeconds),
      },
    },
  );
}
