-- Creator recommendations extend the existing scenario and product catalog
-- without modifying compatibility results or normal recommendation assignments.
CREATE TABLE "CreatorRecommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "headline" TEXT NOT NULL,
    "subheadline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "warningText" TEXT NOT NULL DEFAULT '',
    "primaryCtaLabel" TEXT NOT NULL,
    "primaryCtaUrl" TEXT NOT NULL,
    "secondaryCtaLabel" TEXT NOT NULL DEFAULT '',
    "secondaryCtaUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CreatorRecommendation_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "RecommendationScenario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "CreatorRecommendationGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creatorRecommendationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CreatorRecommendationGroup_creatorRecommendationId_fkey" FOREIGN KEY ("creatorRecommendationId") REFERENCES "CreatorRecommendation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CreatorProductAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CreatorProductAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CreatorRecommendationGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CreatorProductAssignment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CreatorGuideLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creatorRecommendationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CreatorGuideLink_creatorRecommendationId_fkey" FOREIGN KEY ("creatorRecommendationId") REFERENCES "CreatorRecommendation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CreatorRecommendation_scenarioId_key" ON "CreatorRecommendation"("scenarioId");
CREATE INDEX "CreatorRecommendation_enabled_updatedAt_idx" ON "CreatorRecommendation"("enabled", "updatedAt");
CREATE INDEX "CreatorRecommendationGroup_creatorRecommendationId_enabled_displayOrder_idx" ON "CreatorRecommendationGroup"("creatorRecommendationId", "enabled", "displayOrder");
CREATE UNIQUE INDEX "CreatorProductAssignment_groupId_productId_key" ON "CreatorProductAssignment"("groupId", "productId");
CREATE INDEX "CreatorProductAssignment_groupId_enabled_displayOrder_idx" ON "CreatorProductAssignment"("groupId", "enabled", "displayOrder");
CREATE INDEX "CreatorProductAssignment_productId_enabled_idx" ON "CreatorProductAssignment"("productId", "enabled");
CREATE INDEX "CreatorGuideLink_creatorRecommendationId_enabled_displayOrder_idx" ON "CreatorGuideLink"("creatorRecommendationId", "enabled", "displayOrder");
