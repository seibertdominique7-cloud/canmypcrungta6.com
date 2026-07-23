import 'server-only';

import type { LookupAddress } from 'node:dns';
import { lookup } from 'node:dns/promises';
import { request as requestHttp, type IncomingHttpHeaders } from 'node:http';
import { request as requestHttps } from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';

import type { AffiliateRetailer } from './affiliate-types';

const MAX_REDIRECTS = 4;
const MAX_URL_LENGTH = 4_096;
const TOTAL_TIMEOUT_MS = 12_000;
const REQUEST_TIMEOUT_MS = 6_000;
const MAX_JSON_LD_NODES = 500;

export const PRODUCT_HTML_SOFT_SCAN_BYTES = 512 * 1_024;
export const PRODUCT_HTML_MAX_SCAN_BYTES = 1_024 * 1_024;
export const AUTO_IMPORT_FALLBACK_MESSAGE = 'Automatic import could not retrieve this product. Enter the title and image manually.';
export const RETAILER_ONLY_IMPORT_MESSAGE = 'Retailer detected. Enter the product title and image manually.';
export const AMAZON_IMPORT_BLOCKED_MESSAGE = RETAILER_ONLY_IMPORT_MESSAGE;

const blockedIpv4Addresses = new BlockList();
const blockedIpv6Addresses = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blockedIpv4Addresses.addSubnet(network, prefix, 'ipv4');
for (const [network, prefix] of [
  ['::', 128], ['::1', 128], ['::ffff:0:0', 96], ['64:ff9b::', 96],
  ['100::', 64], ['2001:db8::', 32], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
] as const) blockedIpv6Addresses.addSubnet(network, prefix, 'ipv6');

export interface ImportedProductMetadata {
  title: string | null;
  imageUrl: string | null;
  retailer: AffiliateRetailer;
  blocked: boolean;
  message: string;
}

interface ExtractedMetadata {
  title: string | null;
  imageCandidates: string[];
}

interface HtmlScanDiagnostics {
  foundOgTitle: boolean;
  foundOgImage: boolean;
  foundJsonLdProduct: boolean;
}

interface ImportDebugLog extends HtmlScanDiagnostics {
  retailerDomain: string;
  contentType: string;
  bytesScanned: number;
  failureReason: string | null;
}

interface RemoteResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
  finalUrl: URL;
  bytesScanned: number;
  stoppedEarly: boolean;
  truncated: boolean;
}

interface RemoteRequestOptions {
  method: 'GET' | 'HEAD';
  maxBytes: number;
  headers?: Record<string, string>;
  deadline: number;
  stopWhen?: (body: Buffer) => boolean;
  truncateAtLimit?: boolean;
}

export class ProductMetadataImportError extends Error {
  constructor(message: string, public readonly status = 422, public readonly code = 'IMPORT_FAILED') {
    super(message);
    this.name = 'ProductMetadataImportError';
  }
}

