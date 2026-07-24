import { adminRouteError, readJson } from '../../../lib/admin-api';
import { requireAdminApi } from '../../../lib/admin-auth';
import {
  getCreatorRecommendationWorkspace,
  saveCreatorRecommendation,
} from '../../../lib/creator-recommendation-data';
import { auditCreatorRecommendationDestinations } from '../../../lib/creator-cta-audit';
import { validateCreatorRecommendationInput } from '../../../lib/creator-recommendation-validation';

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  return Response.json({ workspace: await getCreatorRecommendationWorkspace() });
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const validation = validateCreatorRecommendationInput(await readJson(request));

  if (!validation.data) {
    return Response.json(
      {
        error: 'Correct the highlighted creator recommendation fields.',
        fieldErrors: validation.fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const warnings = await auditCreatorRecommendationDestinations(validation.data);
    await saveCreatorRecommendation(validation.data);
    return Response.json({
      message: 'Creator recommendation saved.',
      warnings,
      workspace: await getCreatorRecommendationWorkspace(),
    });
  } catch (error) {
    return adminRouteError(error);
  }
}
