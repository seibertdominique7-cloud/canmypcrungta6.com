import { adminRouteError, readJson } from '../../../lib/admin-api';
import { requireAdminApi } from '../../../lib/admin-auth';
import {
  createMerchandiseProduct,
  getMerchandiseProducts,
} from '../../../lib/merch-data';
import { validateMerchandiseProduct } from '../../../lib/merch-validation';

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  return Response.json({ products: await getMerchandiseProducts() });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
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
    await createMerchandiseProduct(validation.data);
    return Response.json(
      { message: 'Merchandise product saved.', products: await getMerchandiseProducts() },
      { status: 201 },
    );
  } catch (error) {
    return adminRouteError(error);
  }
}
