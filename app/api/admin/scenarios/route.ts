import { adminRouteError, readJson } from '../../../lib/admin-api';
import { createScenario, getAdminScenarios } from '../../../lib/affiliate-data';
import { validateScenarioInput } from '../../../lib/affiliate-validation';
import { requireAdminApi } from '../../../lib/admin-auth';

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  return Response.json({ scenarios: await getAdminScenarios() });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const validation = validateScenarioInput(await readJson(request));

  if (!validation.data) {
    return Response.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
  }

  try {
    await createScenario(validation.data);
    return Response.json({ scenarios: await getAdminScenarios() }, { status: 201 });
  } catch (error) {
    return adminRouteError(error);
  }
}
