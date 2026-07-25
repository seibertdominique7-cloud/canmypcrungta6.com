/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element -- Sanitized CMS links and media are runtime-authored. */
import { Fragment, type ReactNode } from 'react';

import { prisma } from '../../lib/prisma';
import { getSiteContentMap } from '../../lib/cms-data';
import { EmailSignup } from '../EmailSignup';
import { RecommendationProductCard } from '../RecommendationProductCard';
import { MerchProductCard } from '../merch/MerchProductCard';
import { ArticleMiddleAd, ArticleTopAd } from '../ads/AdPlacements';
import type { AffiliateProductRecord } from '../../lib/affiliate-types';
import { hasInlineAffiliateLinks, isRichTextBody } from '../../lib/rich-text-shared';
import { parseRichTextSegments } from '../../lib/rich-text';
import { withFallbackImageAlt } from '../../lib/image-alt';
import { getArticleMerchandise } from '../../lib/merch-data';
import type { MerchandiseProductRecord, MerchStoreSettings } from '../../lib/merch-types';

type CustomBlock = { kind: 'callout' | 'faq' | 'affiliate' | 'merchandise' | 'email-signup' | 'ad' | 'checker'; argument: string; text: string };
type ImageBlock = { kind: 'image'; url: string; alt: string; caption: string; align: 'left' | 'center' | 'right' | 'full'; size: 'small' | 'medium' | 'large' | 'full'; link: string };
type Block =
  | { kind: 'rich-html'; html: string }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph' | 'quote'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'table'; rows: string[][] }
  | { kind: 'rule' }
  | ImageBlock
  | CustomBlock;

export async function ContentRenderer({ body, articleAds = false, imageAltFallback = 'Content image' }: { body: string; articleAds?: boolean; imageAltFallback?: string }) {
  const blocks = parseContent(body);
  const productIds = blocks.filter((block): block is CustomBlock => isCustomBlock(block) && block.kind === 'affiliate').map((block) => block.argument).filter(Boolean);
  const merchandiseIds = blocks.filter((block): block is CustomBlock => isCustomBlock(block) && block.kind === 'merchandise').map((block) => block.argument).filter(Boolean);
  const [products, merchandise, siteContent] = await Promise.all([
    productIds.length ? prisma.product.findMany({ where: { id: { in: productIds }, enabled: true } }) : [],
    getArticleMerchandise(merchandiseIds),
    getSiteContentMap(),
  ]);
  const productMap = new Map(products.map((product) => [product.id, product]));
  const merchandiseMap = new Map(merchandise.products.map((product) => [product.id, product]));
  const hasAffiliate = hasInlineAffiliateLinks(body)
    || blocks.some((block) => isCustomBlock(block) && block.kind === 'affiliate' && productMap.has(block.argument));
  const hasMerchandise = blocks.some((block) => isCustomBlock(block) && block.kind === 'merchandise' && merchandiseMap.has(block.argument));
  const articleTopAfter = articleAds && blocks.length > 0 ? Math.min(1, blocks.length - 1) : -1;
  const articleMiddleAfter = articleAds && blocks.length >= 6
    ? Math.min(blocks.length - 2, Math.max(articleTopAfter + 2, Math.floor(blocks.length / 2)))
    : -1;

  return (
    <div className="content-renderer grid gap-4 text-base leading-7 text-slate-200">
      {blocks.map((block, index) => (
        <Fragment key={`content-block-${index}`}>
          {renderBlock(block, index, productMap, merchandiseMap, merchandise.settings, siteContent, imageAltFallback)}
          {index === articleTopAfter ? <ArticleTopAd className="my-5 w-full" /> : null}
          {index === articleMiddleAfter ? <ArticleMiddleAd className="my-5 w-full" /> : null}
        </Fragment>
      ))}
      {hasAffiliate ? <p className="mt-2 border-t border-white/10 pt-4 text-xs leading-5 text-slate-500">{siteContent.affiliate_disclosure || 'Disclosure: We may earn a commission when you purchase through links on this page, at no additional cost to you.'}</p> : null}
      {hasMerchandise ? <p className="text-xs leading-5 text-slate-500">{merchandise.settings.disclaimerText}</p> : null}
    </div>
  );
}

