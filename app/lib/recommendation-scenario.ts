import type { CoreRecommendationScenarioCode } from '../data/recommendation-scenarios';
import type {
  CompatibilityComponentKey,
  CompatibilityResult,
} from './compatibility';

const RECOMMENDATION_SCENARIO_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,63}$/;

export function isExactRecommendationScenarioCode(value: string) {
  return value === value.trim() && RECOMMENDATION_SCENARIO_CODE_PATTERN.test(value);
}

/**
 * Priority order:
 * 1. Unknown CPU/RAM, or a missing GPU value, becomes CANNOT_DETERMINE.
 * 2. A present but unranked GPU becomes UNKNOWN_GPU when CPU/RAM are usable.
 * 3. Below-minimum components select the most specific failure scenario.
 * 4. Unknown storage is selected only when nothing is below minimum.
 * 5. Remaining results map to recommended or minimum pass scenarios.
 */
export function determineRecommendationScenario(
  result: CompatibilityResult,
): CoreRecommendationScenarioCode {
  const statusByKey = new Map(
    result.components.map((component) => [component.key, component.status]),
  );
  const cpuOrRamUnknown = (['cpu', 'ram'] as const).some(
    (key) => statusByKey.get(key) === 'unknown',
  );
  const gpu = result.components.find((component) => component.key === 'gpu');

  if (cpuOrRamUnknown || (gpu?.status === 'unknown' && !gpu.detected.trim())) {
    return 'CANNOT_DETERMINE';
  }

  if (gpu?.status === 'unknown') return 'UNKNOWN_GPU';

  const below = result.components
    .filter((component) => component.status === 'below')
    .map((component) => component.key);
  const belowSet = new Set(below);

  if (below.length >= 3) return 'FAIL_MULTIPLE';
  if (sameKeys(belowSet, ['cpu', 'gpu'])) return 'FAIL_CPU_GPU';
  if (sameKeys(belowSet, ['gpu', 'ram'])) return 'FAIL_GPU_RAM';
  if (sameKeys(belowSet, ['cpu', 'ram'])) return 'FAIL_CPU_RAM';
  if (sameKeys(belowSet, ['gpu'])) return 'FAIL_GPU';
  if (sameKeys(belowSet, ['cpu'])) return 'FAIL_CPU';
  if (sameKeys(belowSet, ['ram'])) return 'FAIL_RAM';
  if (sameKeys(belowSet, ['storage'])) return 'FAIL_STORAGE';
  if (below.length > 0) return 'FAIL_MULTIPLE';

  if (statusByKey.get('storage') === 'unknown') return 'UNKNOWN_STORAGE';

  return result.overall.status === 'recommended' ? 'PASS_RECOMMENDED' : 'PASS_MINIMUM';
}

function sameKeys(
  actual: Set<CompatibilityComponentKey>,
  expected: CompatibilityComponentKey[],
) {
  return actual.size === expected.length && expected.every((key) => actual.has(key));
}
