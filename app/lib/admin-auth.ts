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
  if (getAdminConfigurationError()) {
    return false;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!token) {
    return false;
  }

  return verifySessionToken(token);
}

export async function requireAdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect('/admin/affiliate-links/login');
  }
}

export async function requireAdminApi(request: Request) {
  if (!isRequestSameOrigin(request)) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return null;
}

function createSessionToken(payload: AdminSessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token: string) {
  const [encodedPayload, suppliedSignature, extra] = token.split('.');

  if (!encodedPayload || !suppliedSignature || extra) {
    return false;
  }

  const expectedSignature = sign(encodedPayload);

  if (!safeEqual(suppliedSignature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as AdminSessionPayload;

    return (
      payload.version === 1 &&
      Number.isInteger(payload.expiresAt) &&
      payload.expiresAt > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
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
