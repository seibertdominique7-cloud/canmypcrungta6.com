import { requireAdminApi } from '../../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../../lib/admin-api';
import { getTags, saveTag } from '../../../../lib/cms-data';

export async function GET(request: Request) { const denied = await requireAdminApi(request); return denied ?? Response.json({ items: await getTags() }); }
export async function POST(request: Request) { const denied = await requireAdminApi(request); if (denied) return denied; const input = tagInput(await readJson(request)); try { await saveTag(input); return Response.json({ message: 'Tag created.', items: await getTags() }, { status: 201 }); } catch (error) { return adminRouteError(error); } }
export function tagInput(value: unknown) { const item = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}; return { name: typeof item.name === 'string' ? item.name : '', slug: typeof item.slug === 'string' ? item.slug : '' }; }
