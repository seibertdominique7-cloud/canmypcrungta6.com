import { requireAdminApi } from '../../../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../../../lib/admin-api';
import { deleteMediaAsset, getMediaAssets, updateMediaAsset } from '../../../../../lib/cms-data';
import { getMediaStorage } from '../../../../../lib/media-storage';

export async function PATCH(request: Request, context: RouteContext<'/api/admin/cms/media/[id]'>) { const denied = await requireAdminApi(request); if (denied) return denied; const body = await readJson(request); const item = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {}; try { await updateMediaAsset((await context.params).id, { altText: typeof item.altText === 'string' ? item.altText : '', title: typeof item.title === 'string' ? item.title : '' }); return Response.json({ message: 'Media details saved.', items: await getMediaAssets() }); } catch (error) { return adminRouteError(error); } }
export async function DELETE(request: Request, context: RouteContext<'/api/admin/cms/media/[id]'>) { const denied = await requireAdminApi(request); if (denied) return denied; try { const item = await deleteMediaAsset((await context.params).id); await getMediaStorage().delete(item.storageKey); return Response.json({ message: 'Unused image deleted.', items: await getMediaAssets() }); } catch (error) { return adminRouteError(error); } }
