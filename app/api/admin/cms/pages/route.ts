import { requireAdminApi } from '../../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../../lib/admin-api';
import { createPage, getContentWorkspace } from '../../../../lib/cms-data';
import { validatePageInput } from '../../../../lib/cms-validation';

export async function GET(request: Request) { const denied = await requireAdminApi(request); return denied ?? Response.json({ workspace: await getContentWorkspace() }); }
export async function POST(request: Request) { const denied = await requireAdminApi(request); if (denied) return denied; const validation = validatePageInput(await readJson(request)); if (!validation.data) return Response.json({ error: 'Correct the highlighted page fields.', fieldErrors: validation.fieldErrors }, { status: 400 }); try { await createPage(validation.data); return Response.json({ message: 'Page created.', warnings: validation.warnings, workspace: await getContentWorkspace() }, { status: 201 }); } catch (error) { return adminRouteError(error); } }
