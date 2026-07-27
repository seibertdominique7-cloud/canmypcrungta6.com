-- CreateTable
CREATE TABLE "RecommendationSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "maxProducts" INTEGER NOT NULL DEFAULT 3,
    "collapsedByDefault" BOOLEAN NOT NULL DEFAULT false,
    "layout" TEXT NOT NULL DEFAULT 'grid',
    "purpose" TEXT NOT NULL DEFAULT 'GENERAL',
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecommendationSection_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "RecommendationScenario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AffiliateProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "retailer" TEXT NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "priceText" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "buttonText" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "platform" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "legacySourceType" TEXT,
    "legacySourceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AffiliateProduct_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "RecommendationSection" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RecommendationSection_scenarioId_enabled_displayOrder_idx" ON "RecommendationSection"("scenarioId", "enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "AffiliateProduct_sectionId_enabled_displayOrder_idx" ON "AffiliateProduct"("sectionId", "enabled", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateProduct_legacySourceType_legacySourceId_sectionId_key" ON "AffiliateProduct"("legacySourceType", "legacySourceId", "sectionId");

-- Create the first editable section for every existing result scenario. The
-- deterministic IDs are also used by the seed, so rerunning the seed is safe.
INSERT INTO "RecommendationSection" (
    "id", "scenarioId", "title", "description", "enabled", "displayOrder",
    "maxProducts", "collapsedByDefault", "layout", "purpose", "isCore",
    "createdAt", "updatedAt"
)
SELECT
    CASE "code"
        WHEN 'PASS_RECOMMENDED' THEN 'section-pass-recommended-recommended-accessories'
        WHEN 'PASS_MINIMUM' THEN 'section-pass-minimum-recommended-upgrades'
        WHEN 'FAIL_GPU' THEN 'section-fail-gpu-gpu-upgrades'
        WHEN 'FAIL_CPU' THEN 'section-fail-cpu-cpu-upgrades'
        WHEN 'FAIL_RAM' THEN 'section-fail-ram-ram-upgrades'
        WHEN 'FAIL_STORAGE' THEN 'section-fail-storage-storage-upgrades'
        WHEN 'FAIL_CPU_GPU' THEN 'section-fail-cpu-gpu-cpu-gpu-upgrades'
        WHEN 'FAIL_GPU_RAM' THEN 'section-fail-gpu-ram-gpu-ram-upgrades'
        WHEN 'FAIL_CPU_RAM' THEN 'section-fail-cpu-ram-cpu-ram-upgrades'
        WHEN 'FAIL_MULTIPLE' THEN 'section-fail-multiple-complete-gaming-pcs'
        WHEN 'UNKNOWN_GPU' THEN 'section-unknown-gpu-gpu-options'
        WHEN 'UNKNOWN_CPU' THEN 'section-unknown-cpu-cpu-options'
        WHEN 'UNKNOWN_RAM' THEN 'section-unknown-ram-ram-options'
        WHEN 'UNKNOWN_STORAGE' THEN 'section-unknown-storage-storage-options'
        WHEN 'CANNOT_DETERMINE' THEN 'section-cannot-determine-popular-gaming-pcs'
    END,
    "id",
    CASE "code"
        WHEN 'PASS_RECOMMENDED' THEN 'Recommended Accessories'
        WHEN 'PASS_MINIMUM' THEN 'Recommended Upgrades'
        WHEN 'FAIL_GPU' THEN 'GPU Upgrades'
        WHEN 'FAIL_CPU' THEN 'CPU Upgrades'
        WHEN 'FAIL_RAM' THEN 'RAM Upgrades'
        WHEN 'FAIL_STORAGE' THEN 'Storage Upgrades'
        WHEN 'FAIL_CPU_GPU' THEN 'CPU and GPU Upgrades'
        WHEN 'FAIL_GPU_RAM' THEN 'GPU and RAM Upgrades'
        WHEN 'FAIL_CPU_RAM' THEN 'CPU and RAM Upgrades'
        WHEN 'FAIL_MULTIPLE' THEN 'Complete Gaming PCs'
        WHEN 'UNKNOWN_GPU' THEN 'GPU Options'
        WHEN 'UNKNOWN_CPU' THEN 'CPU Options'
        WHEN 'UNKNOWN_RAM' THEN 'RAM Options'
        WHEN 'UNKNOWN_STORAGE' THEN 'Storage Upgrades'
        WHEN 'CANNOT_DETERMINE' THEN 'Popular Gaming PCs'
    END,
    CASE
        WHEN "code" LIKE 'FAIL_%' THEN 'Recommendations selected for this compatibility result.'
        WHEN "code" LIKE 'UNKNOWN_%' OR "code" = 'CANNOT_DETERMINE'
            THEN 'Options to consider while the unresolved hardware is reviewed.'
        ELSE 'Recommendations selected for this compatibility result.'
    END,
    true,
    CASE WHEN "code" = 'PASS_RECOMMENDED' THEN 20 ELSE 10 END,
    3,
    false,
    'grid',
    CASE
        WHEN "code" IN ('FAIL_MULTIPLE', 'CANNOT_DETERMINE') THEN 'PREBUILT'
        ELSE 'GENERAL'
    END,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "RecommendationScenario"
WHERE "groupType" = 'SCENARIO'
  AND "code" IN (
    'PASS_RECOMMENDED', 'PASS_MINIMUM', 'FAIL_GPU', 'FAIL_CPU', 'FAIL_RAM',
    'FAIL_STORAGE', 'FAIL_CPU_GPU', 'FAIL_GPU_RAM', 'FAIL_CPU_RAM',
    'FAIL_MULTIPLE', 'UNKNOWN_GPU', 'UNKNOWN_CPU', 'UNKNOWN_RAM',
    'UNKNOWN_STORAGE', 'CANNOT_DETERMINE'
  );

-- Purchase sections are normal sections but are restricted to passing results
-- by the public query.
INSERT INTO "RecommendationSection" (
    "id", "scenarioId", "title", "description", "enabled", "displayOrder",
    "maxProducts", "collapsedByDefault", "layout", "purpose", "isCore",
    "createdAt", "updatedAt"
)
SELECT
    'section-' || lower(replace("code", '_', '-')) || '-gta-vi-purchase',
    "id",
    'GTA VI Purchase',
    'Official purchase or preorder links added by the site owner.',
    true,
    CASE WHEN "code" = 'PASS_RECOMMENDED' THEN 10 ELSE 20 END,
    3,
    false,
    'featured',
    'GAME_PURCHASE',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "RecommendationScenario"
WHERE "code" IN ('PASS_RECOMMENDED', 'PASS_MINIMUM');

-- Preserve every existing scenario product with its original ID and content,
-- assigning it to the first relevant section in the new hierarchy.
INSERT INTO "AffiliateProduct" (
    "id", "sectionId", "title", "retailer", "affiliateUrl", "imageUrl",
    "priceText", "shortDescription", "badge", "buttonText", "componentType",
    "platform", "enabled", "displayOrder", "legacySourceType", "legacySourceId",
    "createdAt", "updatedAt"
)
SELECT
    link."id",
    section."id",
    link."title",
    link."retailer",
    link."affiliateUrl",
    link."imageUrl",
    link."priceText",
    link."shortDescription",
    link."badge",
    link."buttonText",
    link."componentType",
    NULL,
    link."enabled",
    link."displayOrder",
    'AffiliateLink',
    link."id",
    link."createdAt",
    link."updatedAt"
FROM "AffiliateLink" AS link
JOIN "RecommendationScenario" AS scenario ON scenario."id" = link."scenarioId"
JOIN "RecommendationSection" AS section
  ON section."scenarioId" = scenario."id"
 AND section."purpose" <> 'GAME_PURCHASE'
WHERE scenario."groupType" = 'SCENARIO';

-- Preserve legacy purchase records and make them editable as normal products
-- in each passing scenario. The old GamePurchaseLink rows remain untouched.
INSERT INTO "AffiliateProduct" (
    "id", "sectionId", "title", "retailer", "affiliateUrl", "imageUrl",
    "priceText", "shortDescription", "badge", "buttonText", "componentType",
    "platform", "enabled", "displayOrder", "legacySourceType", "legacySourceId",
    "createdAt", "updatedAt"
)
SELECT
    'migrated-purchase-' || purchase."id" || '-' || scenario."code",
    section."id",
    purchase."title",
    purchase."retailer",
    purchase."affiliateUrl",
    purchase."imageUrl",
    purchase."releaseStatus",
    purchase."description",
    'None',
    purchase."buttonText",
    'Game Purchase',
    purchase."platform",
    purchase."enabled",
    purchase."displayOrder",
    'GamePurchaseLink',
    purchase."id",
    purchase."createdAt",
    purchase."updatedAt"
FROM "GamePurchaseLink" AS purchase
CROSS JOIN "RecommendationScenario" AS scenario
JOIN "RecommendationSection" AS section
  ON section."scenarioId" = scenario."id"
 AND section."purpose" = 'GAME_PURCHASE'
WHERE scenario."code" IN ('PASS_RECOMMENDED', 'PASS_MINIMUM');
