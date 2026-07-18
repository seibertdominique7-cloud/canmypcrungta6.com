import { adminRouteError, readJson } from '../../../lib/admin-api';
import { createAffiliateLink, getAdminScenarios } from '../../../lib/affiliate-data';
import { validateAffiliateLinkInput } from '../../../lib/affiliate-validation';
import { requireAdminApi } from '../../../lib/admin-auth';

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const validation = validateAffiliateLinkInput(await readJson(request));

  if (!validation.data) {
    return Response.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
  }

  try {
    await createAffiliateLink(validation.data);
    return Response.json(
      { scenarios: await getAdminScenarios(), warnings: validation.warnings },
      { status: 201 },
    );
  } catch (error) {
    return adminRouteError(error);
  }
}
