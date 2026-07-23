import { requireAdminApi } from '../../../../../lib/admin-auth';
import { adminRouteError } from '../../../../../lib/admin-api';
import { getContentWorkspace, restoreMissingRequiredPages } from '../../../../../lib/cms-data';

export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;

  try {
    const result = await restoreMissingRequiredPages();
    const message = result.created || result.linked
      ? `Restored ${result.created} missing page${result.created === 1 ? '' : 's'} and linked ${result.linked} equivalent page${result.linked === 1 ? '' : 's'}.`
      : 'All required public pages are already present.';
    return Response.json({ message, workspace: await getContentWorkspace() });
  } catch (error) {
    return adminRouteError(error);
  }
}
