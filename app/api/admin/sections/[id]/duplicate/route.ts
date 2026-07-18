import { adminRouteError } from '../../../../../lib/admin-api';
import {
  duplicateRecommendationSection,
  getAdminScenarios,
} from '../../../../../lib/affiliate-data';
import { requireAdminApi } from '../../../../../lib/admin-auth';

export async function POST(
  request: Request,
  context: RouteContext<'/api/admin/sections/[id]/duplicate'>,
) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  try {
    await duplicateRecommendationSection(id);
    return Response.json({ scenarios: await getAdminScenarios() }, { status: 201 });
  } catch (error) {
    return adminRouteError(error);
  }
}