export async function importProductMetadata(sourceUrl: string): Promise<ImportedProductMetadata> {
  const initialUrl = parsePublicHttpUrl(sourceUrl);
  const initialRetailer = detectRetailerFromUrl(initialUrl);
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;
  let response: RemoteResponse;

  try {
    response = await requestWithRedirects(initialUrl, {
      method: 'GET',
      maxBytes: PRODUCT_HTML_MAX_SCAN_BYTES,
      deadline,
      stopWhen: shouldStopProductHtmlScan,
      truncateAtLimit: true,
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9',
        'Accept-Language': 'en-US,en;q=0.8',
        'Accept-Encoding': 'identity',
        'User-Agent': 'CanMyPCRunGTA6-MetadataImporter/1.0',
      },
    });
  } catch (error) {
    developmentImportLog({
      retailerDomain: initialUrl.hostname,
      contentType: 'unavailable',
      bytesScanned: 0,
      foundOgTitle: false,
      foundOgImage: false,
      foundJsonLdProduct: false,
      failureReason: importFailureCode(error),
    });
    if (isSecurityImportError(error)) throw error;
    return initialRetailer === 'Amazon' ? amazonBlockedResult() : manualFallbackResult(initialRetailer);
  }

  const retailer = initialRetailer === 'Other' ? detectRetailerFromUrl(response.finalUrl) : initialRetailer;
  const contentType = headerValue(response.headers, 'content-type').toLowerCase();
  if (response.status < 200 || response.status >= 300) {
    developmentImportLog(emptyScanLog(response, contentType, `HTTP_${response.status}`));
    return retailer === 'Amazon' ? amazonBlockedResult() : manualFallbackResult(retailer);
  }

  if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    developmentImportLog(emptyScanLog(response, contentType, 'UNSUPPORTED_CONTENT'));
    return retailer === 'Amazon' ? amazonBlockedResult() : manualFallbackResult(retailer);
  }
  if (headerValue(response.headers, 'content-encoding') && headerValue(response.headers, 'content-encoding') !== 'identity') {
    developmentImportLog(emptyScanLog(response, contentType, 'UNSUPPORTED_ENCODING'));
    return retailer === 'Amazon' ? amazonBlockedResult() : manualFallbackResult(retailer);
  }

  const html = response.body.toString('utf8');
  const scan = inspectHtmlScan(html);
  if (retailer === 'Amazon' && looksLikeAmazonBlockPage(html)) {
    developmentImportLog(scanLog(response, contentType, scan, 'AMAZON_BLOCKED'));
    return amazonBlockedResult();
  }
  const extracted = extractProductMetadataFromHtml(html, response.finalUrl);
  const imageUrl = await firstValidatedImage(extracted.imageCandidates, deadline);
  const failureReason = extracted.title && imageUrl
    ? null
    : !extracted.title && !imageUrl && (response.truncated || response.bytesScanned >= PRODUCT_HTML_SOFT_SCAN_BYTES)
      ? 'SCAN_LIMIT_NO_METADATA'
      : !extracted.title && !imageUrl
        ? 'NO_METADATA'
        : !extracted.title
          ? 'TITLE_NOT_FOUND'
          : 'IMAGE_NOT_FOUND';

  developmentImportLog(scanLog(response, contentType, scan, failureReason));

  if (retailer === 'Amazon' && !extracted.title && !imageUrl) return amazonBlockedResult();
  if (!extracted.title && !imageUrl) return manualFallbackResult(retailer);

  return createImportedProductResult(retailer, extracted.title, imageUrl);
}

export function detectRetailerFromUrl(value: URL | string): AffiliateRetailer {
  let hostname: string;
  try {
    hostname = (value instanceof URL ? value : new URL(value)).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return 'Other';
  }

  if (hostname === 'amzn.to' || hostname === 'a.co' || hostname === 'amazon.com' || hostname.startsWith('amazon.') || hostname.includes('.amazon.')) return 'Amazon';
  if (hostname === 'bestbuy.com' || hostname.endsWith('.bestbuy.com')) return 'Best Buy';
  if (hostname === 'newegg.com' || hostname.endsWith('.newegg.com')) return 'Newegg';
  if (hostname === 'walmart.com' || hostname.endsWith('.walmart.com')) return 'Walmart';
  if (hostname === 'target.com' || hostname.endsWith('.target.com')) return 'Target';
  if (hostname === 'ebay.com' || hostname.startsWith('ebay.') || hostname.includes('.ebay.')) return 'eBay';
  if (hostname === 'microcenter.com' || hostname.endsWith('.microcenter.com')) return 'Micro Center';
  if (hostname === 'bhphotovideo.com' || hostname.endsWith('.bhphotovideo.com')) return 'B&H';
  return 'Other';
}

