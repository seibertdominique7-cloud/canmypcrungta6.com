import { getPublicRecommendations } from '../../lib/affiliate-data';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scenarioCode = url.searchParams.get('scenario')?.trim().toUpperCase() ?? '';
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') ?? '', 10);

  if (!/^[A-Z][A-Z0-9_]{2,63}$/.test(scenarioCode)) {
    return Response.json({ error: 'Invalid scenario code.' }, { status: 400 });
  }

  const recommendations = await getPublicRecommendations(scenarioCode, requestedLimit);

  return Response.json(recommendations ?? { scenario: null, links: [] }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
