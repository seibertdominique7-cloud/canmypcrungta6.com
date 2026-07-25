import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { ScreenshotAnalyzer } from './ScreenshotAnalyzer';

describe('ScreenshotAnalyzer hydration markup', () => {
  it('renders deterministic initial upload markup without browser-only attributes', () => {
    const firstRender = renderToString(createElement(ScreenshotAnalyzer));
    const secondRender = renderToString(createElement(ScreenshotAnalyzer));

    expect(secondRender).toBe(firstRender);
    expect(firstRender).toContain('id="screenshot-upload-input"');
    expect(firstRender).toContain(
      'aria-label="Upload a screenshot of your system specs"',
    );
    expect(firstRender).not.toContain('fdprocessedid');
  });
});
