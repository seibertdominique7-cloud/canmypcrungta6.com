import { adminRouteError, readJson } from '../../../lib/admin-api';
import { createAffiliateLink, getAdminScenarios } from '../../../lib/affiliate-data';
import { validateAffiliateLinkInput } from '../../../lib/affiliate-validation';
import { requireAdminApi } from '../../../lib/admin-auth';

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const body = await readJson(request);
  const validation = validateAffiliateLinkInput(body);

  if (process.env.NODE_ENV !== 'production') {
    const input = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
    console.info('[admin/products] Create request received', {
      sectionId: typeof input.sectionId === 'string' ? input.sectionId : null,
      titleLength: typeof input.title === 'string' ? input.title.trim().length : 0,
      validationErrors: validation.errors,
    });
  }

  if (!validation.data) {
    return Response.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
  }

  try {
    await createAffiliateLink(validation.data);
    if (process.env.NODE_ENV !== 'production') {
      console.info('[admin/products] Product created', {
        sectionId: validation.data.sectionId,
        titleLength: validation.data.title.length,
      });
    }
    return Response.json(
      { scenarios: await getAdminScenarios(), warnings: validation.warnings },
      { status: 201 },
    );
  } catch (error) {
    return adminRouteError(error);
  }
}
