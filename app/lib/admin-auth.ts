import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const ADMIN_COOKIE_NAME = 'gta6_admin_session';
const ADMIN_SESSION_SECONDS = 60 * 60 * 12;
const MINIMUM_SESSION_SECRET_LENGTH = 32;

interface AdminSessionPayload {
  version: 1;
  expiresAt: number;
}

type AdminAuthenticationResult =
  | { authenticated: true }
  | {
      authenticated: false;
      reason:
        | 'configuration_error'
        | 'missing_cookie'
        | 'malformed_token'
        | 'invalid_signature'
        | 'invalid_payload'
        | 'expired_session';
      configurationError?: string;
    };
type AdminAuthenticationFailureReason = Exclude<
  AdminAuthenticationResult,
  { authenticated: true }
>['reason'];

export function getAdminConfigurationError() {
  if (!process.env.ADMIN_PASSWORD) {
    return getMissingVariableMessage('ADMIN_PASSWORD');
  }

  const sessionSecret = process.env.SESSION_SECRET?.trim();

  if (!sessionSecret) {
    return getMissingVariableMessage('SESSION_SECRET');
  }

  if (sessionSecret.length < MINIMUM_SESSION_SECRET_LENGTH) {
    return `SESSION_SECRET must contain at least ${MINIMUM_SESSION_SECRET_LENGTH} characters.`;
  }

  return null;
}

export function verifyAdminPassword(candidate: string) {
  const configured = process.env.ADMIN_PASSWORD;

  if (!configured || !candidate) {
    return false;
  }

  return safeEqual(candidate, configured);
}

export async function createAdminSession() {
  const cookieStore = await cookies();
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS;

  cookieStore.set(ADMIN_COOKIE_NAME, createSessionToken({ version: 1, expiresAt }), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_SESSION_SECONDS,
    priority: 'high',
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return authenticateAdminSession(token).authenticated;
}

export async function requireAdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/affiliate-links/login');
  }
}

export async function requireAdminApi(request: Request) {
  const token = getRequestCookie(request, ADMIN_COOKIE_NAME);

  if (!isRequestSameOrigin(request)) {
    logAdminAuthenticationFailure(request, 'origin_mismatch', Boolean(token));
    return Response.json(
      {
        error: 'This admin request came from an unrecognized origin. Reload the admin page and try again.',
        code: 'ADMIN_ORIGIN_REJECTED',
      },
      { status: 403 },
    );
  }

  const result = authenticateAdminSession(token);
  if (!result.authenticated) {
    logAdminAuthenticationFailure(request, result.reason, Boolean(token));

    if (result.reason === 'configuration_error') {
      return Response.json(
        {
          error:
            result.configurationError ??
            'Admin authentication is not configured securely on the server.',
          code: 'ADMIN_AUTH_CONFIGURATION_ERROR',
        },
        { status: 503 },
      );
    }

    const expired = result.reason === 'expired_session';
    const missing = result.reason === 'missing_cookie';
    return Response.json(
      {
        error: expired
          ? 'Your admin session has expired. Sign in again, then retry Generate.'
          : missing
            ? 'Your admin session was not sent. Sign in again, then retry Generate.'
            : 'Your admin session is invalid. Sign in again, then retry Generate.',
        code: expired
          ? 'ADMIN_SESSION_EXPIRED'
          : missing
            ? 'ADMIN_SESSION_MISSING'
            : 'ADMIN_SESSION_INVALID',
      },
      { status: 401 },
    );
  }

  return null;
}

function createSessionToken(payload: AdminSessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function authenticateAdminSession(token: string | undefined): AdminAuthenticationResult {
  const configurationError = getAdminConfigurationError();
  if (configurationError) {
    return {
      authenticated: false,
      reason: 'configuration_error',
      configurationError,
    };
  }
  if (!token) {
    return { authenticated: false, reason: 'missing_cookie' };
  }

  const [encodedPayload, suppliedSignature, extra] = token.split('.');

  if (!encodedPayload || !suppliedSignature || extra) {
    return { authenticated: false, reason: 'malformed_token' };
  }

  const expectedSignature = sign(encodedPayload);

  if (!safeEqual(suppliedSignature, expectedSignature)) {
    return { authenticated: false, reason: 'invalid_signature' };
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as AdminSessionPayload;

    if (payload.version !== 1 || !Number.isInteger(payload.expiresAt)) {
      return { authenticated: false, reason: 'invalid_payload' };
    }
    if (payload.expiresAt <= Math.floor(Date.now() / 1000)) {
      return { authenticated: false, reason: 'expired_session' };
    }
    return { authenticated: true };
  } catch {
    return { authenticated: false, reason: 'invalid_payload' };
  }
}

function getRequestCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return undefined;

  for (const item of cookieHeader.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
    const value = item.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return undefined;
}

function logAdminAuthenticationFailure(
  request: Request,
  reason: AdminAuthenticationFailureReason | 'origin_mismatch',
  cookiePresent: boolean,
) {
  let pathname = 'unknown';
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    // Keep malformed request URLs out of the log payload.
  }

  console.warn('[Admin auth] API request rejected', {
    method: request.method,
    pathname,
    reason,
    status:
      reason === 'origin_mismatch'
        ? 403
        : reason === 'configuration_error'
          ? 503
          : 401,
    cookiePresent,
    originPresent: Boolean(request.headers.get('origin')),
  });
}

function sign(value: string) {
  const password = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET?.trim();

  if (!password || !sessionSecret || sessionSecret.length < MINIMUM_SESSION_SECRET_LENGTH) {
    throw new Error('Admin authentication is not configured securely.');
  }

  const signingKey = createHmac('sha256', sessionSecret).update(password).digest();
  return createHmac('sha256', signingKey).update(value).digest('base64url');
}

function getMissingVariableMessage(variableName: 'ADMIN_PASSWORD' | 'SESSION_SECRET') {
  return process.env.NODE_ENV === 'production'
    ? `${variableName} is not configured. Add it to the deployment environment and redeploy.`
    : `${variableName} is not configured. Add it to .env.local and restart npm run dev.`;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function isRequestSameOrigin(request: Request) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return true;
  }

  const origin = request.headers.get('origin');

  if (!origin) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const requestHost = request.headers.get('host');
    const allowedHosts = new Set(
      [requestUrl.host, forwardedHost, requestHost].filter(
        (host): host is string => Boolean(host),
      ),
    );
    const forwardedProtocol = request.headers
      .get('x-forwarded-proto')
      ?.split(',')[0]
      ?.trim()
      .replace(/:$/, '');
    const expectedProtocol = forwardedProtocol
      ? `${forwardedProtocol}:`
      : requestUrl.protocol;

    return allowedHosts.has(originUrl.host) && originUrl.protocol === expectedProtocol;
  } catch {
    return false;
  }
}
