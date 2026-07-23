import { describe, expect, it } from 'vitest';

import { REQUIRED_PAGES, REQUIRED_PAGE_KEYS } from './required-pages';

describe('required public page seeds', () => {
  it('defines one editable seed for every stable public route', () => {
    expect(REQUIRED_PAGES.map((page) => page.key)).toEqual(REQUIRED_PAGE_KEYS);
    expect(new Set(REQUIRED_PAGES.map((page) => page.key)).size).toBe(8);
    expect(REQUIRED_PAGES.every((page) => page.body.startsWith('<!--cms-rich-text-->'))).toBe(true);
  });

  it('includes a launch-ready structured FAQ set with stable ordering', () => {
    const faq = REQUIRED_PAGES.find((page) => page.key === 'faq');
    expect(faq?.faqEntries?.length).toBeGreaterThanOrEqual(12);
    expect(new Set(faq?.faqEntries?.map((entry) => entry.question)).size).toBe(faq?.faqEntries?.length);
    expect(faq?.faqEntries?.map((entry) => entry.displayOrder)).toEqual(
      [...(faq?.faqEntries ?? [])].map((entry) => entry.displayOrder).sort((left, right) => left - right),
    );
  });
});
