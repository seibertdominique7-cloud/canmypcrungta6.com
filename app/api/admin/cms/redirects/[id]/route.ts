import { requireAdminApi } from '../../../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../../../lib/admin-api';
import { deleteRedirect, getRedirects, saveRedirect } from '../../../../../lib/cms-data';
import { redirectInput } from '../route';

export async function PATCH(request: Request, context: RouteContext<'/api/admin/cms/redirects/[id]'>) { const denied = await requireAdminApi(request); if (denied) return denied; try { await saveRedirect(redirectInput(await readJson(request)), (await context.params).id); return Response.json({ message: 'Redirect saved.', items: await getRedirects() }); } catch (error) { return adminRouteError(error); } }
export async function DELETE(request: Request, context: RouteContext<'/api/admin/cms/redirects/[id]'>) { const denied = await requireAdminApi(request); if (denied) return denied; try { await deleteRedirect((await context.params).id); return Response.json({ message: 'Redirect deleted.', items: await getRedirects() }); } catch (error) { return adminRouteError(error); } }
