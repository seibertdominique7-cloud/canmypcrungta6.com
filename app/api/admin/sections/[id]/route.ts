import { adminRouteError, readAdminOrderAction, readJson } from '../../../../lib/admin-api';
import {
  deleteRecommendationSection,
  getAdminScenarios,
  moveRecommendationSection,
  reorderRecommendationSections,
  updateRecommendationSection,
} from '../../../../lib/affiliate-data';
import { requireAdminApi } from '../../../../lib/admin-auth';
import { validateRecommendationSectionInput } from '../../../../lib/affiliate-validation';

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/admin/sections/[id]'>,
) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const body = await readJson(request);

  try {
    const orderAction = readAdminOrderAction(body);

    if (orderAction?.action === 'move') {
      await moveRecommendationSection(id, orderAction.direction);
    } else if (orderAction?.action === 'reorder') {
      await reorderRecommendationSections(id, orderAction.orderedIds);
    } else {
      const validation = validateRecommendationSectionInput(body);

      if (!validation.data) {
        return Response.json(
          { error: validation.errors[0], errors: validation.errors },
          { status: 400 },
        );
      }

      await updateRecommendationSection(id, validation.data);
    }

    return Response.json({ scenarios: await getAdminScenarios() });
  } catch (error) {
    return adminRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<'/api/admin/sections/[id]'>,
) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  try {
    await deleteRecommendationSection(id);
    return Response.json({ scenarios: await getAdminScenarios() });
  } catch (error) {
    return adminRouteError(error);
  }
}
