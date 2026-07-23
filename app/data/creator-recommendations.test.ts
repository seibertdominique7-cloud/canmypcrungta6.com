import { describe, expect, it } from 'vitest';

import {
  CREATOR_FALLBACK,
  CREATOR_SCENARIO_DEFAULTS,
  CREATOR_TEMPLATES,
} from './creator-recommendations';
import { CORE_RECOMMENDATION_SCENARIOS } from './recommendation-scenarios';
import { getCreatorFallbackPayload } from '../lib/creator-recommendation-data-client';

describe('creator recommendation defaults', () => {
  it('defines editable creator copy for all 15 compatibility scenarios', () => {
    const scenarioCodes = CORE_RECOMMENDATION_SCENARIOS.map((scenario) => scenario.code);

    expect(Object.keys(CREATOR_SCENARIO_DEFAULTS)).toEqual(scenarioCodes);
    for (const code of scenarioCodes) {
      const copy = CREATOR_SCENARIO_DEFAULTS[code];
      expect(copy.headline.length).toBeGreaterThan(10);
      expect(copy.description.length).toBeGreaterThan(40);
      expect(copy.primaryCtaLabel).toBeTruthy();
    }
  });

  it('keeps the required bottleneck-specific messages', () => {
    expect(CREATOR_SCENARIO_DEFAULTS.FAIL_GPU.headline).toBe(
      'Fix the GPU Bottleneck Before You Start Streaming',
    );
    expect(CREATOR_SCENARIO_DEFAULTS.FAIL_CPU.headline).toContain('CPU');
    expect(CREATOR_SCENARIO_DEFAULTS.FAIL_RAM.headline).toContain('Memory');
    expect(CREATOR_SCENARIO_DEFAULTS.FAIL_STORAGE.headline).toContain('Storage');
  });

  it('returns useful fallback copy without empty product or guide containers', () => {
    const payload = getCreatorFallbackPayload('PASS_RECOMMENDED');

    expect(payload.headline).toBe(CREATOR_FALLBACK.headline);
    expect(payload.groups).toEqual([]);
    expect(payload.guides).toEqual([]);
    expect(payload.primaryCtaLabel).toBe('Build My Streaming Setup');
  });

  it('ships all requested reusable creator templates', () => {
    expect(CREATOR_TEMPLATES.map((template) => template.name)).toEqual([
      'Stream Starter Setup',
      'Budget Creator Setup',
      'Performance Streaming Setup',
      'Advanced Creator Setup',
      'Creator Essentials',
    ]);
  });
});
