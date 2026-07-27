-- Add a reusable catalog without deleting or rewriting the legacy
-- AffiliateProduct rows. The old table remains a rollback source.
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "retailer" TEXT NOT NULL DEFAULT 'Other',
    "affiliateUrl" TEXT NOT NULL,
    "defaultPriceText" TEXT NOT NULL DEFAULT 'Check current price',
    "platform" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "RecommendationAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "badge" TEXT NOT NULL DEFAULT 'None',
    "buttonText" TEXT NOT NULL DEFAULT 'View Product',
    "overridePriceText" TEXT,
    "overrideDescription" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecommendationAssignment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecommendationAssignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "RecommendationSection" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Product_canonicalName_idx" ON "Product"("canonicalName");
CREATE INDEX "Product_componentType_enabled_idx" ON "Product"("componentType", "enabled");
CREATE INDEX "Product_retailer_enabled_idx" ON "Product"("retailer", "enabled");
CREATE INDEX "RecommendationAssignment_sectionId_enabled_displayOrder_idx" ON "RecommendationAssignment"("sectionId", "enabled", "displayOrder");
CREATE INDEX "RecommendationAssignment_productId_enabled_idx" ON "RecommendationAssignment"("productId", "enabled");

-- Deduplicate only exact affiliate URLs paired with the same normalized title.
-- The first matching legacy row supplies product copy. Product enabled status is
-- true when any exact-match source row was enabled. Uncertain matches stay apart.
INSERT INTO "Product" (
    "id", "title", "canonicalName", "componentType", "shortDescription",
    "imageUrl", "retailer", "affiliateUrl", "defaultPriceText", "platform",
    "enabled", "createdAt", "updatedAt"
)
SELECT
    source."id",
    source."title",
    lower(trim(source."title")),
    CASE source."componentType"
        WHEN 'Prebuilt PC' THEN 'Prebuilt Desktop'
        WHEN 'Game Purchase' THEN 'Game'
        ELSE source."componentType"
    END,
    source."shortDescription",
    source."imageUrl",
    source."retailer",
    source."affiliateUrl",
    source."priceText",
    source."platform",
    CASE WHEN EXISTS (
        SELECT 1 FROM "AffiliateProduct" AS enabled_source
        WHERE lower(trim(enabled_source."title")) = lower(trim(source."title"))
          AND enabled_source."affiliateUrl" = source."affiliateUrl"
          AND enabled_source."enabled" = true
    ) THEN true ELSE false END,
    source."createdAt",
    source."updatedAt"
FROM "AffiliateProduct" AS source
WHERE source.rowid = (
    SELECT MIN(candidate.rowid)
    FROM "AffiliateProduct" AS candidate
    WHERE lower(trim(candidate."title")) = lower(trim(source."title"))
      AND candidate."affiliateUrl" = source."affiliateUrl"
);

-- Every legacy placement becomes an assignment. Assignment-level presentation
-- and enabled state are retained exactly; product copy stays reusable.
INSERT INTO "RecommendationAssignment" (
    "id", "productId", "sectionId", "badge", "buttonText",
    "overridePriceText", "overrideDescription", "enabled", "displayOrder",
    "createdAt", "updatedAt"
)
SELECT
    'assignment-' || source."id",
    catalog."id",
    source."sectionId",
    source."badge",
    source."buttonText",
    CASE WHEN source."priceText" <> catalog."defaultPriceText" THEN source."priceText" ELSE NULL END,
    CASE WHEN source."shortDescription" <> catalog."shortDescription" THEN source."shortDescription" ELSE NULL END,
    source."enabled",
    source."displayOrder",
    source."createdAt",
    source."updatedAt"
FROM "AffiliateProduct" AS source
JOIN "Product" AS catalog
  ON catalog."canonicalName" = lower(trim(source."title"))
 AND catalog."affiliateUrl" = source."affiliateUrl";
