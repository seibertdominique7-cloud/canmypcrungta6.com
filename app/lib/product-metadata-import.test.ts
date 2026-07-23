import { describe, expect, it } from 'vitest';

import {
  AUTO_IMPORT_FALLBACK_MESSAGE,
  AMAZON_IMPORT_BLOCKED_MESSAGE,
  createImportedProductResult,
  detectRetailerFromUrl,
  extractProductMetadataFromHtml,
  isBlockedIpAddress,
  isValidProductTitle,
  normalizeProductTitle,
  parsePublicHttpUrl,
  PRODUCT_HTML_MAX_SCAN_BYTES,
  PRODUCT_HTML_SOFT_SCAN_BYTES,
  ProductMetadataImportError,
  RETAILER_ONLY_IMPORT_MESSAGE,
  shouldStopProductHtmlScan,
} from './product-metadata-import';

describe('product metadata import', () => {
  it.each([
    ['https://amazon.com/dp/example', 'Amazon'],
    ['https://amzn.to/example', 'Amazon'],
    ['https://www.bestbuy.com/site/example', 'Best Buy'],
    ['https://newegg.com/p/example', 'Newegg'],
    ['https://walmart.com/ip/example', 'Walmart'],
    ['https://target.com/p/example', 'Target'],
    ['https://ebay.com/itm/example', 'eBay'],
    ['https://microcenter.com/product/example', 'Micro Center'],
    ['https://bhphotovideo.com/c/product/example', 'B&H'],
    ['https://retailer.example/product', 'Other'],
  ])('detects the retailer for %s', (url, retailer) => {
    expect(detectRetailerFromUrl(url)).toBe(retailer);
  });

  it('prefers Open Graph metadata and resolves relative image URLs', () => {
    const metadata = extractProductMetadataFromHtml(`
      <html><head>
        <title>Fallback title</title>
        <meta name="twitter:title" content="Twitter title">
        <meta property="og:title" content="RTX &amp; Gaming">
        <meta name="twitter:image" content="https://cdn.example/twitter.jpg">
        <meta property="og:image" content="/images/product.webp">
      </head></html>
    `, new URL('https://shop.example/products/gpu'));
    expect(metadata.title).toBe('RTX & Gaming');
    expect(metadata.imageCandidates[0]).toBe('https://shop.example/images/product.webp');
  });

  it('uses Product JSON-LD before standard title and image fallbacks', () => {
    const metadata = extractProductMetadataFromHtml(`
      <html><head><title>Page title</title></head><body>
        <script type="application/ld+json">{
          "@context":"https://schema.org",
          "@type":"Product",
          "name":"JSON-LD Product",
          "image":["https://cdn.example/product.png"]
        }</script>
        <img src="https://cdn.example/fallback.png" class="main-product-image">
      </body></html>
    `, new URL('https://shop.example/product'));
    expect(metadata.title).toBe('JSON-LD Product');
    expect(metadata.imageCandidates[0]).toBe('https://cdn.example/product.png');
  });

  it('handles a page with only a title as a partial import', () => {
    const metadata = extractProductMetadataFromHtml(
      '<html><head><meta property="og:title" content="Title only product"></head></html>',
      new URL('https://shop.example/product'),
    );
    expect(metadata).toEqual({ title: 'Title only product', imageCandidates: [] });
  });

  it('handles a page with only an image as a partial import', () => {
    const metadata = extractProductMetadataFromHtml(
      '<html><head><meta property="og:image" content="https://cdn.example/product.jpg"></head></html>',
      new URL('https://shop.example/product'),
    );
    expect(metadata).toEqual({ title: null, imageCandidates: ['https://cdn.example/product.jpg'] });
  });

  it('uses the required manual-entry message when Amazon blocks import', () => {
    expect(AMAZON_IMPORT_BLOCKED_MESSAGE).toBe('Retailer detected. Enter the product title and image manually.');
    expect(AUTO_IMPORT_FALLBACK_MESSAGE).toBe('Automatic import could not retrieve this product. Enter the title and image manually.');
  });

  it('keeps Amazon separate from the title when no product title exists', () => {
    const extracted = extractProductMetadataFromHtml(`
      <meta property="og:title" content="Amazon">
      <title>Amazon.com</title>
    `, new URL('https://www.amazon.com/dp/example'));
    const result = createImportedProductResult('Amazon', extracted.title, null, true);
    expect(result.retailer).toBe('Amazon');
    expect(result.title).toBeNull();
    expect(result.message).toBe(RETAILER_ONLY_IMPORT_MESSAGE);
  });

  it('skips an invalid Amazon meta title and uses a valid JSON-LD product name', () => {
    const extracted = extractProductMetadataFromHtml(`
      <meta property="og:title" content="Amazon">
      <script type="application/ld+json">{
        "@type":"Product",
        "name":"Samsung 990 PRO SSD 2TB NVMe M.2"
      }</script>
    `, new URL('https://www.amazon.com/dp/example'));
    const result = createImportedProductResult('Amazon', extracted.title, null);
    expect(result.title).toBe('Samsung 990 PRO SSD 2TB NVMe M.2');
    expect(result.title).not.toBe('Amazon');
    expect(result.message).toBe('Retailer and product title imported. Image was not found.');
  });

  it('extracts an Amazon product title element when metadata is unavailable', () => {
    const extracted = extractProductMetadataFromHtml(
      '<span id="productTitle">Samsung 990 PRO SSD 2TB NVMe M.2</span>',
      new URL('https://www.amazon.com/dp/example'),
    );
    expect(extracted.title).toBe('Samsung 990 PRO SSD 2TB NVMe M.2');
  });

  it('rejects generic retailer, domain, and navigation titles', () => {
    const amazonUrl = new URL('https://www.amazon.com/dp/example');
    for (const title of [
      'Amazon', 'Amazon.com', 'Best Buy', 'BestBuy.com', 'Walmart', 'Walmart.com',
      'Newegg', 'Newegg.com', 'Target', 'Target.com', 'eBay', 'eBay.com',
      'Micro Center', 'MicroCenter.com', 'B&H', 'BHPhotoVideo.com',
      'Product', 'Electronics', 'Online Shopping', 'Shop', 'Home',
    ]) {
      expect(isValidProductTitle(normalizeProductTitle(title), amazonUrl)).toBe(false);
    }
  });

  it('removes retailer and category suffixes from a valid document title', () => {
    const extracted = extractProductMetadataFromHtml(
      '<title>Samsung 990 PRO SSD 2TB NVMe M.2 - Amazon.com</title>',
      new URL('https://www.amazon.com/dp/example'),
    );
    expect(extracted.title).toBe('Samsung 990 PRO SSD 2TB NVMe M.2');
    expect(normalizeProductTitle('Amazon.com: Samsung 990 PRO SSD 2TB NVMe M.2 : Computers & Accessories')).toBe('Samsung 990 PRO SSD 2TB NVMe M.2');
  });

  it('uses messages that reflect the fields actually imported', () => {
    expect(createImportedProductResult('Amazon', 'Samsung 990 PRO SSD 2TB', 'https://cdn.example/ssd.jpg').message)
      .toBe('Title, image, and retailer imported successfully.');
    expect(createImportedProductResult('Amazon', null, 'https://cdn.example/ssd.jpg').message)
      .toBe('Retailer and image imported. Enter the product title manually.');
    expect(createImportedProductResult('Amazon', null, null, true).message)
      .toBe('Retailer detected. Enter the product title and image manually.');
  });

  it('stops streaming as soon as both title and image metadata are available', () => {
    expect(shouldStopProductHtmlScan(`
      <head>
        <meta property="og:title" content="Samsung 990 PRO SSD 2TB">
        <meta property="og:image" content="https://cdn.example/product.jpg">
      </head>
      ${'x'.repeat(PRODUCT_HTML_MAX_SCAN_BYTES)}
    `)).toBe(true);
  });

  it('uses a 512 KB soft scan limit and a 1 MB hard limit', () => {
    expect(PRODUCT_HTML_SOFT_SCAN_BYTES).toBe(512 * 1_024);
    expect(PRODUCT_HTML_MAX_SCAN_BYTES).toBe(1_024 * 1_024);
    expect(shouldStopProductHtmlScan('x'.repeat(PRODUCT_HTML_SOFT_SCAN_BYTES))).toBe(true);
    expect(shouldStopProductHtmlScan(`<title>Partial product</title>${'x'.repeat(PRODUCT_HTML_SOFT_SCAN_BYTES)}`)).toBe(false);
  });

  it('blocks unsafe protocols, credentials, private hosts, and nonstandard ports', () => {
    for (const url of [
      'file:///etc/passwd',
      'http://localhost/product',
      'http://127.0.0.1/product',
      'https://user:password@example.com/product',
      'https://example.com:8443/product',
    ]) {
      expect(() => parsePublicHttpUrl(url)).toThrow(ProductMetadataImportError);
    }
  });

  it('recognizes private, link-local, mapped, and documentation IP ranges', () => {
    for (const address of ['10.0.0.1', '127.0.0.1', '169.254.169.254', '192.168.1.1', '203.0.113.10', '::1', 'fc00::1', '::ffff:127.0.0.1']) {
      expect(isBlockedIpAddress(address)).toBe(true);
    }
    expect(isBlockedIpAddress('8.8.8.8')).toBe(false);
    expect(isBlockedIpAddress('2606:4700:4700::1111')).toBe(false);
  });
});
