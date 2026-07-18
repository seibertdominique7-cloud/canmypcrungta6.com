import { NextResponse } from 'next/server';

import {
  createAdminSession,
  getAdminConfigurationError,
  isRequestSameOrigin,
  verifyAdminPassword,
} from '../../../lib/admin-auth';

export async function POST(request: Request) {
  if (!isRequestSameOrigin(request)) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const formData = await request.formData();
  const password = formData.get('password');
  const nextValue = formData.get('next');
  const destination =
    typeof nextValue === 'string' && nextValue.startsWith('/admin/')
      ? nextValue
      : '/admin/affiliate-links';
  const requestOrigin = request.headers.get('origin') ?? request.url;
  const loginUrl = new URL('/admin/affiliate-links/login', requestOrigin);

  if (getAdminConfigurationError()) {
    loginUrl.searchParams.set('error', 'config');
    return NextResponse.redirect(loginUrl, 303);
  }

  if (typeof password !== 'string' || !verifyAdminPassword(password)) {
    loginUrl.searchParams.set('error', 'invalid');
    return NextResponse.redirect(loginUrl, 303);
  }

  await createAdminSession();
  return NextResponse.redirect(new URL(destination, requestOrigin), 303);
}
