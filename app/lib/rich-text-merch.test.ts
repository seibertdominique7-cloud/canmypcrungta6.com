import { describe, expect, it } from 'vitest';

import { parseRichTextSegments, sanitizeRichTextBody } from './rich-text';
import {
  merchandiseProductHtml,
  merchandiseProductIds,
  removeMerchandiseProduct,
  richTextBody,
} from './rich-text-shared';

describe('managed merchandise article blocks', () => {
  it('preserves and parses a merchandise product reference', () => {
    const body = richTextBody(`<p>Intro</p>${merchandiseProductHtml({ id: 'merch-123', title: 'Launch Tee' })}`);
    const sanitized = sanitizeRichTextBody(body);
    expect(merchandiseProductIds(sanitized)).toEqual(['merch-123']);
    expect(parseRichTextSegments(sanitized)).toContainEqual({
      kind: 'merchandise',
      productId: 'merch-123',
    });
  });

  it('removes a managed merchandise block without changing adjacent text', () => {
    const body = richTextBody(`<p>Before</p>${merchandiseProductHtml({ id: 'merch-123', title: 'Launch Tee' })}<p>After</p>`);
    const result = removeMerchandiseProduct(body, 'merch-123');
    expect(result).toContain('<p>Before</p>');
    expect(result).toContain('<p>After</p>');
    expect(result).not.toContain('cms-merch');
  });

  it('strips unsafe attributes from merchandise blocks', () => {
    const body = richTextBody('<cms-merch product-id="merch-123" onclick="alert(1)" contenteditable="false">Launch Tee</cms-merch>');
    const sanitized = sanitizeRichTextBody(body);
    expect(sanitized).toContain('product-id="merch-123"');
    expect(sanitized).not.toContain('onclick');
  });
});
