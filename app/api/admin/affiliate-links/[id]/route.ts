import { adminRouteError, readAdminOrderAction, readJson } from '../../../../lib/admin-api';
import {
  deleteAffiliateLink,
  getAdminScenarios,
  moveAffiliateLink,
  reorderAffiliateLinks,
  updateAffiliateLink,
} from '../../../../lib/affiliate-data';
import { validateAffiliateLinkInput } from '../../../../lib/affiliate-validation';
import { requireAdminApi } from '../../../../lib/admin-auth';

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/admin/affiliate-links/[id]'>,
) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const body = await readJson(request);

  try {
    const orderAction = readAdminOrderAction(body);

    if (orderAction?.action === 'move') {
      await moveAffiliateLink(id, orderAction.direction);
    } else if (orderAction?.action === 'reorder') {
      await reorderAffiliateLinks(id, orderAction.orderedIds);
    } else {
      const validation = validateAffiliateLinkInput(body);

      if (!validation.data) {
        return Response.json(
          { error: validation.errors[0], errors: validation.errors },
          { status: 400 },
        );
      }

      await updateAffiliateLink(id, validation.data);
      return Response.json({
        scenarios: await getAdminScenarios(),
        warnings: validation.warnings,
      });
    }

    return Response.json({ scenarios: await getAdminScenarios() });
  } catch (error) {
    return adminRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<'/api/admin/affiliate-links/[id]'>,
) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  try {
    await deleteAffiliateLink(id);
    return Response.json({ scenarios: await getAdminScenarios() });
  } catch (error) {
    return adminRouteError(error);
  }
}
