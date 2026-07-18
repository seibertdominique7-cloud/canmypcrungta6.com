import { adminRouteError, readJson } from '../../../lib/admin-api';
import {
  createGamePurchaseLink,
  getAdminGamePurchaseLinks,
} from '../../../lib/affiliate-data';
import { requireAdminApi } from '../../../lib/admin-auth';
import { validateGamePurchaseLinkInput } from '../../../lib/affiliate-validation';

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const validation = validateGamePurchaseLinkInput(await readJson(request));

  if (!validation.data) {
    return Response.json(
      { error: validation.errors[0], errors: validation.errors },
      { status: 400 },
    );
  }

  try {
    await createGamePurchaseLink(validation.data);
    return Response.json(
      { purchaseLinks: await getAdminGamePurchaseLinks(), warnings: validation.warnings },
      { status: 201 },
    );
  } catch (error) {
    return adminRouteError(error);
  }
}
