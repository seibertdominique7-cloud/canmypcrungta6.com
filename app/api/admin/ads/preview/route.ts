import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isAdPlacementCode, type AdPlacementCode } from '../../../../data/ad-placements';
import { requireAdminApi } from '../../../../lib/admin-auth';
import { getRecentArticles } from '../../../../lib/cms-data';
import { AD_PREVIEW_COOKIE, AD_PREVIEW_HINT_COOKIE } from '../../../../lib/ad-preview';

export async function GET(request: NextRequest) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  const code = request.nextUrl.searchParams.get('code') ?? '';
  if (!isAdPlacementCode(code)) {
    return Response.json({ error: 'Unknown ad placement.' }, { status: 400 });
  }
  const destination = await getPreviewDestination(code);
  const response = NextResponse.redirect(new URL(destination, request.url));
  const cookieOptions = {
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 300,
  };
  response.cookies.set(AD_PREVIEW_COOKIE, code, { ...cookieOptions, httpOnly: true });
  response.cookies.set(AD_PREVIEW_HINT_COOKIE, '1', { ...cookieOptions, httpOnly: false });
  return response;
}

async function getPreviewDestination(code: AdPlacementCode) {
  if (code === 'results') return '/manual';
  if (code.startsWith('article-')) {
    const article = (await getRecentArticles(1))[0];
    return article ? `/articles/${article.slug}` : '/articles';
  }
  return '/';
}
