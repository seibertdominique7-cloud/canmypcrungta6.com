import 'server-only';

import { AdminDataError } from './affiliate-data';

export async function readJson(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

export function adminRouteError(error: unknown) {
  if (error instanceof AdminDataError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return Response.json({ error: 'The admin request could not be completed.' }, { status: 500 });
}
