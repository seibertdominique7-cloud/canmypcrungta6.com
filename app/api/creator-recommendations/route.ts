import { isCoreRecommendationScenarioCode } from '../../data/recommendation-scenarios';
import { getPublicCreatorRecommendation } from '../../lib/creator-recommendation-data';

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const scenarioCode = searchParams.get('scenario')?.trim() ?? '';

  if (!isCoreRecommendationScenarioCode(scenarioCode)) {
    return Response.json({ error: 'Invalid creator recommendation scenario.' }, { status: 400 });
  }

  const excludeProductIds = (searchParams.get('exclude') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 50);

  return Response.json(await getPublicCreatorRecommendation(
    scenarioCode,
    new Set(excludeProductIds),
  ), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
