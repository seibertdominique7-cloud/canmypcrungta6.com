import { getPublicMonetization } from '../../lib/affiliate-data';
import { isExactRecommendationScenarioCode } from '../../lib/recommendation-scenario';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scenarioCode = url.searchParams.get('scenario') ?? '';

  if (!isExactRecommendationScenarioCode(scenarioCode)) {
    return Response.json({ error: 'Invalid scenario code.' }, { status: 400 });
  }

  return Response.json(await getPublicMonetization(scenarioCode), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
