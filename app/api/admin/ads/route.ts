import { adminRouteError, readJson } from '../../../lib/admin-api';
import { requireAdminApi } from '../../../lib/admin-auth';
import { getAdminAdWorkspace, saveAdGlobalSettings } from '../../../lib/ad-data';
import { validateAdGlobalSettings } from '../../../lib/ad-validation';

export async function GET(request: Request) {
  const denied = await requireAdminApi(request);
  return denied ?? Response.json({ workspace: await getAdminAdWorkspace() });
}

export async function PATCH(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  const validation = validateAdGlobalSettings(await readJson(request));
  if (!validation.data) {
    return Response.json(
      { error: 'Correct the highlighted global ad settings.', fieldErrors: validation.fieldErrors },
      { status: 400 },
    );
  }
  try {
    await saveAdGlobalSettings(validation.data);
    return Response.json({ message: 'Global ad settings saved.', workspace: await getAdminAdWorkspace() });
  } catch (error) {
    return adminRouteError(error);
  }
}
