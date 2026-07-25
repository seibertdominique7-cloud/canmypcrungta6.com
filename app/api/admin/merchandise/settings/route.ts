import { adminRouteError, readJson } from '../../../../lib/admin-api';
import { requireAdminApi } from '../../../../lib/admin-auth';
import { saveMerchStoreSettings } from '../../../../lib/merch-data';
import { validateMerchStoreSettings } from '../../../../lib/merch-validation';

export async function PATCH(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const validation = validateMerchStoreSettings(await readJson(request));
  if (!validation.data) {
    return Response.json(
      {
        error: 'Correct the highlighted store settings.',
        fieldErrors: validation.fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const settings = await saveMerchStoreSettings(validation.data);
    return Response.json({ message: 'Merch store settings saved.', settings });
  } catch (error) {
    return adminRouteError(error);
  }
}
