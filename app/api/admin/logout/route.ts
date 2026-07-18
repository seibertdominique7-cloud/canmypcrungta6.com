import { NextResponse } from 'next/server';

import { clearAdminSession, isRequestSameOrigin } from '../../../lib/admin-auth';

export async function POST(request: Request) {
  if (!isRequestSameOrigin(request)) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  await clearAdminSession();
  return NextResponse.redirect(
    new URL('/admin/affiliate-links/login', request.headers.get('origin') ?? request.url),
    303,
  );
}
