import { isCoreRecommendationScenarioCode } from '../../data/recommendation-scenarios';
import { getPublicCreatorRecommendation } from '../../lib/creator-recommendation-data';

export async function GET(request: Request) {
  const scenarioCode = new URL(request.url).searchParams.get('scenario')?.trim() ?? '';

  if (!isCoreRecommendationScenarioCode(scenarioCode)) {
    return Response.json({ error: 'Invalid creator recommendation scenario.' }, { status: 400 });
  }

  return Response.json(await getPublicCreatorRecommendation(scenarioCode), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
