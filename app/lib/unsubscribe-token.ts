import { createHmac, timingSafeEqual } from 'node:crypto';

interface UnsubscribeTokenPayload {
  version: 1;
  key: string;
}

const UNSUBSCRIBE_KEY_PATTERN = /^[A-Za-z0-9_-]{10,128}$/;

export function getUnsubscribeConfigurationError() {
  const secret = getSecret();

  if (!secret || secret.length < 32) {
    return 'EMAIL_UNSUBSCRIBE_SECRET must contain at least 32 characters.';
  }

  return null;
}

export function createUnsubscribeToken(unsubscribeKey: string) {
  const configurationError = getUnsubscribeConfigurationError();
  if (configurationError) throw new Error(configurationError);
  if (!UNSUBSCRIBE_KEY_PATTERN.test(unsubscribeKey)) {
    throw new Error('The unsubscribe key is invalid.');
  }

  const payload: UnsubscribeTokenPayload = { version: 1, key: unsubscribeKey };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyUnsubscribeToken(token: string) {
  if (getUnsubscribeConfigurationError()) return null;

  const [encodedPayload, suppliedSignature, extra] = token.split('.');
  if (!encodedPayload || !suppliedSignature || extra) return null;

  const expectedSignature = sign(encodedPayload);
  if (!safeEqual(suppliedSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as Partial<UnsubscribeTokenPayload>;

    return payload.version === 1 &&
      typeof payload.key === 'string' &&
      UNSUBSCRIBE_KEY_PATTERN.test(payload.key)
      ? payload.key
      : null;
  } catch {
    return null;
  }
}

export function createUnsubscribeLink(
  applicationUrl: string | URL,
  subscriber: { unsubscribeKey: string },
) {
  const url = new URL('/unsubscribe', applicationUrl);
  url.searchParams.set('token', createUnsubscribeToken(subscriber.unsubscribeKey));
  return url.toString();
}

function sign(value: string) {
  return createHmac('sha256', getSecret() ?? '').update(value).digest('base64url');
}

function getSecret() {
  return process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    null;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
