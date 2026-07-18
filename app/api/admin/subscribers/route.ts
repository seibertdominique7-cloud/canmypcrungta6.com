import { requireAdminApi } from '../../../lib/admin-auth';
import {
  createSubscriberCsv,
  getSubscriberAdminPayload,
} from '../../../lib/subscriber-data';
import { parseSubscriberAdminFilters } from '../../../lib/subscriber-validation';

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const filters = parseSubscriberAdminFilters(url.searchParams);

  try {
    if (url.searchParams.get('format') === 'csv') {
      const csv = await createSubscriberCsv(filters);
      const date = new Date().toISOString().slice(0, 10);
      return new Response(`\uFEFF${csv}`, {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Disposition': `attachment; filename="gta6-subscribers-${date}.csv"`,
          'Content-Type': 'text/csv; charset=utf-8',
        },
      });
    }

    return Response.json(await getSubscriberAdminPayload(filters), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return subscriberAdminError(error);
  }
}

function subscriberAdminError(error: unknown) {
  console.error(
    '[subscriber admin] Request failed.',
    error instanceof Error ? error.name : 'UnknownError',
  );
  return Response.json(
    { error: 'The subscriber request could not be completed.' },
    { status: 500 },
  );
}
