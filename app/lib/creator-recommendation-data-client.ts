import { CREATOR_FALLBACK } from '../data/creator-recommendations';
import type { CoreRecommendationScenarioCode } from '../data/recommendation-scenarios';
import type { PublicCreatorRecommendationPayload } from './creator-recommendation-types';

export function getCreatorFallbackPayload(
  scenarioCode: CoreRecommendationScenarioCode,
): PublicCreatorRecommendationPayload {
  return {
    scenarioCode,
    source: 'fallback',
    ...CREATOR_FALLBACK,
    groups: [],
    guides: [],
  };
}
