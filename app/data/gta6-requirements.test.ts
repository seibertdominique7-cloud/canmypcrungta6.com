import { describe, expect, it } from 'vitest';

import {
  getMinimumRequirements,
  getRecommendedRequirements,
  getRequirementDisclaimer,
  getRequirementLabel,
  getRequirementLastUpdated,
  getRequirementStatusAdjective,
  gta6Requirements,
} from './gta6-requirements';

describe('centralized GTA VI requirement data', () => {
  it('exposes the estimated status metadata through shared helpers', () => {
    expect(gta6Requirements.status.type).toBe('estimated');
    expect(getRequirementLabel()).toBe('Estimated PC Requirements');
    expect(getRequirementDisclaimer()).toBe(
      'Rockstar Games has not published official GTA VI PC requirements. These values are estimates and may change.',
    );
    expect(getRequirementLastUpdated()).toBe('2026-07-17');
    expect(getRequirementStatusAdjective()).toBe('Estimated');
  });

  it('returns the same minimum and recommended objects used by the engine', () => {
    expect(getMinimumRequirements()).toBe(gta6Requirements.minimum);
    expect(getRecommendedRequirements()).toBe(gta6Requirements.recommended);
  });
});