export function extractFaqItems(body: string) {
  return parseContent(body).filter((block): block is CustomBlock => isCustomBlock(block) && block.kind === 'faq').map((block) => faqParts(block.text)).filter((item) => item.question && item.answer);
}

export function estimateReadingTime(body: string) {
  const words = body.replace(/:::[\s\S]*?:::/g, ' ').replace(/<[^>]+>/g, ' ').match(/[\p{L}\p{N}']+/gu)?.length ?? 0;
  return Math.max(1, Math.ceil(words / 220));
}

function parseContent(body: string): Block[] {
  if (isRichTextBody(body)) {
    const richBlocks = parseRichTextSegments(body).flatMap<Block>((segment): Block[] => {
      if (segment.kind === 'html') return [{ kind: 'rich-html' as const, html: segment.html }];
      if (segment.kind === 'affiliate') return [{ kind: 'affiliate' as const, argument: segment.productId, text: '' }];
      if (segment.kind === 'merchandise') return [{ kind: 'merchandise' as const, argument: segment.productId, text: '' }];
      if (['callout', 'faq', 'email-signup', 'ad', 'checker'].includes(segment.blockKind)) {
        return [{ kind: segment.blockKind as CustomBlock['kind'], argument: segment.argument, text: segment.text }];
      }
      return [];
    });
    return moveEarlyMonetization(richBlocks);
  }
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    if (line.startsWith('```')) {
      const content: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) content.push(lines[index++]);
      blocks.push({ kind: 'code', text: content.join('\n') }); index += 1; continue;
    }
    if (line.startsWith(':::')) {
      const [kindValue, ...argumentParts] = line.slice(3).trim().split(/\s+/);
      const kind = kindValue as Block['kind'];
      const content: string[] = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== ':::') content.push(lines[index++]);
      if (kind === 'image') { const image = parseImageBlock(content); if (image) blocks.push(image); }
      else if (['callout', 'faq', 'affiliate', 'merchandise', 'email-signup', 'ad', 'checker'].includes(kind)) blocks.push({ kind: kind as 'callout', argument: argumentParts.join(' '), text: content.join('\n').trim() });
      index += 1; continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) { blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] }); index += 1; continue; }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { blocks.push({ kind: 'rule' }); index += 1; continue; }
    if (line.startsWith('> ')) { blocks.push({ kind: 'quote', text: line.slice(2) }); index += 1; continue; }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line); const items: string[] = [];
      while (index < lines.length && (ordered ? /^\s*\d+\.\s+/.test(lines[index]) : /^\s*[-*]\s+/.test(lines[index]))) items.push(lines[index++].replace(ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/, ''));
      blocks.push({ kind: 'list', ordered, items }); continue;
    }
    if (line.includes('|') && index + 1 < lines.length && /^\s*\|?\s*:?-+/.test(lines[index + 1])) {
      const rows = [splitTableRow(line)]; index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) rows.push(splitTableRow(lines[index++]));
      blocks.push({ kind: 'table', rows }); continue;
    }
    const paragraph = [line]; index += 1;
    while (index < lines.length && lines[index].trim() && !isSpecialLine(lines[index])) paragraph.push(lines[index++]);
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
  }
  return moveEarlyMonetization(blocks);
}

function moveEarlyMonetization(blocks: Block[]) {
  const isMonetized = (block: Block) => ['affiliate', 'merchandise', 'email-signup', 'ad'].includes(block.kind);
  const early = blocks.slice(0, 2).filter(isMonetized);
  if (!early.length) return blocks;
  return [...blocks.slice(0, 2).filter((block) => !isMonetized(block)), ...blocks.slice(2), ...early];
}

