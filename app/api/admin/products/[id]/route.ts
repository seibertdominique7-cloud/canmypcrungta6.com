import { requireAdminApi } from '../../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../../lib/admin-api';
import {
  deleteCatalogProduct,
  getCatalogProducts,
  updateCatalogProduct,
} from '../../../../lib/catalog-data';
import { getAffiliateDomain, validateProductInput } from '../../../../lib/catalog-validation';

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/admin/products/[id]'>,
) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const validation = validateProductInput(await readJson(request));
  if (!validation.data) {
    return Response.json(
      { error: 'Correct the highlighted product fields.', fieldErrors: validation.fieldErrors },
      { status: 400 },
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[admin/catalog] Updating product', {
      productId: id,
      componentType: validation.data.componentType,
      domain: getAffiliateDomain(validation.data.affiliateUrl),
    });
  }

  try {
    await updateCatalogProduct(id, validation.data);
    return Response.json({
      message: 'Product saved.',
      products: await getCatalogProducts(),
      warnings: validation.warnings,
    });
  } catch (error) {
    return adminRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<'/api/admin/products/[id]'>,
) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;

  try {
    await deleteCatalogProduct(id);
    if (process.env.NODE_ENV !== 'production') {
      console.info('[admin/catalog] Product deleted', { productId: id });
    }
    return Response.json({ message: 'Product deleted.', products: await getCatalogProducts() });
  } catch (error) {
    return adminRouteError(error);
  }
}
