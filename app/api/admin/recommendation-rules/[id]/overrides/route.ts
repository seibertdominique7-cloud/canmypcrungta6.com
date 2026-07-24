import { adminRouteError, readJson } from '../../../../../lib/admin-api';
import { requireAdminApi } from '../../../../../lib/admin-auth';
import { getRecommendationWorkspace } from '../../../../../lib/catalog-data';
import { setRecommendationRuleOverride } from '../../../../../lib/recommendation-rules-data';

export async function POST(
  request: Request,
  context: RouteContext<'/api/admin/recommendation-rules/[id]/overrides'>,
) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const body = await readJson(request);
  const record =
    typeof body === 'object' && body !== null
      ? body as Record<string, unknown>
      : {};
  const action = record.action;
  const productId = record.productId;

  if (
    typeof productId !== 'string' ||
    (action !== 'PIN' && action !== 'EXCLUDE' && action !== 'RESET')
  ) {
    return Response.json({ error: 'Choose a product and override action.' }, { status: 400 });
  }

  try {
    await setRecommendationRuleOverride(id, productId, action);
    return Response.json({
      message:
        action === 'RESET'
          ? 'Product returned to automatic selection.'
          : `Product ${action === 'PIN' ? 'pinned' : 'excluded'}.`,
      workspace: await getRecommendationWorkspace(),
    });
  } catch (error) {
    return adminRouteError(error);
  }
}
