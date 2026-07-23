import { NextResponse } from 'next/server';

import {
  createAdminSession,
  getAdminConfigurationError,
  isRequestSameOrigin,
  verifyAdminPassword,
} from '../../../lib/admin-auth';
import { consumeRateLimit, getRequestClientKey } from '../../../lib/rate-limit';

export async function POST(request: Request) {
  if (!isRequestSameOrigin(request)) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const formData = await request.formData();
  const password = formData.get('password');
  const nextValue = formData.get('next');
  const destination =
    typeof nextValue === 'string' && (nextValue === '/admin' || nextValue.startsWith('/admin/'))
      ? nextValue
      : '/admin';
  const requestOrigin = request.headers.get('origin') ?? request.url;
  const loginUrl = new URL('/admin/affiliate-links/login', requestOrigin);

  if (getAdminConfigurationError()) {
    loginUrl.searchParams.set('error', 'config');
    return NextResponse.redirect(loginUrl, 303);
  }

  const rateLimit = consumeRateLimit(`admin-login:${getRequestClientKey(request)}`, {
    limit: 8,
    windowMs: 15 * 60 * 1_000,
  });

  if (!rateLimit.allowed) {
    loginUrl.searchParams.set('error', 'rate-limit');
    const response = NextResponse.redirect(loginUrl, 303);
    response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds));
    return response;
  }

  if (typeof password !== 'string' || !verifyAdminPassword(password)) {
    loginUrl.searchParams.set('error', 'invalid');
    return NextResponse.redirect(loginUrl, 303);
  }

  await createAdminSession();
  return NextResponse.redirect(new URL(destination, requestOrigin), 303);
}
