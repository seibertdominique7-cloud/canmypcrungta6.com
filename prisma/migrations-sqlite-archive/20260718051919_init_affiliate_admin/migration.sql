-- CreateTable
CREATE TABLE "RecommendationScenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AffiliateLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "retailer" TEXT NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "priceText" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "buttonText" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AffiliateLink_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "RecommendationScenario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationScenario_code_key" ON "RecommendationScenario"("code");

-- CreateIndex
CREATE INDEX "RecommendationScenario_enabled_displayOrder_idx" ON "RecommendationScenario"("enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "AffiliateLink_scenarioId_enabled_displayOrder_idx" ON "AffiliateLink"("scenarioId", "enabled", "displayOrder");
