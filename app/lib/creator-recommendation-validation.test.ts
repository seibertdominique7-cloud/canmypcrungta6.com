import { describe, expect, it } from 'vitest';

import {
  isSafeCreatorDestination,
  validateCreatorRecommendationInput,
} from './creator-recommendation-validation';

const validInput = {
  scenarioId: 'scenario-1',
  enabled: true,
  headline: 'Ready to stream?',
  subheadline: 'Build it one piece at a time.',
  description: 'Start with the upgrades that solve the biggest bottleneck.',
  warningText: '',
  primaryCtaLabel: 'Build My Streaming Setup',
  primaryCtaUrl: '/articles',
  secondaryCtaLabel: '',
  secondaryCtaUrl: '',
  groups: [
    {
      title: 'Audio That Viewers Notice',
      description: 'Clear voice audio.',
      enabled: true,
      productIds: ['microphone-1', 'headset-1'],
    },
  ],
  guides: [{ label: 'Creator guide', url: '/articles/creator-guide', enabled: true }],
};

describe('creator recommendation validation', () => {
  it('accepts a complete configuration with internal links', () => {
    const result = validateCreatorRecommendationInput(validInput);

    expect(result.fieldErrors).toEqual({});
    expect(result.data?.groups[0].productIds).toEqual(['microphone-1', 'headset-1']);
  });

  it('rejects duplicate product assignments inside a group', () => {
    const result = validateCreatorRecommendationInput({
      ...validInput,
      groups: [{ ...validInput.groups[0], productIds: ['microphone-1', 'microphone-1'] }],
    });

    expect(result.data).toBeNull();
    expect(result.fieldErrors['groups.0.productIds']).toContain('only appear once');
  });

  it('requires secondary CTA labels and URLs as a pair', () => {
    const result = validateCreatorRecommendationInput({
      ...validInput,
      secondaryCtaLabel: 'View guide',
    });

    expect(result.data).toBeNull();
    expect(result.fieldErrors.secondaryCtaUrl).toContain('both');
  });

  it('blocks unsafe destinations while accepting HTTPS, internal paths, and anchors', () => {
    expect(isSafeCreatorDestination('javascript:alert(1)')).toBe(false);
    expect(isSafeCreatorDestination('//example.com/path')).toBe(false);
    expect(isSafeCreatorDestination('https://example.com/creator')).toBe(true);
    expect(isSafeCreatorDestination('/articles/creator')).toBe(true);
    expect(isSafeCreatorDestination('#creator-products')).toBe(true);
  });
});
