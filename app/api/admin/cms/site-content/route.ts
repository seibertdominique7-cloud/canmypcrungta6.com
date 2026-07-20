import { requireAdminApi } from '../../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../../lib/admin-api';
import { getSiteContent, updateSiteContent } from '../../../../lib/cms-data';

export async function GET(request: Request) { const denied = await requireAdminApi(request); return denied ?? Response.json({ items: await getSiteContent() }); }
export async function PATCH(request: Request) { const denied = await requireAdminApi(request); if (denied) return denied; const body = await readJson(request); const record = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {}; const items = Array.isArray(record.items) ? record.items.filter((item): item is { key: string; value: string } => typeof item === 'object' && item !== null && typeof (item as Record<string, unknown>).key === 'string' && typeof (item as Record<string, unknown>).value === 'string') : []; try { await updateSiteContent(items); return Response.json({ message: 'Site content saved.', items: await getSiteContent() }); } catch (error) { return adminRouteError(error); } }
