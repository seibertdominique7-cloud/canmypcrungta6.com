import { describe, expect, it } from 'vitest';

import { evaluateCompatibility } from './compatibility';
import { createEmptyEditableSpecs, type EditableHardwareSpecs } from './hardware-types';
import {
  determineRecommendationScenario,
  isExactRecommendationScenarioCode,
} from './recommendation-scenario';

function scenario(overrides: Partial<EditableHardwareSpecs>) {
  const specs = Object.assign(createEmptyEditableSpecs(), {
    cpu: 'Intel Core i7-12700K',
    gpu: 'NVIDIA GeForce RTX 3070',
    ram: '32 GB',
    storage: '150 GB',
    storageType: 'NVMe SSD',
    windowsVersion: 'Windows 11',
    ...overrides,
  });

  return determineRecommendationScenario(evaluateCompatibility(specs, null));
}

describe('determineRecommendationScenario', () => {
  it('keeps database scenario codes exact', () => {
    expect(isExactRecommendationScenarioCode('FAIL_GPU')).toBe(true);
    expect(isExactRecommendationScenarioCode('fail_gpu')).toBe(false);
    expect(isExactRecommendationScenarioCode('FAIL GPU')).toBe(false);
    expect(isExactRecommendationScenarioCode(' FAIL_GPU ')).toBe(false);
  });

  it('maps recommended and minimum passes', () => {
    expect(scenario({})).toBe('PASS_RECOMMENDED');
    expect(
      scenario({
        cpu: 'Intel Core i5-9600K',
        gpu: 'NVIDIA GeForce GTX 1660',
        ram: '16 GB',
        storageType: 'HDD',
        windowsVersion: 'Windows 10',
      }),
    ).toBe('PASS_MINIMUM');
  });

  it.each([
    [{ gpu: 'NVIDIA GeForce GTX 1650' }, 'FAIL_GPU'],
    [{ cpu: 'Intel Core i5-8400' }, 'FAIL_CPU'],
    [{ ram: '8 GB' }, 'FAIL_RAM'],
    [{ storage: '100 GB' }, 'FAIL_STORAGE'],
    [{ cpu: 'Intel Core i5-8400', gpu: 'NVIDIA GeForce GTX 1650' }, 'FAIL_CPU_GPU'],
    [{ gpu: 'NVIDIA GeForce GTX 1650', ram: '8 GB' }, 'FAIL_GPU_RAM'],
    [{ cpu: 'Intel Core i5-8400', ram: '8 GB' }, 'FAIL_CPU_RAM'],
    [
      { cpu: 'Intel Core i5-8400', gpu: 'NVIDIA GeForce GTX 1650', ram: '8 GB' },
      'FAIL_MULTIPLE',
    ],
  ] as const)('maps %o to %s', (overrides, expected) => {
    expect(scenario(overrides)).toBe(expected);
  });

  it('prioritizes a failure over unknown storage', () => {
    expect(scenario({ gpu: 'NVIDIA GeForce GTX 1650', storage: '', storageType: '' })).toBe(
      'FAIL_GPU',
    );
  });

  it('maps otherwise usable unknown storage separately', () => {
    expect(scenario({ storage: '', storageType: '' })).toBe('UNKNOWN_STORAGE');
  });

  it('maps unresolved CPU, GPU, or RAM to CANNOT_DETERMINE', () => {
    expect(scenario({ gpu: '' })).toBe('CANNOT_DETERMINE');
    expect(scenario({ cpu: '' })).toBe('CANNOT_DETERMINE');
    expect(scenario({ ram: '' })).toBe('CANNOT_DETERMINE');
  });

  it('maps a present but unranked GPU to UNKNOWN_GPU when CPU and RAM are usable', () => {
    expect(scenario({ gpu: 'Unknown GPU Model' })).toBe('UNKNOWN_GPU');
  });
});
