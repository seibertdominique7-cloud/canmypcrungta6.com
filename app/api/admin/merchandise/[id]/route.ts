import { adminRouteError, readJson } from '../../../../lib/admin-api';
import { requireAdminApi } from '../../../../lib/admin-auth';
import {
  deleteMerchandiseProduct,
  getMerchandiseProducts,
  updateMerchandiseProduct,
} from '../../../../lib/merch-data';
import { validateMerchandiseProduct } from '../../../../lib/merch-validation';

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/admin/merchandise/[id]'>,
) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const validation = validateMerchandiseProduct(await readJson(request));
  if (!validation.data) {
    return Response.json(
      {
        error: 'Correct the highlighted merchandise fields.',
        fieldErrors: validation.fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    await updateMerchandiseProduct(id, validation.data);
    return Response.json({
      message: 'Merchandise product saved.',
      products: await getMerchandiseProducts(),
    });
  } catch (error) {
    return adminRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<'/api/admin/merchandise/[id]'>,
) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;

  try {
    await deleteMerchandiseProduct(id);
    return Response.json({
      message: 'Merchandise product deleted.',
      products: await getMerchandiseProducts(),
    });
  } catch (error) {
    return adminRouteError(error);
  }
}
