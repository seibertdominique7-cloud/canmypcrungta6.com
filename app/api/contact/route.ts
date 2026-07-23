import { createHash } from 'node:crypto';

import { isRequestSameOrigin } from '../../lib/admin-auth';
import { validateContactSubmission } from '../../lib/contact-validation';
import { prisma } from '../../lib/prisma';
import { consumeRateLimit, getRequestClientKey } from '../../lib/rate-limit';

const CONTACT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  if (!isRequestSameOrigin(request)) {
    return contactResponse({ error: 'Invalid request origin.' }, 403);
  }

  const clientLimit = consumeRateLimit(`contact-ip:${getRequestClientKey(request)}`, {
    limit: 5,
    windowMs: CONTACT_RATE_LIMIT_WINDOW_MS,
  });
  if (!clientLimit.allowed) return rateLimitResponse(clientLimit.retryAfterSeconds);

  const validation = validateContactSubmission(await readJson(request));
  if (validation.isBot) {
    return contactResponse({ message: 'Thanks. Your message has been received.' }, 201);
  }
  if (!validation.data) {
    return contactResponse({ error: 'Correct the highlighted fields.', fieldErrors: validation.errors }, 400);
  }

  const emailKey = createHash('sha256').update(validation.data.email).digest('base64url');
  const emailLimit = consumeRateLimit(`contact-email:${emailKey}`, {
    limit: 3,
    windowMs: CONTACT_RATE_LIMIT_WINDOW_MS,
  });
  if (!emailLimit.allowed) return rateLimitResponse(emailLimit.retryAfterSeconds);

  try {
    await prisma.contactSubmission.create({ data: validation.data });
    return contactResponse({ message: 'Thanks. Your message has been received.' }, 201);
  } catch (error) {
    console.error('[contact] Database operation failed.', error instanceof Error ? error.name : 'UnknownError');
    return contactResponse({ error: 'We could not send your message. Please try again.' }, 500);
  }
}

async function readJson(request: Request) {
  try {
    return await request.json() as unknown;
  } catch {
    return null;
  }
}

function contactResponse(body: unknown, status: number) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function rateLimitResponse(retryAfterSeconds: number) {
  return Response.json(
    { error: 'Too many contact attempts. Please try again later.' },
    { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': String(retryAfterSeconds) } },
  );
}
