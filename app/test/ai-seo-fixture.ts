import type { GeneratedArticle } from '../lib/ai-seo-types';

export function articleFixture(): GeneratedArticle {
  return {
    seoTitle: 'Best GPU for GTA 6: Practical Upgrade Guide',
    slug: 'best-gpu-for-gta-6',
    metaDescription: 'Compare practical GTA 6 GPU upgrade options using estimated requirements and existing products.',
    excerpt: 'A practical guide to choosing a GTA 6 graphics card without unsupported performance claims.',
    focusKeyword: 'best GPU for GTA 6',
    secondaryKeywords: ['GTA 6 graphics card', 'GPU upgrade'],
    h1: 'Best GPU for GTA 6',
    introduction: ['The best choice depends on your current PC, budget, and target settings.'],
    keyTakeaways: ['Check your current GPU first.', 'Treat requirements as estimates.', 'Choose a balanced upgrade.'],
    sections: [
      { heading: 'What GTA 6 may require', paragraphs: ['Rockstar has not published official PC requirements.'], bullets: [], subsections: [] },
      { heading: 'How to compare GPUs', paragraphs: ['Compare complete model names and laptop variants carefully.'], bullets: ['Check power requirements.'], subsections: [] },
      { heading: 'Choosing an upgrade', paragraphs: ['Prioritize a relevant product that fits the rest of the system.'], bullets: [], subsections: [{ heading: 'Budget considerations', paragraphs: ['Avoid replacing components that already meet your needs.'], bullets: [] }] },
    ],
    comparisonTable: null,
    productRecommendations: [
      { productId: 'product-1', heading: 'A balanced GPU option', rationale: 'This existing catalog product is relevant to the guide.' },
    ],
    faq: [
      { question: 'Are GTA 6 PC requirements official?', answer: 'No. The current site requirements are explicitly estimated.' },
      { question: 'Should I upgrade now?', answer: 'Compare your current hardware and budget before buying.' },
      { question: 'Are laptop GPUs identical?', answer: 'No. Laptop and desktop variants may perform differently.' },
    ],
    conclusion: ['Use the checker and review current hardware before choosing an upgrade.'],
    affiliateDisclosure: 'We may earn a commission from qualifying purchases at no additional cost to you.',
    suggestedRelatedArticleIds: ['article-1'],
    estimatedReadingTime: 9,
    featuredImagePrompt: 'A clean editorial illustration of a modern graphics card beside a GTA-inspired PC setup, no logos or text.',
    openGraphTitle: 'Best GPU for GTA 6',
    openGraphDescription: 'A practical, estimate-aware GTA 6 GPU upgrade guide.',
  };
}
