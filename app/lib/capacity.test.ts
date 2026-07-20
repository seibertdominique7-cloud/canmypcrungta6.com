import { describe, expect, it } from 'vitest';

import { parseCapacity } from './capacity';

describe('parseCapacity', () => {
  it.each([
    ['32.0 GB', '32.0 GB', 32],
    ['16.0 GB', '16.0 GB', 16],
    ['64.0 GB', '64.0 GB', 64],
    ['128.0 GB', '128.0 GB', 128],
    ['32 GB', '32 GB', 32],
    ['Installed RAM: 32.0 GB', '32.0 GB', 32],
    ['Memory 32,0 GB', '32,0 GB', 32],
    ['Memory 32 . 0 GB', '32 . 0 GB', 32],
    ['Storage 320 GB SSD', '320 GB', 320],
  ])('parses %s without joining digits across punctuation', (source, displayValue, numericGb) => {
    expect(parseCapacity(source)).toMatchObject({ displayValue, numericGb });
  });

  it.each([8, 16, 24, 32, 64, 96, 128, 192, 256])(
    'preserves the valid RAM capacity %i GB',
    (numericGb) => {
      expect(parseCapacity(`${numericGb} GB`)).toMatchObject({
        displayValue: `${numericGb} GB`,
        numericGb,
      });
    },
  );

  it.each([
    ['32.5 GB', 32.5],
    ['32,5 GB', 32.5],
  ])('preserves a legitimate decimal capacity in %s', (source, numericGb) => {
    expect(parseCapacity(source)?.numericGb).toBe(numericGb);
  });

  it.each([
    ['Total Physical Memory 32,768 MB', 32],
    ['Total Physical Memory 32 768 MB', 32],
    ['Capacity 1,024 GB', 1024],
    ['Capacity 1.5 TB', 1536],
  ])('handles grouped and locale-formatted capacity %s', (source, numericGb) => {
    expect(parseCapacity(source)?.numericGb).toBe(numericGb);
  });
});
