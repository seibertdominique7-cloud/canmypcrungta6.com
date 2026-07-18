import { NextResponse } from 'next/server';

import { unsubscribeSubscriberByKey } from '../lib/subscriber-data';
import {
  getUnsubscribeConfigurationError,
  verifyUnsubscribeToken,
} from '../lib/unsubscribe-token';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const confirmationUrl = new URL('/unsubscribe/confirmed', requestUrl);
  const token = requestUrl.searchParams.get('token') ?? '';
  const unsubscribeKey =
    token.length <= 1_024 && !getUnsubscribeConfigurationError()
      ? verifyUnsubscribeToken(token)
      : null;

  if (!unsubscribeKey) {
    confirmationUrl.searchParams.set('status', 'invalid');
    return noStoreRedirect(confirmationUrl);
  }

  const result = await unsubscribeSubscriberByKey(unsubscribeKey);
  confirmationUrl.searchParams.set(
    'status',
    result === 'unsubscribed'
      ? 'success'
      : result === 'already-unsubscribed'
        ? 'already'
        : 'invalid',
  );
  return noStoreRedirect(confirmationUrl);
}

function noStoreRedirect(url: URL) {
  const response = NextResponse.redirect(url, 303);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
