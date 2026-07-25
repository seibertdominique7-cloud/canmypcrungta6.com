# AI SEO Publisher

AI SEO Publisher is an admin-only drafting tool at
`/admin/ai-seo-publisher`. It uses the existing Article CMS, article editor,
published-article relations, and Affiliate Products library. It never
publishes articles automatically.

## Environment setup

Add these private server variables to `.env.local` for local development and
to the deployment environment for production:

```dotenv
AI_SEO_PROVIDER=gemini
AI_SEO_MODEL=gemini-3.6-flash
AI_SEO_FALLBACK_MODEL=gemini-3.5-flash-lite
AI_SEO_TIMEOUT_MS=90000
GEMINI_API_KEY=your-private-api-key
```

`GEMINI_API_KEY` must never use a `NEXT_PUBLIC_` prefix. Restart `npm run dev`
after changing local environment variables. Redeploy after changing production
variables. The Gemini configuration uses Google's server-side `@google/genai`
SDK and validates structured JSON before saving a draft.
Transient Gemini `429` and `5xx` responses are retried with bounded exponential
backoff. If the primary model remains unavailable because of a `5xx` capacity
error, the publisher uses `AI_SEO_FALLBACK_MODEL` for that generation request.

OpenAI remains available by setting `AI_SEO_PROVIDER=openai`,
`AI_SEO_MODEL` to the chosen OpenAI model, and `OPENAI_API_KEY`. The provider
registry is isolated in `app/lib/ai-seo-provider.ts`, so future Anthropic or
other adapters can be added without moving generation logic into the page
component.

## Generate one article

1. Sign in to the private admin.
2. Open **AI SEO Publisher** in the Content navigation group.
3. Choose **Single Article**.
4. Enter the topic, keywords, article type, and target word count.
5. Optionally choose product categories, exact existing products, and published
   related articles.
6. Select **Generate**.
7. Use **Open in Editor** or **Preview** on the saved result.

**Regenerate** updates the same draft and creates a normal CMS revision.
Publishing remains available only in the existing article editor.

## Generate a batch

1. Open **Bulk Generator**.
2. Paste one topic per line, or select **Load 15 presets**.
3. Choose shared article type, word count, and product categories.
4. Select **Generate All**.
5. Review the independent Waiting, Generating, Saved, and Failed states.
6. Open each successful item in the existing editor.

The browser runs at most two generation requests concurrently. One provider
failure does not stop the other topics.

## Product references

The model receives a limited structured list of eligible products from the
existing Product table. The saved article stores managed blocks such as:

```html
<cms-affiliate product-id="EXISTING_PRODUCT_ID">...</cms-affiliate>
```

Affiliate URLs are never copied into generated article HTML. At render time,
the existing product card loads the current title, image, retailer, affiliate
URL, badge, and price text using that Product ID. Editing a catalog product
therefore updates every article that references it.

Only enabled products with usable HTTPS affiliate URLs are eligible. Manually
selected products are prioritized; category-only selection balances available
Budget, Best Value, and Premium tiers when possible.

## Review and publish

Generated JSON is validated before storage, generated HTML is sanitized, and
only existing Product IDs and published Article IDs are accepted. Featured
images remain unset. The generated image prompt is stored on the draft for use
with the existing media workflow.

Before publishing, verify all factual claims, requirement language, product
fit, internal links, metadata, affiliate disclosure, and featured imagery in
the existing CMS editor and preview.
