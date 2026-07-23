import { describe, expect, it } from 'vitest';

import { parseRichTextSegments, sanitizeRichTextBody, sanitizeRichTextHtml } from './rich-text';
import { affiliateProductHtml, affiliateProductIds, bodyToEditorHtml, hasInlineAffiliateLinks, inlineAffiliateProductIds, replaceAffiliateProduct, richTextBody } from './rich-text-shared';

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

  it('preserves editor alignment and text-size metadata while sanitizing unsafe styles', () => {
    const clean = sanitizeRichTextHtml('<p data-align="center" data-text-size="large" style="color:red" onclick="steal()">Centered</p>');
    expect(clean).toContain('data-align="center"');
    expect(clean).toContain('data-text-size="large"');
    expect(clean).not.toMatch(/style|onclick/);
  });

  it('replaces an affiliate product block without changing surrounding article content', () => {
    const body = richTextBody(`<p>Before</p>${affiliateProductHtml({ id: 'product-1', title: 'RTX 3070' })}<p>After</p>`);
    const replaced = replaceAffiliateProduct(body, 'product-1', { id: 'product-2', title: 'RTX 4070' });
    expect(affiliateProductIds(replaced)).toEqual(['product-2']);
    expect(replaced).toContain('RTX 4070');
    expect(replaced).toContain('<p>Before</p>');
    expect(replaced).toContain('<p>After</p>');
  });

  it('preserves a product-library affiliate URL, metadata, rel attributes, and selected-text formatting', () => {
    const exactUrl = 'https://retailer.example/product?tag=gta6-20&sku=4060';
    const clean = sanitizeRichTextHtml(`<p><a href="${exactUrl}" target="_blank" rel="sponsored nofollow noopener" data-link-kind="affiliate" data-affiliate-product-id="product-4060"><strong><em>RTX 4060</em></strong></a></p>`);
    expect(clean).toContain(`href="${exactUrl.replace('&', '&amp;')}"`);
    expect(clean).toContain('target="_blank"');
    expect(clean).toContain('rel="sponsored nofollow noopener"');
    expect(clean).toContain('data-link-kind="affiliate"');
    expect(clean).toContain('data-affiliate-product-id="product-4060"');
    expect(clean).toContain('<strong><em>RTX 4060</em></strong>');
    expect(hasInlineAffiliateLinks(clean)).toBe(true);
    expect(inlineAffiliateProductIds(clean)).toEqual(['product-4060']);
  });

  it('respects manual new-tab and rel choices instead of forcing every external link into a new tab', () => {
    const sameTab = sanitizeRichTextHtml('<p><a href="https://example.com/deals">Deals</a></p>');
    const newTab = sanitizeRichTextHtml('<p><a href="https://example.com/deals" target="_blank" rel="nofollow">Deals</a></p>');
    expect(sameTab).not.toContain('target="_blank"');
    expect(sameTab).not.toContain('rel=');
    expect(newTab).toContain('target="_blank"');
    expect(newTab).toContain('rel="nofollow noopener"');
  });

  it('does not automatically mark an internal product-library link as sponsored', () => {
    const clean = sanitizeRichTextHtml('<p><a href="/deals/gpu" data-link-kind="affiliate" data-affiliate-product-id="product-1">GPU deal</a></p>');
    expect(clean).toContain('href="/deals/gpu"');
    expect(clean).not.toContain('rel="sponsored');
  });
});
