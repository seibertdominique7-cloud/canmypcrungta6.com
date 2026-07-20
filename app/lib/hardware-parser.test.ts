import { describe, expect, it } from 'vitest';

import { evaluateCompatibility } from './compatibility';
import { detectedToEditableSpecs } from './hardware-types';
import { parseHardwareSpecs } from './hardware-parser';

describe('parseHardwareSpecs capacity parsing', () => {
  it.each([
    ['32.0', '32.0 GB', 32],
    ['16.0', '16.0 GB', 16],
    ['8.0', '8.0 GB', 8],
    ['64.0', '64.0 GB', 64],
    ['128.0', '128.0 GB', 128],
    ['16,0', '16,0 GB', 16],
  ])(
    'parses Installed Physical Memory (RAM) %s GB as %s',
    (rawAmount, expectedRam, expectedNumericGb) => {
      const rawOcrText = `Installed Physical Memory (RAM) ${rawAmount} GB`;
      const result = parseHardwareSpecs(rawOcrText);

      expect(result.specs.ram).toMatchObject({
        displayValue: expectedRam,
        numericGb: expectedNumericGb,
      });
      expect(result.specs.storage.displayValue).toBe('');
      expect(result.normalizedOcrText).toContain(`${rawAmount} GB`);
      expect(result.rawOcrText).toBe(rawOcrText);
    },
  );

  it('parses Storage 320 GB SSD as display value 320 GB and numeric value 320', () => {
    const rawOcrText = 'Storage 320 GB SSD';
    const result = parseHardwareSpecs(rawOcrText);

    expect(result.specs.storage).toMatchObject({
      displayValue: '320 GB',
      numericGb: 320,
    });
    expect(result.specs.ram.displayValue).toBe('');
    expect(result.rawOcrText).toBe(rawOcrText);
  });

  it('parses Installed Physical Memory without a parenthetical RAM label', () => {
    const result = parseHardwareSpecs('Installed Physical Memory: 32.0 GB');

    expect(result.specs.ram.displayValue).toBe('32.0 GB');
    expect(result.specs.ram.numericGb).toBe(32);
    expect(result.specs.storage.displayValue).toBe('');
  });

  it('keeps 320 GB SSD as a legitimate storage capacity rather than RAM', () => {
    const result = parseHardwareSpecs('320 GB SSD');

    expect(result.specs.storage.displayValue).toBe('320 GB');
    expect(result.specs.storage.numericGb).toBe(320);
    expect(result.specs.storageType.displayValue).toBe('SSD');
    expect(result.specs.ram.displayValue).toBe('');
  });

  it('uses surrounding labels to keep RAM and storage capacities separate', () => {
    const rawOcrText = [
      'Installed Physical Memory (RAM): 32.0 GB',
      'Storage capacity: 320 GB',
    ].join('\r\n');
    const result = parseHardwareSpecs(rawOcrText);

    expect(result.specs.ram.displayValue).toBe('32.0 GB');
    expect(result.specs.ram.numericGb).toBe(32);
    expect(result.specs.storage.displayValue).toBe('320 GB');
    expect(result.specs.storage.numericGb).toBe(320);
    expect(result.rawOcrText).toBe(rawOcrText);
    expect(result.normalizedOcrText).toContain('32.0 GB\nStorage capacity: 320 GB');
  });

  it('carries parsed 32.0 GB RAM through to the displayed compatibility value', () => {
    const parsed = parseHardwareSpecs('Installed Physical Memory (RAM) 32.0 GB');
    const editableSpecs = detectedToEditableSpecs(parsed.specs);
    const compatibility = evaluateCompatibility(editableSpecs, parsed.specs);
    const displayedRam = compatibility.components.find((component) => component.key === 'ram');

    expect(parsed.specs.ram).toMatchObject({
      displayValue: '32.0 GB',
      numericGb: 32,
    });
    expect(editableSpecs.ram).toBe('32.0 GB');
    expect(displayedRam?.detected).toBe('32.0 GB');
    expect(parsed.ramTrace).toEqual({
      rawOcrLine: 'Installed Physical Memory (RAM) 32.0 GB',
      postProcessedLine: 'Installed Physical Memory (RAM) 32.0 GB',
      normalizedLine: 'Installed Physical Memory (RAM) 32.0 GB',
      regexMatch: {
        matchedText: '32.0 GB',
        rawAmount: '32.0',
        unit: 'GB',
      },
      parsedNumber: 32,
      numericGb: 32,
      componentValue: '32.0 GB',
    });
  });

  it.each([
    ['Installed RAM: 32.0 GB', '32.0 GB', 32],
    ['Memory 32,0 GB', '32,0 GB', 32],
    ['Total Physical Memory 32,768 MB', '32,768 MB', 32],
    ['Memory: 32768 MB RAM', '32768 MB', 32],
  ])('extracts locale-safe RAM from %s', (rawOcrText, displayValue, numericGb) => {
    const result = parseHardwareSpecs(rawOcrText);

    expect(result.specs.ram).toMatchObject({ displayValue, numericGb });
  });
});

describe('parseHardwareSpecs integrated GPU parsing', () => {
  it('separates an AMD Ryzen processor from its integrated Radeon GPU', () => {
    const result = parseHardwareSpecs(
      'Processor AMD Ryzen 7 8845HS w/ Radeon 780M Graphics, 3801 MHz, 8 Core(s), 16 Logical Processor(s)',
    );

    expect(result.specs.cpu.displayValue).toBe('AMD Ryzen 7 8845HS');
    expect(result.specs.gpu.displayValue).toBe('AMD Radeon 780M Graphics');
    expect(result.specs.gpu.displayValue).not.toMatch(/MHz|Core|Processor/i);
  });

  it.each([
    ['Processor Intel Core i7-1360P with Intel Iris Xe Graphics', 'Intel Iris Xe Graphics'],
    ['Processor Intel Core i5-12400 with Intel UHD Graphics', 'Intel UHD Graphics'],
    ['Processor AMD Ryzen 7 8845HS with Radeon Graphics', 'AMD Radeon Graphics'],
  ])('extracts %s as %s without copying the processor line', (rawOcrText, expectedGpu) => {
    const result = parseHardwareSpecs(rawOcrText);

    expect(result.specs.gpu.displayValue).toBe(expectedGpu);
    expect(result.specs.gpu.displayValue).not.toContain('Processor');
  });

  it('leaves GPU blank when a processor line has no recognized graphics model', () => {
    const result = parseHardwareSpecs(
      'Processor AMD Ryzen 7 8845HS, 3801 MHz, 8 Core(s), 16 Logical Processor(s)',
    );

    expect(result.specs.cpu.displayValue).toBe('AMD Ryzen 7 8845HS');
    expect(result.specs.gpu.displayValue).toBe('');
  });
});