export function extractProductMetadataFromHtml(html: string, pageUrl: URL): ExtractedMetadata {
  const metadata = extractMetaTags(html);
  const product = extractJsonLdProduct(html);
  const title = firstValidProductTitle([
    metadata.get('property:og:title'),
    metadata.get('name:twitter:title'),
    metadata.get('property:twitter:title'),
    product?.name,
    ...retailerTitleElements(html),
    /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1],
  ], pageUrl);
  const imageCandidates = uniqueStrings([
    metadata.get('property:og:image'),
    metadata.get('property:og:image:url'),
    metadata.get('name:twitter:image'),
    metadata.get('name:twitter:image:src'),
    metadata.get('property:twitter:image'),
    metadata.get('property:twitter:image:src'),
    ...jsonLdImages(product?.image),
    ...fallbackImageSources(html),
  ].map((value) => resolveImageCandidate(value, pageUrl)).filter((value): value is string => Boolean(value)));
  return { title, imageCandidates };
}

export function shouldStopProductHtmlScan(body: Buffer | string) {
  const html = Buffer.isBuffer(body) ? body.toString('utf8') : body;
  const bytesScanned = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body);
  const extracted = extractProductMetadataFromHtml(html, new URL('https://metadata-scan.invalid/'));
  if (extracted.title && extracted.imageCandidates.length > 0) return true;
  return bytesScanned >= PRODUCT_HTML_SOFT_SCAN_BYTES
    && !extracted.title
    && extracted.imageCandidates.length === 0;
}

function inspectHtmlScan(html: string): HtmlScanDiagnostics {
  const metadata = extractMetaTags(html);
  return {
    foundOgTitle: Boolean(metadata.get('property:og:title')),
    foundOgImage: Boolean(metadata.get('property:og:image') || metadata.get('property:og:image:url')),
    foundJsonLdProduct: Boolean(extractJsonLdProduct(html)),
  };
}

export function parsePublicHttpUrl(value: string) {
  if (!value || value.length > MAX_URL_LENGTH || value !== value.trim()) {
    throw new ProductMetadataImportError('Enter a valid public http or https product URL.', 400, 'INVALID_URL');
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ProductMetadataImportError('Enter a valid public http or https product URL.', 400, 'INVALID_URL');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new ProductMetadataImportError('Only public http and https URLs without embedded credentials are supported.', 400, 'INVALID_URL');
  }
  const expectedPort = parsed.protocol === 'https:' ? '443' : '80';
  if (parsed.port && parsed.port !== expectedPort) {
    throw new ProductMetadataImportError('Product imports only support standard web ports.', 400, 'UNSAFE_PORT');
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!hostname || isBlockedHostname(hostname) || (isIP(hostname) > 0 && isBlockedIpAddress(hostname))) {
    throw new ProductMetadataImportError('Enter a public retailer URL. Local and private network addresses are blocked.', 400, 'PRIVATE_ADDRESS');
  }
  return parsed;
}

export function isBlockedIpAddress(address: string) {
  const family = isIP(address);
  return family === 4 ? blockedIpv4Addresses.check(address, 'ipv4') : family === 6 ? blockedIpv6Addresses.check(address, 'ipv6') : true;
}

async function requestWithRedirects(initialUrl: URL, options: RemoteRequestOptions): Promise<RemoteResponse> {
  let currentUrl = initialUrl;
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await requestPinned(currentUrl, options);
    if (![301, 302, 303, 307, 308].includes(response.status)) return { ...response, finalUrl: currentUrl };
    const location = headerValue(response.headers, 'location');
    if (!location) throw new ProductMetadataImportError('The retailer returned an invalid redirect.', 422, 'INVALID_REDIRECT');
    if (redirectCount === MAX_REDIRECTS) throw new ProductMetadataImportError('The retailer redirected too many times.', 422, 'TOO_MANY_REDIRECTS');
    currentUrl = parsePublicHttpUrl(new URL(location, currentUrl).toString());
  }
  throw new ProductMetadataImportError('The retailer redirected too many times.', 422, 'TOO_MANY_REDIRECTS');
}

