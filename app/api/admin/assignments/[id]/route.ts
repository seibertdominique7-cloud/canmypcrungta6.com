import { requireAdminApi } from '../../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../../lib/admin-api';
import {
  deleteRecommendationAssignment,
  getRecommendationWorkspace,
  moveRecommendationAssignment,
  updateRecommendationAssignment,
} from '../../../../lib/catalog-data';
import { validateAssignmentUpdateInput } from '../../../../lib/catalog-validation';

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/admin/assignments/[id]'>,
) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const body = await readJson(request);
  const record = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};

  try {
    if (record.action === 'move' && (record.direction === 'up' || record.direction === 'down')) {
      await moveRecommendationAssignment(id, record.direction);
    } else {
      const validation = validateAssignmentUpdateInput(body);
      if (!validation.data) {
        return Response.json(
          { error: 'Correct the highlighted assignment fields.', fieldErrors: validation.fieldErrors },
          { status: 400 },
        );
      }
      await updateRecommendationAssignment(id, validation.data);
    }

    return Response.json({ message: 'Assignment saved.', workspace: await getRecommendationWorkspace() });
  } catch (error) {
    return adminRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<'/api/admin/assignments/[id]'>,
) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  try {
    await deleteRecommendationAssignment(id);
    return Response.json({
      message: 'Assignment removed. The catalog product was kept.',
      workspace: await getRecommendationWorkspace(),
    });
  } catch (error) {
    return adminRouteError(error);
  }
}
