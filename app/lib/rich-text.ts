import sanitizeHtml from 'sanitize-html';

import { AFFILIATE_LINK_REL, isRichTextBody, richTextBody, richTextHtml } from './rich-text-shared';

const allowedTags = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'small', 'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'a', 'table', 'thead', 'tbody',
  'tr', 'th', 'td', 'figure', 'figcaption', 'img', 'div', 'span', 'cms-affiliate', 'cms-block',
];

export function sanitizeRichTextHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      '*': ['data-align', 'data-text-size'],
      a: ['href', 'title', 'target', 'rel', 'data-link-kind', 'data-affiliate-product-id'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      figure: ['data-cms-image', 'data-align', 'data-size', 'contenteditable'],
      table: ['summary'], th: ['colspan', 'rowspan', 'scope'], td: ['colspan', 'rowspan'],
      'cms-affiliate': ['product-id', 'contenteditable'],
      'cms-block': ['kind', 'argument', 'contenteditable'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attributes) => {
        const affiliate = attributes['data-link-kind'] === 'affiliate' && /^https?:\/\//i.test(attributes.href ?? '');
        const target = attributes.target === '_blank' ? '_blank' : undefined;
        const rel = affiliate ? AFFILIATE_LINK_REL : normalizeRel(attributes.rel, Boolean(target));
        const attribs = { ...attributes };
        if (target) attribs.target = target; else delete attribs.target;
        if (rel) attribs.rel = rel; else delete attribs.rel;
        return { tagName: 'a', attribs };
      },
      img: (_tagName, attributes) => ({ tagName: 'img', attribs: { ...attributes, loading: 'lazy' } }),
    },
  });
}

function normalizeRel(value: string | undefined, opensNewTab: boolean) {
  const allowed = new Set(['sponsored', 'nofollow', 'noopener', 'noreferrer']);
  const tokens = (value ?? '').toLowerCase().split(/\s+/).filter((token) => allowed.has(token));
  if (opensNewTab && !tokens.includes('noopener')) tokens.push('noopener');
  return Array.from(new Set(tokens)).join(' ');
}

export function sanitizeRichTextBody(body: string) {
  if (!isRichTextBody(body)) return body;
  return richTextBody(sanitizeRichTextHtml(richTextHtml(body)));
}

export type RichTextSegment =
  | { kind: 'html'; html: string }
  | { kind: 'affiliate'; productId: string }
  | { kind: 'custom'; blockKind: string; argument: string; text: string };

export function parseRichTextSegments(body: string): RichTextSegment[] {
  const html = sanitizeRichTextHtml(richTextHtml(body));
  const pattern = /<(cms-affiliate|cms-block)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  const segments: RichTextSegment[] = [];
  let offset = 0;
  for (const match of html.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > offset) segments.push({ kind: 'html', html: html.slice(offset, index) });
    const attributes = match[2];
    if (match[1].toLowerCase() === 'cms-affiliate') {
      segments.push({ kind: 'affiliate', productId: attribute(attributes, 'product-id') });
    } else {
      segments.push({ kind: 'custom', blockKind: attribute(attributes, 'kind'), argument: attribute(attributes, 'argument'), text: plainText(match[3]) });
    }
    offset = index + match[0].length;
  }
  if (offset < html.length) segments.push({ kind: 'html', html: html.slice(offset) });
  return segments.filter((segment) => segment.kind !== 'html' || segment.html.trim());
}

function attribute(source: string, name: string) {
  const match = new RegExp(`\\b${name}=["']([^"']*)["']`, 'i').exec(source);
  return decodeEntities(match?.[1] ?? '');
}

function plainText(html: string) {
  return decodeEntities(sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })).trim();
}

function decodeEntities(value: string) {
  return value
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