async function requestPinned(url: URL, options: RemoteRequestOptions): Promise<RemoteResponse> {
  const remaining = options.deadline - Date.now();
  if (remaining <= 0) throw new ProductMetadataImportError('The retailer took too long to respond. Please enter details manually.', 504, 'TIMEOUT');
  const addresses = await publicAddresses(url.hostname.replace(/^\[|\]$/g, ''));
  const timeout = Math.min(remaining, REQUEST_TIMEOUT_MS);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const request = (url.protocol === 'https:' ? requestHttps : requestHttp)(url, {
      method: options.method,
      headers: options.headers,
      lookup: pinnedLookup(addresses),
      maxHeaderSize: 32_768,
    }, (response) => {
      const complete = (truncated: boolean, stoppedEarly: boolean, destroy: boolean) => {
        if (settled) return;
        settled = true;
        const body = Buffer.concat(chunks);
        if (destroy) response.destroy();
        resolve({
          status: response.statusCode ?? 0,
          headers: response.headers,
          body,
          finalUrl: url,
          bytesScanned: body.length,
          stoppedEarly,
          truncated,
        });
      };
      const declaredLength = Number(headerValue(response.headers, 'content-length'));
      if (options.method !== 'HEAD' && !options.truncateAtLimit && Number.isFinite(declaredLength) && declaredLength > options.maxBytes) {
        response.destroy();
        fail(new ProductMetadataImportError(AUTO_IMPORT_FALLBACK_MESSAGE, 413, 'RESPONSE_TOO_LARGE'));
        return;
      }
      response.on('data', (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        const remainingCapacity = options.maxBytes - totalBytes;
        if (buffer.length > remainingCapacity) {
          if (!options.truncateAtLimit) {
            response.destroy();
            fail(new ProductMetadataImportError(AUTO_IMPORT_FALLBACK_MESSAGE, 413, 'RESPONSE_TOO_LARGE'));
            return;
          }
          if (remainingCapacity > 0) chunks.push(buffer.subarray(0, remainingCapacity));
          totalBytes = options.maxBytes;
          complete(true, false, true);
          return;
        }
        totalBytes += buffer.length;
        chunks.push(buffer);
        const body = Buffer.concat(chunks);
        if (options.stopWhen?.(body)) complete(false, true, true);
        else if (options.truncateAtLimit && totalBytes >= options.maxBytes) complete(true, false, true);
      });
      response.on('end', () => complete(false, false, false));
      response.on('error', fail);
    });
    request.setTimeout(timeout, () => request.destroy(new ProductMetadataImportError('The retailer took too long to respond. Please enter details manually.', 504, 'TIMEOUT')));
    request.on('error', (error) => fail(error instanceof ProductMetadataImportError ? error : new ProductMetadataImportError('The retailer page could not be reached. Please enter details manually.', 422, 'NETWORK_ERROR')));
    request.end();
  });
}

async function publicAddresses(hostname: string) {
  let addresses: LookupAddress[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new ProductMetadataImportError('The retailer hostname could not be resolved.', 422, 'DNS_ERROR');
  }
  if (!addresses.length || addresses.some((item) => isBlockedIpAddress(item.address))) {
    throw new ProductMetadataImportError('The retailer URL resolves to a local or private network address and was blocked.', 400, 'PRIVATE_ADDRESS');
  }
  return addresses;
}

function pinnedLookup(addresses: LookupAddress[]): LookupFunction {
  return (_hostname, options, callback) => {
    const eligible = options.family === 4 || options.family === 6
      ? addresses.filter((item) => item.family === options.family)
      : addresses;
    if (!eligible.length) {
      const error = new Error('No permitted address is available.') as NodeJS.ErrnoException;
      error.code = 'ENOTFOUND';
      callback(error, '', 0);
      return;
    }
    if (options.all) callback(null, eligible);
    else callback(null, eligible[0].address, eligible[0].family);
  };
}

