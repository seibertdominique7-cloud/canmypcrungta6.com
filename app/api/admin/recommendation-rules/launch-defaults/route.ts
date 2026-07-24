import { adminRouteError, readJson } from '../../../../lib/admin-api';
import { requireAdminApi } from '../../../../lib/admin-auth';
import {
  applyLaunchDefaults,
  getLaunchDefaultsPreview,
} from '../../../../lib/recommendation-rules-data';
import { getRecommendationWorkspace } from '../../../../lib/catalog-data';
import {
  isCoreRecommendationScenarioCode,
  type CoreRecommendationScenarioCode,
} from '../../../../data/recommendation-scenarios';

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  return Response.json({ preview: await getLaunchDefaultsPreview() });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;
  const body = await readJson(request);
  const record =
    typeof body === 'object' && body !== null
      ? body as Record<string, unknown>
      : {};
  const scenarioCodes = Array.isArray(record.scenarioCodes)
    ? record.scenarioCodes.filter(
        (code): code is CoreRecommendationScenarioCode =>
          typeof code === 'string' && isCoreRecommendationScenarioCode(code),
      )
    : [];

  try {
    const result = await applyLaunchDefaults(
      scenarioCodes,
      record.overwriteManual === true,
    );
    return Response.json({
      message: `${result.created} rules created; ${result.updated} updated; ${result.protectedManual} manual rules protected.`,
      result,
      workspace: await getRecommendationWorkspace(),
    });
  } catch (error) {
    return adminRouteError(error);
  }
}
