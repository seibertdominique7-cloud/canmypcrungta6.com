import { adminRouteError, readJson } from '../../../../lib/admin-api';
import {
  deleteGamePurchaseLink,
  getAdminGamePurchaseLinks,
  moveGamePurchaseLink,
  updateGamePurchaseLink,
} from '../../../../lib/affiliate-data';
import { requireAdminApi } from '../../../../lib/admin-auth';
import { validateGamePurchaseLinkInput } from '../../../../lib/affiliate-validation';

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/admin/game-purchase-links/[id]'>,
) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const body = await readJson(request);

  try {
    if (isMoveAction(body)) {
      await moveGamePurchaseLink(id, body.direction);
      return Response.json({ purchaseLinks: await getAdminGamePurchaseLinks() });
    }

    const validation = validateGamePurchaseLinkInput(body);

    if (!validation.data) {
      return Response.json(
        { error: validation.errors[0], errors: validation.errors },
        { status: 400 },
      );
    }

    await updateGamePurchaseLink(id, validation.data);
    return Response.json({
      purchaseLinks: await getAdminGamePurchaseLinks(),
      warnings: validation.warnings,
    });
  } catch (error) {
    return adminRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<'/api/admin/game-purchase-links/[id]'>,
) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;

  try {
    await deleteGamePurchaseLink(id);
    return Response.json({ purchaseLinks: await getAdminGamePurchaseLinks() });
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
