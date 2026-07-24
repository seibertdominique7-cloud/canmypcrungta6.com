import { adminRouteError } from '../../../../lib/admin-api';
import { requireAdminApi } from '../../../../lib/admin-auth';
import { auditAllRecommendationScenarios } from '../../../../lib/recommendation-rules-data';

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  try {
    return Response.json({ audit: await auditAllRecommendationScenarios() });
  } catch (error) {
    return adminRouteError(error);
  }
}
