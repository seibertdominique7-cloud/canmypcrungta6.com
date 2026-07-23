import { describe, expect, it } from 'vitest';

import { validatePageInput } from './cms-validation';

const basePage = {
  title: 'Support FAQ', slug: 'support-faq', body: '', excerpt: '', featuredImage: null,
  status: 'published', pageTemplate: 'faq', navigationLabel: '', showInNavigation: false,
  navigationOrder: 0, enabled: true, showInFooter: true, footerLabel: 'FAQ', footerOrder: 10,
  footerGroup: 'Help', publishedAt: null, seoTitle: '', metaDescription: '', canonicalUrl: null,
  openGraphTitle: '', openGraphDescription: '', openGraphImage: null, twitterTitle: '',
  twitterDescription: '', twitterImage: null, robotsIndex: true, robotsFollow: true,
  focusKeyword: '', schemaType: 'FAQPage', noindex: false,
};

describe('CMS page validation', () => {
  it('preserves footer controls and structured FAQ entries', () => {
    const result = validatePageInput({
      ...basePage,
      faqEntries: [{ id: 'entry-1', question: 'Does this work?', answer: 'Yes, it does.', category: 'General', displayOrder: 10, enabled: true }],
    });
    expect(result.data?.footerGroup).toBe('Help');
    expect(result.data?.faqEntries[0]).toMatchObject({ question: 'Does this work?', answer: 'Yes, it does.', enabled: true });
  });

  it('rejects invalid footer groups and incomplete FAQ entries', () => {
    const result = validatePageInput({ ...basePage, footerGroup: 'Hidden', faqEntries: [{ question: '', answer: '' }] });
    expect(result.data).toBeNull();
    expect(result.fieldErrors.footerGroup).toBeTruthy();
    expect(result.fieldErrors['faqEntries.0.question']).toBeTruthy();
    expect(result.fieldErrors['faqEntries.0.answer']).toBeTruthy();
  });
});
