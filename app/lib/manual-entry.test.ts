import { describe, expect, it } from 'vitest';

import { evaluateCompatibility } from './compatibility';
import { detectedToEditableSpecs } from './hardware-types';
import { parseHardwareSpecs } from './hardware-parser';
import { createManualDetectedSpecs, normalizeManualEntry } from './manual-entry';

function analyzeManualInput(input: Parameters<typeof normalizeManualEntry>[0]) {
  const normalized = normalizeManualEntry(input);
  const detectedSpecs = createManualDetectedSpecs(normalized.specs);
  const compatibilityResult = evaluateCompatibility(normalized.specs, detectedSpecs);

  return { normalized, detectedSpecs, compatibilityResult };
}

describe('manual entry normalization', () => {
  it('produces the same component and overall results as screenshot analysis for identical specs', () => {
    const screenshot = parseHardwareSpecs(
      [
        'Processor Intel Core i7-12700K',
        'GPU NVIDIA GeForce RTX 3070',
        'Installed Physical Memory (RAM) 32 GB',
        'Storage 150 GB NVMe SSD',
        'OS Name Microsoft Windows 11 Pro',
      ].join('\n'),
    );
    const screenshotSpecs = detectedToEditableSpecs(screenshot.specs);
    const screenshotResult = evaluateCompatibility(screenshotSpecs, screenshot.specs);
    const manual = analyzeManualInput({
      cpu: 'Intel Core i7-12700K',
      gpu: 'NVIDIA GeForce RTX 3070',
      ram: '32 GB',
      storageCapacity: '150 GB',
      storageType: 'NVMe SSD',
      windowsVersion: 'Windows 11',
    });

    expect(manual.normalized.errors).toEqual([]);
    expect(manual.compatibilityResult.overall).toEqual(screenshotResult.overall);
    expect(
      manual.compatibilityResult.components.map(({ key, status }) => ({ key, status })),
    ).toEqual(screenshotResult.components.map(({ key, status }) => ({ key, status })));
  });

  it('produces the same result manually as the screenshot analyzer for Ryzen 7 8845HS + Radeon 780M + 32 GB + Windows 11', () => {
    const analysis = analyzeManualInput({
      cpu: 'AMD Ryzen 7 8845HS',
      gpu: 'AMD Radeon 780M Graphics',
      ram: '32 GB',
      storageCapacity: '',
      storageType: '',
      windowsVersion: 'Windows 11',
    });

    expect(analysis.normalized.errors).toEqual([]);
    expect(analysis.compatibilityResult.overall.title).toBe('FAIL');
    expect(analysis.compatibilityResult.components.find((component) => component.key === 'cpu')).toMatchObject({
      detected: 'AMD Ryzen 7 8845HS',
      status: 'recommended',
    });
    expect(analysis.compatibilityResult.components.find((component) => component.key === 'gpu')).toMatchObject({
      detected: 'AMD Radeon 780M Graphics',
      status: 'below',
    });
    expect(analysis.compatibilityResult.components.find((component) => component.key === 'ram')).toMatchObject({
      detected: '32 GB',
      status: 'recommended',
    });
  });

  it('reaches PASS — Recommended for RTX 3070 + 32 GB + Windows 11 when other requirements are met', () => {
    const analysis = analyzeManualInput({
      cpu: 'Intel Core i7-12700K',
      gpu: 'NVIDIA RTX 3070',
      ram: '32 GB',
      storageCapacity: '',
      storageType: '',
      windowsVersion: 'Windows 11',
    });

    expect(analysis.normalized.errors).toEqual([]);
    expect(analysis.compatibilityResult.overall.title).toBe('PASS — Recommended');
  });

  it('marks GTX 1650 as fail or below minimum', () => {
    const analysis = analyzeManualInput({
      cpu: 'Intel Core i7-12700K',
      gpu: 'NVIDIA GTX 1650',
      ram: '32 GB',
      storageCapacity: '',
      storageType: '',
      windowsVersion: 'Windows 11',
    });

    expect(analysis.normalized.errors).toEqual([]);
    expect(analysis.compatibilityResult.overall.title).toBe('FAIL');
    expect(analysis.compatibilityResult.components.find((component) => component.key === 'gpu')).toMatchObject({
      status: 'below',
    });
  });

  it('does not force Cannot Determine when storage is omitted', () => {
    const analysis = analyzeManualInput({
      cpu: 'Intel Core i7-12700K',
      gpu: 'NVIDIA RTX 3070',
      ram: '32 GB',
      storageCapacity: '',
      storageType: '',
      windowsVersion: 'Windows 11',
    });

    expect(analysis.compatibilityResult.overall.title).toBe('PASS — Recommended');
    expect(analysis.compatibilityResult.components.find((component) => component.key === 'storage')).toMatchObject({
      detected: '',
      status: 'unknown',
    });
  });

  it('requires CPU, GPU, and RAM before checking', () => {
    const analysis = analyzeManualInput({
      cpu: '',
      gpu: '',
      ram: '',
      storageCapacity: '',
      storageType: '',
      windowsVersion: '',
    });

    expect(analysis.normalized.errors).toEqual(
      expect.arrayContaining(['CPU is required.', 'GPU is required.', 'RAM is required.']),
    );
  });
});
