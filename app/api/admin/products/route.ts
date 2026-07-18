import { requireAdminApi } from '../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../lib/admin-api';
import { createCatalogProduct, getCatalogProducts } from '../../../lib/catalog-data';
import { getAffiliateDomain, validateProductInput } from '../../../lib/catalog-validation';

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  return Response.json({ products: await getCatalogProducts() });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const body = await readJson(request);
  const validation = validateProductInput(body);
  if (!validation.data) {
    return Response.json(
      { error: 'Correct the highlighted product fields.', fieldErrors: validation.fieldErrors },
      { status: 400 },
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[admin/catalog] Creating product', {
      componentType: validation.data.componentType,
      domain: getAffiliateDomain(validation.data.affiliateUrl),
      titleLength: validation.data.title.length,
    });
  }

  try {
    const product = await createCatalogProduct(validation.data);
    if (process.env.NODE_ENV !== 'production') {
      console.info('[admin/catalog] Product created', { productId: product.id });
    }
    return Response.json(
      {
        message: 'Product saved.',
        products: await getCatalogProducts(),
        warnings: validation.warnings,
      },
      { status: 201 },
    );
  } catch (error) {
    return adminRouteError(error);
  }
}
