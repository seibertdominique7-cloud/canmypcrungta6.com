# Fourthwall storefront setup

The website integration is prepared but intentionally disabled by default. The site does not create Fourthwall products, process orders, host a cart, or call the Fourthwall API.

## 1. Create the Fourthwall storefront

1. Create or sign in to the Fourthwall account that will own the store.
2. Create the products and variants in Fourthwall.
3. Confirm product images, prices, shipping regions, return details, and published product URLs in Fourthwall.
4. Copy the public HTTPS storefront URL and each public product URL.

Fourthwall remains the system of record for inventory, checkout, payment, fulfillment, shipping, and returns.

## 2. Configure the website

1. Sign in to the private website admin.
2. Open `/admin/settings`.
3. In **Merch Store / Fourthwall**, enter the public Fourthwall store URL.
4. Review the navigation label, homepage copy, link behavior, announcement, social preview image, and fulfillment disclaimer.
5. Keep **Enable public store integration** off while preparing products.
6. Open `/admin/merchandise`.
7. Add products using their exact Fourthwall product URLs. Select images from the Media Library or add a validated image URL.
8. Keep incomplete products disabled. Choose where each complete product may appear: homepage, store page, and/or article picker.
9. Enable the store only after all links and public products have been verified.

No placeholder or seed merchandise is created.

## 3. Optional custom store subdomain

The planned hostname is `shop.canmypcrungta6.com`. Configure the custom domain in Fourthwall first, then follow the current DNS instructions shown by Fourthwall and your DNS provider.

Do not invent or copy generic DNS records. Fourthwall must provide the exact record type, host, and target for the account. DNS changes may take time to propagate. Verify the hostname loads over HTTPS before saving it as the public store URL.

The `/store` page on this website is a branded landing page. It links customers to Fourthwall; it is not a replacement for the Fourthwall storefront.

## 4. Article merchandise blocks

1. Enable **Allow merchandise blocks in articles** in `/admin/settings`.
2. Enable **Article picker** on the individual merchandise product.
3. In the article editor, choose **Add Merchandise** and select the product.

Article content saves only the merchandise product ID. Current title, image, price text, and URL are read from the merchandise library when the article renders. Deleted, disabled, incomplete, or article-hidden products render nothing publicly.

## 5. Launch checklist

- Store URL and every product URL use HTTPS and load without authentication.
- Fourthwall checkout, taxes, shipping, and returns are configured in Fourthwall.
- Product images and prices match the live Fourthwall listings.
- Desktop and mobile navigation show the configured Store label.
- `/store` displays only enabled, complete, store-visible products.
- Homepage merchandise appears only when both the store and homepage section are enabled.
- The fulfillment disclaimer is visible near merchandise.
- Announcement text is accurate and the dismiss button works.
- The configured social preview image is publicly reachable.
- `/store` appears in `sitemap.xml` only after the store is enabled.

To hide the integration immediately, disable **Enable public store integration**. This removes store navigation, announcement, homepage merchandise, public article merchandise, the `/store` page, and the store sitemap entry without deleting admin data.
