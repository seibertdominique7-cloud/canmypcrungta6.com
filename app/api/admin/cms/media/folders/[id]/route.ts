import { requireAdminApi } from '../../../../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../../../../lib/admin-api';
import { deleteMediaFolder, getMediaFolders, saveMediaFolder } from '../../../../../../lib/cms-data';

export async function PATCH(request: Request, context: RouteContext<'/api/admin/cms/media/folders/[id]'>) { const denied = await requireAdminApi(request); if (denied) return denied; try { const body = await readJson(request); const item = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {}; await saveMediaFolder({ name: typeof item.name === 'string' ? item.name : '' }, (await context.params).id); return Response.json({ message: 'Folder renamed.', folders: await getMediaFolders() }); } catch (error) { return adminRouteError(error); } }
export async function DELETE(request: Request, context: RouteContext<'/api/admin/cms/media/folders/[id]'>) { const denied = await requireAdminApi(request); if (denied) return denied; try { await deleteMediaFolder((await context.params).id); return Response.json({ message: 'Folder deleted.', folders: await getMediaFolders() }); } catch (error) { return adminRouteError(error); } }
