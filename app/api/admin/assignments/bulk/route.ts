import { requireAdminApi } from '../../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../../lib/admin-api';
import {
  bulkUpdateRecommendationAssignments,
  getRecommendationWorkspace,
} from '../../../../lib/catalog-data';

export async function PATCH(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const body = await readJson(request);
  const record = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
  const ids = Array.isArray(record.ids)
    ? record.ids.filter((id): id is string => typeof id === 'string')
    : [];
  const action = record.action;
  if (action !== 'enable' && action !== 'disable' && action !== 'delete') {
    return Response.json({ error: 'Choose a valid bulk action.' }, { status: 400 });
  }

  try {
    const result = await bulkUpdateRecommendationAssignments(ids, action);
    return Response.json({
      message: `${result.count} assignments updated.`,
      workspace: await getRecommendationWorkspace(),
    });
  } catch (error) {
    return adminRouteError(error);
  }
}
