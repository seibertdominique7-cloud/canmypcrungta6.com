import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isAdPlacementCode } from '../../../../data/ad-placements';
import { requireAdminApi } from '../../../../lib/admin-auth';
import { AD_PREVIEW_COOKIE, AD_PREVIEW_HINT_COOKIE } from '../../../../lib/ad-preview';

export async function GET(request: NextRequest) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  const code = request.cookies.get(AD_PREVIEW_COOKIE)?.value ?? '';
  const response = NextResponse.json({ placement: isAdPlacementCode(code) ? code : null });
  response.cookies.delete(AD_PREVIEW_COOKIE);
  response.cookies.delete(AD_PREVIEW_HINT_COOKIE);
  return response;
}
