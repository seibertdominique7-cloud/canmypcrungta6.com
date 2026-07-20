import { describe, expect, it } from 'vitest';

import { parseRichTextSegments, sanitizeRichTextBody, sanitizeRichTextHtml } from './rich-text';
import { affiliateProductHtml, affiliateProductIds, bodyToEditorHtml, richTextBody } from './rich-text-shared';

describe('rich text compatibility', () => {
  it('converts existing markdown without losing headings, links, lists, and affiliate blocks', () => {
    const html = bodyToEditorHtml('# Heading\n\nA **bold** [link](/articles/test).\n\n- One\n- Two\n\n:::affiliate product-1\n:::');
    expect(html).toContain('<h1>Heading</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<a href="/articles/test">link</a>');
    expect(html).toContain('<ul><li>One</li><li>Two</li></ul>');
    expect(affiliateProductIds(html)).toEqual(['product-1']);
  });

  it('preserves useful formatting while removing scripts and event handlers', () => {
    const clean = sanitizeRichTextHtml('<h2>Guide</h2><p><strong>Bold</strong> <em>Italic</em> <u>Underline</u> <s>Strike</s> <a href="https://example.com" onclick="steal()">Link</a> <a href="/articles/guide">Internal</a></p><script>alert(1)</script>');
    expect(clean).toContain('<h2>Guide</h2>');
    expect(clean).toContain('<strong>Bold</strong>');
    expect(clean).toContain('<em>Italic</em>');
    expect(clean).toContain('<u>Underline</u>');
    expect(clean).toContain('<s>Strike</s>');
    expect(clean).toContain('href="https://example.com"');
    expect(clean).toContain('href="/articles/guide"');
    expect(clean).not.toMatch(/onclick|script|alert/);
  });

  it('keeps affiliate blocks addressable through sanitization and rendering segments', () => {
    const body = richTextBody(`<p>Before</p>${affiliateProductHtml({ id: 'product-1', title: 'RTX 4070' })}<p>After</p>`);
    const sanitized = sanitizeRichTextBody(body);
    const segments = parseRichTextSegments(sanitized);
    expect(affiliateProductIds(sanitized)).toEqual(['product-1']);
    expect(segments.some((segment) => segment.kind === 'affiliate' && segment.productId === 'product-1')).toBe(true);
  });
});
