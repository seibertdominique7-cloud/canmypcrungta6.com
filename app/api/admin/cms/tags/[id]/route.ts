import { requireAdminApi } from '../../../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../../../lib/admin-api';
import { deleteTag, getTags, mergeTag, saveTag } from '../../../../../lib/cms-data';
import { tagInput } from '../route';

export async function PATCH(request: Request, context: RouteContext<'/api/admin/cms/tags/[id]'>) { const denied = await requireAdminApi(request); if (denied) return denied; const { id } = await context.params; const body = await readJson(request); const item = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {}; try { if (item.action === 'merge' && typeof item.targetId === 'string') await mergeTag(id, item.targetId); else await saveTag(tagInput(body), id); return Response.json({ message: item.action === 'merge' ? 'Tags merged.' : 'Tag saved.', items: await getTags() }); } catch (error) { return adminRouteError(error); } }
export async function DELETE(request: Request, context: RouteContext<'/api/admin/cms/tags/[id]'>) { const denied = await requireAdminApi(request); if (denied) return denied; try { await deleteTag((await context.params).id); return Response.json({ message: 'Tag deleted.', items: await getTags() }); } catch (error) { return adminRouteError(error); } }
