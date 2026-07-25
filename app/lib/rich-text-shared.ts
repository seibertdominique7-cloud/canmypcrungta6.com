export const RICH_TEXT_PREFIX = '<!--cms-rich-text-->';

export interface RichTextProductSummary {
  id: string;
  title: string;
  enabled: boolean;
  retailer: string;
  affiliateUrl: string;
  imageUrl: string | null;
  priceText: string;
  badge: string;
  shortDescription: string;
  componentType: string;
}

export const AFFILIATE_LINK_REL = 'sponsored nofollow noopener';

export function hasInlineAffiliateLinks(body: string) {
  return /<a\b[^>]*\bdata-link-kind=["']affiliate["'][^>]*>/i.test(body);
}

export function inlineAffiliateProductIds(body: string) {
  const ids: string[] = [];
  for (const match of body.matchAll(/<a\b[^>]*\bdata-affiliate-product-id=["']([^"']+)["'][^>]*>/gi)) ids.push(match[1]);
  return Array.from(new Set(ids));
}

export function isRichTextBody(body: string) {
  const trimmed = body.trim();
  return trimmed.startsWith(RICH_TEXT_PREFIX) || /^<(?:p|h[1-4]|ul|ol|blockquote|pre|table|figure|cms-)/i.test(trimmed);
}

export function richTextBody(html: string) {
  return `${RICH_TEXT_PREFIX}\n${html.trim()}`;
}

export function richTextHtml(body: string) {
  const trimmed = body.trim();
  return trimmed.startsWith(RICH_TEXT_PREFIX)
    ? trimmed.slice(RICH_TEXT_PREFIX.length).trim()
    : trimmed;
}

export function bodyToEditorHtml(body: string) {
  if (!body.trim()) return '<p><br></p>';
  return isRichTextBody(body) ? richTextHtml(body) : legacyMarkdownToHtml(body);
}

export function affiliateProductIds(body: string) {
  const ids: string[] = [];
  for (const match of body.matchAll(/<cms-affiliate\b[^>]*\bproduct-id=["']([^"']+)["'][^>]*>[\s\S]*?<\/cms-affiliate>/gi)) ids.push(match[1]);
  for (const match of body.matchAll(/:::affiliate\s+([^\s]+)\s*\n[\s\S]*?\n:::/g)) ids.push(match[1]);
  return Array.from(new Set(ids));
}

export function merchandiseProductIds(body: string) {
  const ids: string[] = [];
  for (const match of body.matchAll(/<cms-merch\b[^>]*\bproduct-id=["']([^"']+)["'][^>]*>[\s\S]*?<\/cms-merch>/gi)) ids.push(match[1]);
  for (const match of body.matchAll(/:::merchandise\s+([^\s]+)\s*\n[\s\S]*?\n:::/g)) ids.push(match[1]);
  return Array.from(new Set(ids));
}

export function affiliateProductHtml(product: Pick<RichTextProductSummary, 'id' | 'title'>) {
  return `<cms-affiliate product-id="${escapeAttribute(product.id)}" contenteditable="false"><strong>Affiliate product</strong><span>${escapeHtml(product.title)}</span><small>Managed product block</small></cms-affiliate><p><br></p>`;
}

export function merchandiseProductHtml(product: { id: string; title: string }) {
  return `<cms-merch product-id="${escapeAttribute(product.id)}" contenteditable="false"><strong>Merchandise</strong><span>${escapeHtml(product.title)}</span><small>Managed merchandise block</small></cms-merch><p><br></p>`;
}

export function replaceMerchandiseProduct(
  body: string,
  productId: string,
  product: { id: string; title: string },
) {
  const escapedId = escapeRegExp(productId);
  const replacement = merchandiseProductHtml(product).replace(/<p><br><\/p>$/, '');
  const nextHtml = bodyToEditorHtml(body).replace(
    new RegExp(`<cms-merch\\b[^>]*\\bproduct-id=["']${escapedId}["'][^>]*>[\\s\\S]*?<\\/cms-merch>`, 'i'),
    replacement,
  );
  return richTextBody(nextHtml);
}

export function removeMerchandiseProduct(body: string, productId: string) {
  const escapedId = escapeRegExp(productId);
  return body
    .replace(new RegExp(`<cms-merch\\b[^>]*\\bproduct-id=["']${escapedId}["'][^>]*>[\\s\\S]*?<\\/cms-merch>\\s*(?:<p><br\\s*\\/?><\\/p>)?`, 'i'), '')
    .replace(new RegExp(`:::merchandise\\s+${escapedId}\\s*\\n[\\s\\S]*?\\n:::\\s*`, 'i'), '');
}

export function replaceAffiliateProduct(body: string, productId: string, product: Pick<RichTextProductSummary, 'id' | 'title'>) {
  const escapedId = escapeRegExp(productId);
  const replacement = affiliateProductHtml(product).replace(/<p><br><\/p>$/, '');
  const editorHtml = bodyToEditorHtml(body);
  const nextHtml = editorHtml.replace(
    new RegExp(`<cms-affiliate\\b[^>]*\\bproduct-id=["']${escapedId}["'][^>]*>[\\s\\S]*?<\\/cms-affiliate>`, 'i'),
    replacement,
  );
  return richTextBody(nextHtml);
}

export function removeAffiliateProduct(body: string, productId: string) {
  const escapedId = escapeRegExp(productId);
  return body
    .replace(new RegExp(`<cms-affiliate\\b[^>]*\\bproduct-id=["']${escapedId}["'][^>]*>[\\s\\S]*?<\\/cms-affiliate>\\s*(?:<p><br\\s*\\/?><\\/p>)?`, 'i'), '')
    .replace(new RegExp(`:::affiliate\\s+${escapedId}\\s*\\n[\\s\\S]*?\\n:::\\s*`, 'i'), '');
}

export function imageHtml(url: string, options: { alt: string; caption: string; align: string; size: string; link: string }) {
  const image = `<img alt="${escapeAttribute(options.alt)}" loading="lazy" src="${escapeAttribute(url)}">`;
  const linked = options.link ? `<a href="${escapeAttribute(options.link)}">${image}</a>` : image;
  return `<figure data-cms-image="true" data-align="${escapeAttribute(options.align)}" data-size="${escapeAttribute(options.size)}" contenteditable="false">${linked}${options.caption ? `<figcaption>${escapeHtml(options.caption)}</figcaption>` : ''}</figure><p><br></p>`;
}

export function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeAttribute(value: string) {
  return escapeHtml(value.replace(/[\r\n]+/g, ' ').trim());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function legacyMarkdownToHtml(body: string) {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const html: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    if (line.startsWith('```')) {
      const code: string[] = []; index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) code.push(lines[index++]);
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`); index += 1; continue;
    }
    if (line.startsWith(':::')) {
      const [kind, ...argument] = line.slice(3).trim().split(/\s+/); const content: string[] = []; index += 1;
      while (index < lines.length && lines[index].trim() !== ':::') content.push(lines[index++]);
      html.push(legacyDirective(kind, argument.join(' '), content)); index += 1; continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) { const level = Math.min(4, heading[1].length); html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`); index += 1; continue; }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { html.push('<hr>'); index += 1; continue; }
    if (line.startsWith('> ')) { html.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`); index += 1; continue; }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line); const items: string[] = [];
      while (index < lines.length && (ordered ? /^\s*\d+\.\s+/.test(lines[index]) : /^\s*[-*]\s+/.test(lines[index]))) items.push(lines[index++].replace(ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/, ''));
      const tag = ordered ? 'ol' : 'ul'; html.push(`<${tag}>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</${tag}>`); continue;
    }
    if (line.includes('|') && index + 1 < lines.length && /^\s*\|?\s*:?-+/.test(lines[index + 1])) {
      const rows = [tableRow(line)]; index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) rows.push(tableRow(lines[index++]));
      html.push(`<table><thead><tr>${rows[0].map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`); continue;
    }
    const paragraph = [line]; index += 1;
    while (index < lines.length && lines[index].trim() && !isMarkdownBlock(lines[index])) paragraph.push(lines[index++]);
    html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
  }
  return html.join('\n') || '<p><br></p>';
}

function legacyDirective(kind: string, argument: string, lines: string[]) {
  if (kind === 'affiliate') return affiliateProductHtml({ id: argument, title: 'Selected affiliate product' });
  if (kind === 'merchandise') return merchandiseProductHtml({ id: argument, title: 'Selected merchandise product' });
  if (kind === 'image') {
    const fields = Object.fromEntries(lines.map((line) => { const separator = line.indexOf(':'); return separator < 0 ? ['', ''] : [line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim()]; }));
    return imageHtml(fields.url ?? '', { alt: fields.alt ?? '', caption: fields.caption ?? '', align: fields.align ?? 'center', size: fields.size ?? 'large', link: fields.link ?? '' });
  }
  const supported = ['callout', 'faq', 'email-signup', 'ad', 'checker'];
  if (!supported.includes(kind)) return `<p>${escapeHtml(lines.join(' '))}</p>`;
  return `<cms-block kind="${escapeAttribute(kind)}" argument="${escapeAttribute(argument)}" contenteditable="false"><strong>${escapeHtml(kind.replace('-', ' '))}</strong><span>${escapeHtml(lines.join('\n'))}</span></cms-block><p><br></p>`;
}

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function tableRow(line: string) { return line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()); }
function isMarkdownBlock(line: string) { return /^(#{1,6})\s+/.test(line) || line.startsWith('```') || line.startsWith(':::') || line.startsWith('> ') || /^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line) || /^\s*(---|\*\*\*)\s*$/.test(line); }
