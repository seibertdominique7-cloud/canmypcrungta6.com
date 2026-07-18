import { requireAdminApi } from '../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../lib/admin-api';
import {
  createRecommendationAssignments,
  getRecommendationWorkspace,
} from '../../../lib/catalog-data';
import { validateAssignmentInput } from '../../../lib/catalog-validation';

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  return Response.json({ workspace: await getRecommendationWorkspace() });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const validation = validateAssignmentInput(await readJson(request));
  if (!validation.data) {
    return Response.json(
      { error: 'Correct the highlighted assignment fields.', fieldErrors: validation.fieldErrors },
      { status: 400 },
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[admin/assignments] Creating assignments', {
      destinations: validation.data.sectionIds.length,
      products: validation.data.productIds.length,
    });
  }

  try {
    const result = await createRecommendationAssignments(validation.data);
    return Response.json(
      {
        message: result.skipped
          ? `${result.created} assignments created; ${result.skipped} existing assignments skipped.`
          : `${result.created} assignments created.`,
        workspace: await getRecommendationWorkspace(),
      },
      { status: 201 },
    );
  } catch (error) {
    return adminRouteError(error);
  }
}
