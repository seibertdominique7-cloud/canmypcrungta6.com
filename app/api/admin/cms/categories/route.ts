import { requireAdminApi } from '../../../../lib/admin-auth';
import { adminRouteError, readJson } from '../../../../lib/admin-api';
import { getCategories, saveCategory } from '../../../../lib/cms-data';

export async function GET(request: Request) { const denied = await requireAdminApi(request); return denied ?? Response.json({ items: await getCategories() }); }
export async function POST(request: Request) { const denied = await requireAdminApi(request); if (denied) return denied; const body = await readJson(request); const input = categoryInput(body); try { await saveCategory(input); return Response.json({ message: 'Category created.', items: await getCategories() }, { status: 201 }); } catch (error) { return adminRouteError(error); } }
export function categoryInput(value: unknown) { const item = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}; return { name: string(item.name), slug: string(item.slug), description: string(item.description), imageUrl: string(item.imageUrl) || null, seoTitle: string(item.seoTitle), metaDescription: string(item.metaDescription) }; }
function string(value: unknown) { return typeof value === 'string' ? value : ''; }
