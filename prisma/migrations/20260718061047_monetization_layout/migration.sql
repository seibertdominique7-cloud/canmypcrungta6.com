-- CreateTable
CREATE TABLE "GamePurchaseLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "retailer" TEXT NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "buttonText" TEXT NOT NULL,
    "imageUrl" TEXT,
    "releaseStatus" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RecommendationScenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "groupType" TEXT NOT NULL DEFAULT 'SCENARIO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_RecommendationScenario" ("code", "createdAt", "description", "displayName", "displayOrder", "enabled", "heading", "id", "isCore", "updatedAt") SELECT "code", "createdAt", "description", "displayName", "displayOrder", "enabled", "heading", "id", "isCore", "updatedAt" FROM "RecommendationScenario";
DROP TABLE "RecommendationScenario";
ALTER TABLE "new_RecommendationScenario" RENAME TO "RecommendationScenario";
CREATE UNIQUE INDEX "RecommendationScenario_code_key" ON "RecommendationScenario"("code");
CREATE INDEX "RecommendationScenario_groupType_enabled_displayOrder_idx" ON "RecommendationScenario"("groupType", "enabled", "displayOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "GamePurchaseLink_enabled_displayOrder_idx" ON "GamePurchaseLink"("enabled", "displayOrder");
