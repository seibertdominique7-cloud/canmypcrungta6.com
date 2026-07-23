import { describe, expect, it } from 'vitest';

import { withFallbackImageAlt } from './image-alt';

describe('withFallbackImageAlt', () => {
  it('adds fallback text when an image has no alt attribute', () => {
    expect(withFallbackImageAlt('<img src="/gpu.png">', 'GPU guide')).toBe(
      '<img alt="GPU guide" src="/gpu.png">',
    );
  });

  it('replaces an empty alt value without overwriting authored text', () => {
    expect(withFallbackImageAlt('<img src="/gpu.png" alt="">', 'GPU guide')).toBe(
      '<img src="/gpu.png" alt="GPU guide">',
    );
    expect(withFallbackImageAlt('<img alt="RTX 3070" src="/gpu.png">', 'GPU guide')).toBe(
      '<img alt="RTX 3070" src="/gpu.png">',
    );
  });

  it('escapes fallback text before placing it in HTML', () => {
    expect(withFallbackImageAlt('<img src="/gpu.png">', 'PCs & "GPUs"')).toContain(
      'alt="PCs &amp; &quot;GPUs&quot;"',
    );
  });
});
