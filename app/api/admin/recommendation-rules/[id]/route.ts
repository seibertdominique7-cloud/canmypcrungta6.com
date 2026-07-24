import { adminRouteError, readJson } from '../../../../lib/admin-api';
import { requireAdminApi } from '../../../../lib/admin-auth';
import { getRecommendationWorkspace } from '../../../../lib/catalog-data';
import {
  resetRecommendationRule,
  updateRecommendationRule,
} from '../../../../lib/recommendation-rules-data';
import { validateRecommendationRuleInput } from '../../../../lib/recommendation-rule-validation';

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/admin/recommendation-rules/[id]'>,
) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const body = await readJson(request);
  const record =
    typeof body === 'object' && body !== null
      ? body as Record<string, unknown>
      : {};

  try {
    if (record.action === 'reset') {
      await resetRecommendationRule(id);
      return Response.json({
        message: 'Rule reset to its launch default.',
        workspace: await getRecommendationWorkspace(),
      });
    }

    const validation = validateRecommendationRuleInput(body);
    if (!validation.data) {
      return Response.json(
        { error: 'Correct the highlighted rule fields.', fieldErrors: validation.fieldErrors },
        { status: 400 },
      );
    }
    await updateRecommendationRule(id, validation.data);
    return Response.json({
      message: 'Recommendation rule saved.',
      workspace: await getRecommendationWorkspace(),
    });
  } catch (error) {
    return adminRouteError(error);
  }
}
