import { adminRouteError, readJson } from '../../../../lib/admin-api';
import {
  deleteRecommendationSection,
  getAdminScenarios,
  moveRecommendationSection,
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
    if (isMoveAction(body)) {
      await moveRecommendationSection(id, body.direction);
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

function isMoveAction(value: unknown): value is { action: 'move'; direction: 'up' | 'down' } {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.action === 'move' && (record.direction === 'up' || record.direction === 'down')
  );
}
