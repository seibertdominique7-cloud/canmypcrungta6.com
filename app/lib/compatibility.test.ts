import { describe, expect, it } from 'vitest';

import { evaluateCompatibility } from './compatibility';
import {
  createEmptyDetectedSpecs,
  createEmptyEditableSpecs,
  type EditableHardwareSpecs,
} from './hardware-types';

function createSpecs(overrides: Partial<EditableHardwareSpecs>) {
  return Object.assign(createEmptyEditableSpecs(), overrides);
}

describe('evaluateCompatibility consumer results', () => {
  it('returns only the five consumer-facing component rows', () => {
    const result = evaluateCompatibility(
      createSpecs({
        cpu: 'Intel Core i7-12700K',
        gpu: 'NVIDIA RTX 3070',
        ram: '32 GB',
        storage: '320 GB NVMe SSD',
        storageType: 'NVMe SSD',
        windowsVersion: 'Windows 11',
      }),
      null,
    );

    expect(result.overall.title).toBe('PASS — Recommended');
    expect(result.components.map((component) => component.label)).toEqual([
      'CPU',
      'GPU',
      'RAM',
      'Storage',
      'Windows',
    ]);
    expect(result.components.map((component) => component.statusLabel)).toEqual([
      'Recommended',
      'Recommended',
      'Recommended',
      'Recommended',
      'Recommended',
    ]);
  });

  it('returns PASS — Minimum when every known component meets at least minimum', () => {
    const result = evaluateCompatibility(
      createSpecs({
        cpu: 'Intel Core i5-9600K',
        gpu: 'NVIDIA GTX 1660',
        ram: '16 GB',
        storage: '320 GB SSD',
        storageType: 'SSD',
        windowsVersion: 'Windows 10',
      }),
      null,
    );

    expect(result.overall.title).toBe('PASS — Minimum');
    expect(result.components.find((component) => component.key === 'storage')?.detected).toBe(
      '320 GB SSD',
    );
  });

  it('returns FAIL when a component is below minimum', () => {
    const result = evaluateCompatibility(
      createSpecs({
        cpu: 'Intel Core i7-12700K',
        gpu: 'NVIDIA GTX 1050',
        ram: '32 GB',
        storage: '320 GB NVMe SSD',
        windowsVersion: 'Windows 11',
      }),
      null,
    );

    expect(result.overall.title).toBe('FAIL');
  });

  it('treats a recognized integrated GPU as below minimum instead of unresolved', () => {
    const result = evaluateCompatibility(
      createSpecs({
        cpu: 'AMD Ryzen 7 8845HS',
        gpu: 'AMD Radeon 780M Graphics',
        ram: '32 GB',
        windowsVersion: 'Windows 11',
      }),
      null,
    );

    expect(result.overall.title).toBe('FAIL');
    expect(result.components.find((component) => component.key === 'gpu')).toMatchObject({
      detected: 'AMD Radeon 780M Graphics',
      status: 'below',
    });
  });

  it('does not let missing storage force Cannot Determine', () => {
    const result = evaluateCompatibility(
      createSpecs({
        cpu: 'Intel Core i7-12700K',
        gpu: 'NVIDIA RTX 3070',
        ram: '32 GB',
        windowsVersion: 'Windows 11',
      }),
      null,
    );

    const storage = result.components.find((component) => component.key === 'storage');

    expect(result.overall.title).toBe('PASS — Recommended');
    expect(storage).toMatchObject({
      detected: '',
      status: 'unknown',
      statusLabel: 'Unknown',
      detail: "Storage wasn't detected from this screenshot.",
    });
  });

  it('recalculates storage compatibility as soon as capacity and type are entered', () => {
    const baseSpecs = createSpecs({
      cpu: 'Intel Core i7-12700K',
      gpu: 'NVIDIA RTX 3070',
      ram: '32 GB',
      windowsVersion: 'Windows 11',
    });
    const unknownStorage = evaluateCompatibility(baseSpecs, null);
    const enteredStorage = evaluateCompatibility(
      { ...baseSpecs, storage: '320 GB', storageType: 'NVMe SSD' },
      null,
    );

    expect(unknownStorage.components.find((component) => component.key === 'storage')?.status).toBe(
      'unknown',
    );
    expect(enteredStorage.components.find((component) => component.key === 'storage')).toMatchObject({
      detected: '320 GB NVMe SSD',
      status: 'recommended',
    });
  });

  it('updates the overall result immediately after manual storage is supplied', () => {
    const baseSpecs = createSpecs({
      cpu: 'Intel Core i7-12700K',
      gpu: 'NVIDIA RTX 3070',
      ram: '32.0 GB',
      windowsVersion: 'Windows 11',
    });
    const unknownStorage = evaluateCompatibility(baseSpecs, null);
    const oneTbNvme = evaluateCompatibility(
      { ...baseSpecs, storage: '1 TB', storageType: 'NVMe SSD' },
      null,
    );
    const undersizedHdd = evaluateCompatibility(
      { ...baseSpecs, storage: '150 GB', storageType: 'HDD' },
      null,
    );

    expect(unknownStorage.overall.title).toBe('PASS \u2014 Recommended');
    expect(oneTbNvme.components.find((component) => component.key === 'storage')).toMatchObject({
      detected: '1 TB NVMe SSD',
      status: 'recommended',
    });
    expect(oneTbNvme.overall.title).toBe('PASS \u2014 Recommended');
    expect(undersizedHdd.components.find((component) => component.key === 'storage')).toMatchObject({
      detected: '150 GB HDD',
      status: 'minimum',
    });
    expect(undersizedHdd.overall.title).toBe('PASS \u2014 Minimum');
  });

  it('does not treat valid medium-confidence hardware as missing or uncertain', () => {
    const detectedSpecs = createEmptyDetectedSpecs();
    const specs = createSpecs({
      cpu: 'Intel Core i7-12700K',
      gpu: 'NVIDIA RTX 3070',
      ram: '32 GB',
      storage: '320 GB NVMe SSD',
      windowsVersion: 'Windows 11',
    });

    for (const key of ['cpu', 'gpu', 'ram', 'storage', 'windowsVersion'] as const) {
      detectedSpecs[key] = {
        displayValue: specs[key],
        numericGb: null,
        confidence: 'medium',
      };
    }

    const result = evaluateCompatibility(specs, detectedSpecs);

    expect(result.missingInfo).toEqual([]);
    expect(result.uncertainInfo).toEqual([]);
  });

  it('returns Cannot Determine only when CPU, GPU, or RAM is absent', () => {
    const result = evaluateCompatibility(
      createSpecs({
        gpu: 'NVIDIA RTX 3070',
        ram: '32 GB',
        storage: '320 GB SSD',
        windowsVersion: 'Windows 11',
      }),
      null,
    );

    expect(result.overall.title).toBe('Cannot Determine');
    expect(result.missingInfo).toEqual(['CPU']);
  });

  it('does not let missing Windows force Cannot Determine', () => {
    const result = evaluateCompatibility(
      createSpecs({
        cpu: 'Intel Core i7-12700K',
        gpu: 'NVIDIA RTX 3070',
        ram: '32 GB',
        storage: '320 GB',
        storageType: 'NVMe SSD',
      }),
      null,
    );

    expect(result.overall.title).toBe('PASS — Recommended');
  });
});
