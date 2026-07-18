import { describe, expect, it } from 'vitest';

import { parseManualStorageCapacity } from './manual-storage';

describe('parseManualStorageCapacity', () => {
  it.each([
    ['512 GB', '512 GB', 512],
    ['1 TB', '1 TB', 1024],
    ['150 GB', '150 GB', 150],
  ])(
    'keeps %s visible while normalizing the numeric GB value internally',
    (source, displayValue, numericGb) => {
      expect(parseManualStorageCapacity(source)).toEqual({ displayValue, numericGb });
    },
  );

  it('rejects storage text without a supported unit', () => {
    expect(parseManualStorageCapacity('512')).toBeNull();
  });
});
