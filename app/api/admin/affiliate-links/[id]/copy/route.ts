import { adminRouteError, readJson } from '../../../../../lib/admin-api';
import { copyAffiliateLink, getAdminScenarios } from '../../../../../lib/affiliate-data';
import { requireAdminApi } from '../../../../../lib/admin-auth';

export async function POST(
  request: Request,
  context: RouteContext<'/api/admin/affiliate-links/[id]/copy'>,
) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const body = await readJson(request);
  const sectionIds = getSectionIds(body);

  try {
    await copyAffiliateLink(id, sectionIds);
    return Response.json({ scenarios: await getAdminScenarios() }, { status: 201 });
  } catch (error) {
    return adminRouteError(error);
  }
}

function getSectionIds(value: unknown) {
  if (typeof value !== 'object' || value === null) return [];
  const sectionIds = (value as Record<string, unknown>).sectionIds;
  return Array.isArray(sectionIds)
    ? sectionIds.filter((id): id is string => typeof id === 'string')
    : [];
}
