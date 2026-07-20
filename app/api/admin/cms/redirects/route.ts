import { requireAdminApi } from '../../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../../lib/admin-api';
import { getRedirects, saveRedirect } from '../../../../lib/cms-data';

export async function GET(request: Request) { const denied = await requireAdminApi(request); return denied ?? Response.json({ items: await getRedirects() }); }
export async function POST(request: Request) { const denied = await requireAdminApi(request); if (denied) return denied; try { await saveRedirect(redirectInput(await readJson(request))); return Response.json({ message: 'Redirect created.', items: await getRedirects() }, { status: 201 }); } catch (error) { return adminRouteError(error); } }
export function redirectInput(value: unknown) { const item = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}; return { sourcePath: typeof item.sourcePath === 'string' ? item.sourcePath : '', destinationPath: typeof item.destinationPath === 'string' ? item.destinationPath : '', statusCode: typeof item.statusCode === 'number' ? item.statusCode : Number(item.statusCode) || 301, enabled: typeof item.enabled === 'boolean' ? item.enabled : true }; }
