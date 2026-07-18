import { adminRouteError, readAdminOrderAction, readJson } from '../../../../lib/admin-api';
import {
  deleteScenario,
  getAdminScenarios,
  moveScenario,
  reorderScenarios,
  updateScenario,
} from '../../../../lib/affiliate-data';
import { validateScenarioInput } from '../../../../lib/affiliate-validation';
import { requireAdminApi } from '../../../../lib/admin-auth';

export async function PATCH(request: Request, context: RouteContext<'/api/admin/scenarios/[id]'>) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const body = await readJson(request);

  try {
    const orderAction = readAdminOrderAction(body);

    if (orderAction?.action === 'move') {
      await moveScenario(id, orderAction.direction);
    } else if (orderAction?.action === 'reorder') {
      await reorderScenarios(id, orderAction.orderedIds);
    } else {
      const validation = validateScenarioInput(body);

      if (!validation.data) {
        return Response.json(
          { error: validation.errors[0], errors: validation.errors },
          { status: 400 },
        );
      }

      await updateScenario(id, validation.data);
    }

    return Response.json({ scenarios: await getAdminScenarios() });
  } catch (error) {
    return adminRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<'/api/admin/scenarios/[id]'>,
) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  try {
    await deleteScenario(id);
    return Response.json({ scenarios: await getAdminScenarios() });
  } catch (error) {
    return adminRouteError(error);
  }
}
