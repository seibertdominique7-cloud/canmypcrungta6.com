import { requireAdminApi } from '../../../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../../../lib/admin-api';
import { getMediaFolders, saveMediaFolder } from '../../../../../lib/cms-data';

export async function GET(request: Request) { const denied = await requireAdminApi(request); return denied ?? Response.json({ folders: await getMediaFolders() }); }
export async function POST(request: Request) { const denied = await requireAdminApi(request); if (denied) return denied; try { const body = await readJson(request); const item = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {}; await saveMediaFolder({ name: typeof item.name === 'string' ? item.name : '' }); return Response.json({ message: 'Folder created.', folders: await getMediaFolders() }, { status: 201 }); } catch (error) { return adminRouteError(error); } }
