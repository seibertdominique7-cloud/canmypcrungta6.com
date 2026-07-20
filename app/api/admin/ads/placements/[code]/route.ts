import { adminRouteError, readJson } from '../../../../../lib/admin-api';
import { requireAdminApi } from '../../../../../lib/admin-auth';
import { getAdminAdWorkspace, saveAdPlacement } from '../../../../../lib/ad-data';
import { isAdPlacementCode } from '../../../../../data/ad-placements';
import { validateAdPlacement } from '../../../../../lib/ad-validation';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  const { code } = await context.params;
  if (!isAdPlacementCode(code)) {
    return Response.json({ error: 'Unknown ad placement.' }, { status: 404 });
  }
  const validation = validateAdPlacement(await readJson(request));
  if (!validation.data) {
    return Response.json(
      { error: 'Correct the highlighted placement settings.', fieldErrors: validation.fieldErrors },
      { status: 400 },
    );
  }
  try {
    await saveAdPlacement(code, validation.data);
    return Response.json({ message: `${code} saved.`, workspace: await getAdminAdWorkspace() });
  } catch (error) {
    return adminRouteError(error);
  }
}