async function firstValidatedImage(candidates: string[], deadline: number) {
  for (const candidate of candidates.slice(0, 8)) {
    try {
      const url = parsePublicHttpUrl(candidate);
      if (url.protocol !== 'https:') continue;
      const head = await requestWithRedirects(url, { method: 'HEAD', maxBytes: 0, deadline, truncateAtLimit: true, headers: { Accept: 'image/*' } });
      if (head.status >= 200 && head.status < 400 && isImageContentType(headerValue(head.headers, 'content-type'))) return candidate;
      if ([400, 403, 405].includes(head.status) && looksLikeImageUrl(url)) return candidate;
    } catch {
      // Try the next metadata candidate; a bad image must not break title or retailer import.
    }
    if (Date.now() >= deadline) break;
  }
  return null;
}

function looksLikeImageUrl(url: URL) {
  return /\.(?:avif|gif|jpe?g|png|webp)$/i.test(url.pathname);
}

function extractMetaTags(html: string) {
  const values = new Map<string, string>();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = htmlAttributes(match[0]);
    const content = attributes.content;
    if (!content) continue;
    if (attributes.property) values.set(`property:${attributes.property.toLowerCase()}`, decodeHtml(content));
    if (attributes.name) values.set(`name:${attributes.name.toLowerCase()}`, decodeHtml(content));
  }
  return values;
}

function extractJsonLdProduct(html: string): Record<string, unknown> | null {
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1].trim()) as unknown;
      const queue: unknown[] = [parsed];
      let visited = 0;
      while (queue.length && visited < MAX_JSON_LD_NODES) {
        const value = queue.shift();
        visited += 1;
        if (Array.isArray(value)) { queue.push(...value.slice(0, MAX_JSON_LD_NODES - visited)); continue; }
        if (!value || typeof value !== 'object') continue;
        const record = value as Record<string, unknown>;
        const type = record['@type'];
        if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) return record;
        for (const child of Object.values(record)) if (child && typeof child === 'object') queue.push(child);
      }
    } catch {
      // Invalid structured data is ignored and normal metadata fallbacks remain available.
    }
  }
  return null;
}

function fallbackImageSources(html: string) {
  const scored: Array<{ source: string; score: number }> = [];
  for (const match of Array.from(html.matchAll(/<img\b[^>]*>/gi)).slice(0, 100)) {
    const attributes = htmlAttributes(match[0]);
    const source = attributes.src || attributes['data-src'] || attributes['data-original'];
    if (!source) continue;
    const description = `${attributes.id ?? ''} ${attributes.class ?? ''} ${attributes.itemprop ?? ''} ${attributes.alt ?? ''}`.toLowerCase();
    let score = 0;
    if (attributes.itemprop?.toLowerCase() === 'image') score += 100;
    if (/product|primary|main|hero/.test(description)) score += 30;
    if (/logo|icon|avatar|sprite/.test(description)) score -= 50;
    const width = Number(attributes.width);
    const height = Number(attributes.height);
    if (width >= 300 && height >= 300) score += 10;
    scored.push({ source, score });
  }
  return scored.sort((left, right) => right.score - left.score).map((item) => item.source);
}

function htmlAttributes(tag: string) {
  const attributes: Record<string, string> = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attributes;
}

const TITLE_RETAILER_LABELS = [
  'Amazon.com', 'Amazon', 'Best Buy', 'BestBuy.com', 'Walmart', 'Walmart.com',
  'Newegg', 'Newegg.com', 'Target', 'Target.com', 'eBay', 'eBay.com',
  'Micro Center', 'MicroCenter.com', 'B&H Photo Video', 'B&H', 'BHPhotoVideo.com',
] as const;

const GENERIC_TITLE_KEYS = new Set([
  'amazon', 'amazoncom', 'bestbuy', 'bestbuycom', 'walmart', 'walmartcom',
  'newegg', 'neweggcom', 'target', 'targetcom', 'ebay', 'ebaycom',
  'microcenter', 'microcentercom', 'bh', 'bhphotovideo', 'bhphotovideocom',
  'product', 'productdetails', 'electronics', 'onlineshopping', 'shop', 'home',
]);

