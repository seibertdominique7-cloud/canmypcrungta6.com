import { adminRouteError } from '../../../../../../lib/admin-api';
import { requireAdminApi } from '../../../../../../lib/admin-auth';
import { getAdminAdWorkspace, resetAdPlacement } from '../../../../../../lib/ad-data';
import { isAdPlacementCode } from '../../../../../../data/ad-placements';

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  const { code } = await context.params;
  if (!isAdPlacementCode(code)) {
    return Response.json({ error: 'Unknown ad placement.' }, { status: 404 });
  }
  try {
    await resetAdPlacement(code);
    return Response.json({ message: `${code} reset to disabled.`, workspace: await getAdminAdWorkspace() });
  } catch (error) {
    return adminRouteError(error);
  }
}
