import { describe, expect, it } from 'vitest';

import { evaluateCompatibility, type CompatibilityComponentKey } from './compatibility';
import { CPU_PERFORMANCE_TIERS } from './cpu-tiers';
import { GPU_PERFORMANCE_TIERS } from './gpu-tiers';
import { normalizeHardwareName, resolveCpuModel, resolveGpuModel } from './hardware-ranking';
import {
  createEmptyEditableSpecs,
  type EditableHardwareSpecs,
} from './hardware-types';

function componentStatus(
  key: CompatibilityComponentKey,
  overrides: Partial<EditableHardwareSpecs>,
) {
  const specs = Object.assign(createEmptyEditableSpecs(), {
    cpu: 'Intel Core i7-12700K',
    gpu: 'NVIDIA GeForce RTX 3070',
    ram: '32 GB',
    windowsVersion: 'Windows 11',
    ...overrides,
  });

  return evaluateCompatibility(specs, null).components.find((component) => component.key === key);
}

describe('hardware name normalization and catalog matching', () => {
  it('resolves every canonical catalog name back to its own CPU entry', () => {
    CPU_PERFORMANCE_TIERS.forEach((entry) => {
      expect(resolveCpuModel(entry.canonicalName)?.entry.canonicalName).toBe(entry.canonicalName);
    });
  });

  it('resolves every canonical catalog name back to its own GPU entry', () => {
    GPU_PERFORMANCE_TIERS.forEach((entry) => {
      expect(resolveGpuModel(entry.canonicalName)?.entry.canonicalName).toBe(entry.canonicalName);
    });
  });

  it('normalizes compact and branded RTX 3070 variants to the same desktop model', () => {
    expect(resolveGpuModel('NVIDIA GeForce RTX 3070')?.entry.canonicalName).toBe(
      'NVIDIA GeForce RTX 3070',
    );
    expect(resolveGpuModel('RTX3070')?.entry.canonicalName).toBe('NVIDIA GeForce RTX 3070');
  });

  it('keeps laptop GPU variants separate from their desktop names', () => {
    const desktop = resolveGpuModel('RTX 3070');
    const laptop = resolveGpuModel('RTX 3070 Laptop GPU');

    expect(desktop?.entry.formFactor).toBe('desktop');
    expect(laptop?.entry.formFactor).toBe('laptop');
    expect(laptop?.entry.performanceTier).toBeLessThan(desktop?.entry.performanceTier ?? 0);
    expect(componentStatus('gpu', { gpu: 'RTX 3070 Laptop GPU' })?.status).toBe('minimum');
  });

  it('normalizes AMD and integrated graphics naming variants', () => {
    expect(resolveGpuModel('AMD Radeon RX 6700 XT')?.entry.canonicalName).toBe(
      'AMD Radeon RX 6700 XT',
    );
    expect(resolveGpuModel('Radeon 780M Graphics')?.entry.formFactor).toBe('integrated');
    expect(resolveGpuModel('Intel Iris Xe Graphics')?.entry.formFactor).toBe('integrated');
  });

  it('normalizes common Intel and Ryzen CPU variations', () => {
    expect(resolveCpuModel('Intel Core i7-12700K')?.entry.canonicalName).toBe(
      'Intel Core i7-12700K',
    );
    expect(resolveCpuModel('i7 12700K')?.entry.canonicalName).toBe('Intel Core i7-12700K');
    expect(resolveCpuModel('Ryzen 7 8845HS')?.entry.canonicalName).toBe(
      'AMD Ryzen 7 8845HS',
    );
  });

  it('normalizes punctuation without making an unknown model look known', () => {
    expect(normalizeHardwareName('Intel® Core™ i7-12700K')).toBe('intel core i 7 12700 k');
    expect(resolveCpuModel('Example Quantum CPU 12345')).toBeNull();
    expect(resolveCpuModel('Intel Core i7-99999K')).toBeNull();
    expect(resolveGpuModel('Radeon 999M Graphics')).toBeNull();
    expect(resolveGpuModel('NVIDIA GeForce RTX 9999')).toBeNull();
  });
});

describe('shared CPU and GPU compatibility tiers', () => {
  it.each([
    ['RTX 3070', 'recommended'],
    ['GTX 1660', 'minimum'],
    ['GTX 1650', 'below'],
    ['AMD Radeon RX 6700 XT', 'recommended'],
    ['Radeon 780M Graphics', 'below'],
  ] as const)('classifies %s as %s', (gpu, expectedStatus) => {
    expect(componentStatus('gpu', { gpu })?.status).toBe(expectedStatus);
  });

  it.each([
    ['Ryzen 7 8845HS', 'recommended'],
    ['i5-9600K', 'minimum'],
    ['i7-12700K', 'recommended'],
  ] as const)('classifies %s as %s', (cpu, expectedStatus) => {
    expect(componentStatus('cpu', { cpu })?.status).toBe(expectedStatus);
  });

  it('returns Unknown and preserves the raw hardware name when no catalog model matches', () => {
    const rawCpu = 'Example Quantum CPU 12345';
    const rawGpu = 'Example Photon GPU 9876';
    const cpu = componentStatus('cpu', { cpu: rawCpu });
    const gpu = componentStatus('gpu', { gpu: rawGpu });

    expect(cpu?.status).toBe('unknown');
    expect(cpu?.detected).toBe(rawCpu);
    expect(gpu?.status).toBe('unknown');
    expect(gpu?.detected).toBe(rawGpu);
  });
});