const GENERIC_TITLE_WORDS = new Set([
  'amazon', 'best', 'buy', 'walmart', 'newegg', 'target', 'ebay', 'micro', 'center',
  'photo', 'video', 'product', 'products', 'details', 'electronics', 'computer',
  'computers', 'accessories', 'online', 'shopping', 'shop', 'store', 'home',
  'official', 'site', 'deals', 'sale', 'category', 'department', 'page', 'welcome',
]);

function retailerTitleElements(html: string) {
  const values: string[] = [];
  const amazonTitle = /<([a-z][\w:-]*)\b(?=[^>]*\bid\s*=\s*["']productTitle["'])[^>]*>([\s\S]*?)<\/\1>/i.exec(html)?.[2];
  if (amazonTitle) values.push(amazonTitle);

  for (const match of Array.from(html.matchAll(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi)).slice(0, 20)) {
    const attributes = htmlAttributes(`<h1 ${match[1]}>`);
    const selector = `${attributes.id ?? ''} ${attributes.class ?? ''}`.toLowerCase();
    const itemprop = attributes.itemprop?.toLowerCase();
    if (itemprop === 'name' || /product[-_\s]?(?:title|name)|pdp[-_\s]?title/.test(selector)) values.push(match[2]);
  }
  return uniqueStrings(values);
}

function firstValidProductTitle(values: Array<unknown>, pageUrl: URL) {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const normalized = normalizeProductTitle(value);
    if (isValidProductTitle(normalized, pageUrl)) return normalized;
  }
  return null;
}

export function normalizeProductTitle(value: string) {
  let normalized = decodeHtml(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  for (let pass = 0; pass < 3; pass += 1) {
    const before = normalized;
    for (const label of TITLE_RETAILER_LABELS) {
      const escaped = escapeRegExp(label);
      normalized = normalized
        .replace(new RegExp(`^${escaped}\\s*(?:[:|\\-\\u2013\\u2014]+)\\s*`, 'i'), '')
        .replace(new RegExp(`\\s*(?:[-|\\u2013\\u2014:]\\s*)${escaped}$`, 'i'), '');
    }
    normalized = normalized.replace(/\s*:\s*(?:electronics|computers?\s*&\s*accessories)\s*$/i, '').trim();
    if (normalized === before) break;
  }
  return normalized.replace(/^[\s|:\u2013\u2014-]+|[\s|:\u2013\u2014-]+$/g, '').replace(/\s+/g, ' ').trim().slice(0, 140).trim();
}

export function isValidProductTitle(title: string, pageUrl: URL) {
  if (!title) return false;
  const key = comparableTitle(title);
  const hostnameKey = comparableTitle(pageUrl.hostname.replace(/^www\./i, ''));
  const retailer = detectRetailerFromUrl(pageUrl);
  if (!key || GENERIC_TITLE_KEYS.has(key) || key === hostnameKey) return false;
  if (/^(?:online shopping|shop online|official site|welcome to)\b/i.test(title)) return false;
  if (retailer !== 'Other' && title.length <= retailer.length) return false;

  const words = title.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const meaningful = words.filter((word) => !GENERIC_TITLE_WORDS.has(word));
  const hasModelLikeWord = meaningful.some((word) => /\d/.test(word));
  return meaningful.length >= 2
    || hasModelLikeWord
    || (meaningful.length === 1 && meaningful[0].length >= 7);
}

function comparableTitle(value: string) {
  return value.toLowerCase().replace(/^www\./, '').replace(/[^a-z0-9]+/g, '');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function jsonLdImages(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(jsonLdImages);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return jsonLdImages(record.url ?? record.contentUrl);
  }
  return [];
}

function resolveImageCandidate(value: unknown, pageUrl: URL) {
  if (typeof value !== 'string' || !value.trim() || value.length > MAX_URL_LENGTH) return null;
  try {
    const resolved = new URL(decodeHtml(value.trim()), pageUrl);
    if (resolved.protocol !== 'https:' || resolved.username || resolved.password) return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function headerValue(headers: IncomingHttpHeaders, name: string) {
  const value = headers[name];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function isImageContentType(value: string) {
  return /^image\/(?:jpeg|png|webp|avif|gif)(?:;|$)/i.test(value.trim());
}

function isBlockedHostname(hostname: string) {
  return hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname.endsWith('.internal')
    || hostname.endsWith('.home')
    || hostname.endsWith('.lan');
}

function looksLikeAmazonBlockPage(html: string) {
  const sample = html.slice(0, 200_000).toLowerCase();
  return sample.includes('robot check') || sample.includes('automated access') || sample.includes('enter the characters you see below') || sample.includes('captcha');
}

function isSecurityImportError(error: unknown) {
  return error instanceof ProductMetadataImportError
    && ['INVALID_URL', 'PRIVATE_ADDRESS', 'UNSAFE_PORT'].includes(error.code);
}

function importFailureCode(error: unknown) {
  if (error instanceof ProductMetadataImportError) return error.code;
  return error instanceof Error ? error.name : 'UNKNOWN_ERROR';
}

function developmentImportLog(details: ImportDebugLog) {
  if (process.env.NODE_ENV !== 'production') console.info('[admin/catalog-import] Metadata scan', JSON.stringify(details));
}

function emptyScanLog(response: RemoteResponse, contentType: string, failureReason: string): ImportDebugLog {
  return {
    retailerDomain: response.finalUrl.hostname,
    contentType: contentType || 'unknown',
    bytesScanned: response.bytesScanned,
    foundOgTitle: false,
    foundOgImage: false,
    foundJsonLdProduct: false,
    failureReason,
  };
}

function scanLog(response: RemoteResponse, contentType: string, scan: HtmlScanDiagnostics, failureReason: string | null): ImportDebugLog {
  return {
    retailerDomain: response.finalUrl.hostname,
    contentType: contentType || 'unknown',
    bytesScanned: response.bytesScanned,
    ...scan,
    failureReason,
  };
}

function amazonBlockedResult(): ImportedProductMetadata {
  return createImportedProductResult('Amazon', null, null, true);
}

function manualFallbackResult(retailer: AffiliateRetailer): ImportedProductMetadata {
  return createImportedProductResult(retailer, null, null, true);
}

function importMessage(hasTitle: boolean, hasImage: boolean, hasRetailer: boolean) {
  if (hasTitle && hasImage) return hasRetailer ? 'Title, image, and retailer imported successfully.' : 'Title and image imported successfully.';
  if (hasTitle && hasRetailer) return 'Retailer and product title imported. Image was not found.';
  if (hasImage && hasRetailer) return 'Retailer and image imported. Enter the product title manually.';
  if (hasTitle) return 'Title imported. Image was not found.';
  if (hasImage) return 'Image imported. Title and retailer were not found.';
  return hasRetailer ? RETAILER_ONLY_IMPORT_MESSAGE : AUTO_IMPORT_FALLBACK_MESSAGE;
}

export function createImportedProductResult(
  retailer: AffiliateRetailer,
  title: string | null,
  imageUrl: string | null,
  blocked = false,
): ImportedProductMetadata {
  return {
    title,
    imageUrl,
    retailer,
    blocked,
    message: importMessage(Boolean(title), Boolean(imageUrl), retailer !== 'Other'),
  };
}

function decodeHtml(value: string) {
  const named: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] !== '#') return named[code.toLowerCase()] ?? entity;
    const numeric = code[1]?.toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
    return Number.isFinite(numeric) && numeric > 0 && numeric <= 0x10ffff ? String.fromCodePoint(numeric) : entity;
  });
}
