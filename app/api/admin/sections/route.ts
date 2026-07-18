import { adminRouteError, readJson } from '../../../lib/admin-api';
import {
  createRecommendationSection,
  getAdminScenarios,
} from '../../../lib/affiliate-data';
import { requireAdminApi } from '../../../lib/admin-auth';
import { validateRecommendationSectionInput } from '../../../lib/affiliate-validation';

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const validation = validateRecommendationSectionInput(await readJson(request));

  if (!validation.data) {
    return Response.json(
      { error: validation.errors[0], errors: validation.errors },
      { status: 400 },
    );
  }

  try {
    await createRecommendationSection(validation.data);
    return Response.json({ scenarios: await getAdminScenarios() }, { status: 201 });
  } catch (error) {
    return adminRouteError(error);
  }
}