function renderBlock(
  block: Block,
  index: number,
  products: Map<string, Awaited<ReturnType<typeof prisma.product.findFirstOrThrow>>>,
  merchandise: Map<string, MerchandiseProductRecord>,
  merchSettings: MerchStoreSettings,
  siteContent: Record<string, string>,
  imageAltFallback: string,
) : ReactNode {
  const key = `${block.kind}-${index}`;
  if (block.kind === 'rich-html') {
    return (
      <div
        className="cms-rich-content grid gap-4 [&_a]:font-bold [&_a]:text-violet-300 [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-4 [&_blockquote]:border-violet-400 [&_blockquote]:bg-violet-500/10 [&_blockquote]:px-4 [&_blockquote]:py-2.5 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-black/40 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-emerald-200 [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-slate-500 [&_figure]:mx-auto [&_figure]:my-4 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-white sm:[&_h1]:text-3xl [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-white sm:[&_h2]:text-2xl [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-black [&_h3]:text-white sm:[&_h3]:text-xl [&_h4]:mt-3 [&_h4]:text-base [&_h4]:font-black [&_h4]:text-white sm:[&_h4]:text-lg [&_hr]:border-white/10 [&_img]:max-h-[680px] [&_img]:w-full [&_img]:rounded-2xl [&_img]:object-contain [&_li]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-white/10 [&_pre]:bg-black/50 [&_pre]:p-4 [&_pre_code]:bg-transparent [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-white/10 [&_td]:p-2.5 [&_th]:border [&_th]:border-white/10 [&_th]:bg-white/5 [&_th]:p-2.5 [&_ul]:list-disc [&_ul]:space-y-1.5"
        dangerouslySetInnerHTML={{ __html: withFallbackImageAlt(block.html, imageAltFallback) }}
        key={key}
      />
    );
  }
  if (block.kind === 'heading') {
    const Tag = `h${Math.min(6, Math.max(2, block.level + 1))}` as 'h2';
    return <Tag className="mt-4 text-balance text-xl font-black text-white sm:text-2xl" key={key}>{inline(block.text)}</Tag>;
  }
  if (block.kind === 'paragraph') return <p key={key}>{inline(block.text)}</p>;
  if (block.kind === 'quote') return <blockquote className="border-l-4 border-violet-400 bg-violet-500/10 px-5 py-3 italic text-slate-200" key={key}>{inline(block.text)}</blockquote>;
  if (block.kind === 'code') return <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/50 p-4 text-sm text-emerald-200" key={key}><code>{block.text}</code></pre>;
  if (block.kind === 'rule') return <hr className="border-white/10" key={key} />;
  if (block.kind === 'list') { const Tag = block.ordered ? 'ol' : 'ul'; return <Tag className={`grid gap-2 pl-6 ${block.ordered ? 'list-decimal' : 'list-disc'}`} key={key}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</Tag>; }
  if (block.kind === 'table') return <div className="overflow-x-auto" key={key}><table className="w-full border-collapse text-left text-sm"><thead><tr>{block.rows[0]?.map((cell, cellIndex) => <th className="border border-white/10 bg-white/5 p-3" key={cellIndex}>{inline(cell)}</th>)}</tr></thead><tbody>{block.rows.slice(1).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td className="border border-white/10 p-3" key={cellIndex}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>;
  if (block.kind === 'image') {
    const image = <img alt={block.alt || imageAltFallback} className="max-h-[720px] w-full rounded-2xl object-contain" loading="lazy" referrerPolicy="no-referrer" src={block.url} />;
    return <figure className={`my-5 ${imageSizeClass(block.size)} ${imageAlignClass(block.align)}`} key={key}>{block.link && safeUrl(block.link, false) ? <a href={block.link} rel={block.link.startsWith('/') ? undefined : 'noopener noreferrer'}>{image}</a> : image}{block.caption ? <figcaption className="mt-2 text-center text-sm leading-6 text-slate-500">{block.caption}</figcaption> : null}</figure>;
  }
  if (block.kind === 'callout') return <aside className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-5 text-cyan-50" key={key}>{inline(block.text)}</aside>;
  if (block.kind === 'faq') { const item = faqParts(block.text); return <details className="rounded-2xl border border-white/10 bg-white/[0.03] p-4" key={key}><summary className="cursor-pointer font-black text-white">{item.question}</summary><p className="mt-3 text-slate-300">{inline(item.answer)}</p></details>; }
  if (block.kind === 'email-signup') return <EmailSignup description={siteContent.email_signup_description} heading={siteContent.email_signup_heading} key={key} signupSource="article" variant="article" />;
  if (block.kind === 'checker') return <a className="inline-flex justify-center rounded-xl bg-violet-500 px-5 py-3 font-black text-white hover:bg-violet-400" href="/" key={key}>{block.text || 'Check whether your PC can run GTA VI'}</a>;
  if (block.kind === 'ad') return <div aria-label="Advertisement" className="min-h-20 rounded-xl border border-dashed border-white/10 p-3 text-center text-xs text-slate-600" data-ad-slot={block.argument} key={key}>Advertisement</div>;
  if (block.kind === 'affiliate') { const product = products.get(block.argument); return product ? <div className="max-w-xl" key={key}><RecommendationProductCard headingLevel="h2" product={toAffiliateProduct(product)} /></div> : null; }
  if (block.kind === 'merchandise') {
    const product = merchandise.get(block.argument);
    return product ? <div className="max-w-xl" key={key}><MerchProductCard openInNewTab={merchSettings.openLinksInNewTab} placement="article" product={product} /></div> : null;
  }
  return null;
}

function inline(text: string): ReactNode[] {
  const pattern = /(!?\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  return text.split(pattern).filter(Boolean).map((part, index) => {
    const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(part);
    if (image && safeUrl(image[2], true)) return <img alt={image[1]} className="my-4 max-h-[560px] w-full rounded-2xl object-contain" key={index} loading="lazy" referrerPolicy="no-referrer" src={image[2]} />;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link && safeUrl(link[2], false)) return <a className="font-bold text-violet-300 underline underline-offset-4" href={link[2]} key={index} rel={link[2].startsWith('/') ? undefined : 'noopener noreferrer'}>{link[1]}</a>;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part)) return <em key={index}>{part.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(part)) return <code className="rounded bg-black/40 px-1.5 py-0.5 text-emerald-200" key={index}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function safeUrl(value: string, image: boolean) { if (value.startsWith('/') && !value.startsWith('//')) return true; try { const url = new URL(value); return url.protocol === 'https:' && (image || !url.username); } catch { return false; } }
function splitTableRow(line: string) { return line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()); }
function isSpecialLine(line: string) { return /^(#{1,6})\s+/.test(line) || line.startsWith('```') || line.startsWith(':::') || line.startsWith('> ') || /^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line) || /^\s*(---|\*\*\*)\s*$/.test(line); }
function faqParts(text: string) { const lines = text.split('\n').map((line) => line.trim()).filter(Boolean); const question = (lines.find((line) => /^q:/i.test(line)) ?? lines[0] ?? '').replace(/^q:\s*/i, ''); const answer = (lines.find((line) => /^a:/i.test(line)) ?? lines.slice(1).join(' ')).replace(/^a:\s*/i, ''); return { question, answer }; }
function isCustomBlock(block: Block): block is CustomBlock { return 'argument' in block; }
function parseImageBlock(lines: string[]): ImageBlock | null { const fields = Object.fromEntries(lines.map((line) => { const separator = line.indexOf(':'); return separator < 0 ? ['', ''] : [line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim()]; }).filter(([key]) => key)); const url = fields.url ?? ''; if (!safeUrl(url, true)) return null; const align = ['left', 'center', 'right', 'full'].includes(fields.align) ? fields.align as ImageBlock['align'] : 'center'; const size = ['small', 'medium', 'large', 'full'].includes(fields.size) ? fields.size as ImageBlock['size'] : 'large'; return { kind: 'image', url, alt: fields.alt ?? '', caption: fields.caption ?? '', align, size, link: fields.link ?? '' }; }
function imageSizeClass(size: ImageBlock['size']) { if (size === 'small') return 'w-full max-w-sm'; if (size === 'medium') return 'w-full max-w-xl'; if (size === 'large') return 'w-full max-w-3xl'; return 'w-full max-w-none'; }
function imageAlignClass(align: ImageBlock['align']) { if (align === 'left') return 'mr-auto'; if (align === 'right') return 'ml-auto'; return 'mx-auto'; }
function toAffiliateProduct(product: Awaited<ReturnType<typeof prisma.product.findFirstOrThrow>>): AffiliateProductRecord { return { id: product.id, productId: product.id, sectionId: '', title: product.title, retailer: product.retailer as AffiliateProductRecord['retailer'], affiliateUrl: product.affiliateUrl, imageUrl: product.imageUrl, priceText: product.defaultPriceText, badge: 'Recommended', shortDescription: product.shortDescription, buttonText: 'View Product', componentType: product.componentType as AffiliateProductRecord['componentType'], platform: product.platform as AffiliateProductRecord['platform'], enabled: product.enabled, displayOrder: 0, createdAt: product.createdAt.toISOString(), updatedAt: product.updatedAt.toISOString() }; }
