-- Rule records select from the existing Product catalog at request time.
-- No Product fields or existing manual assignments are changed by this migration.

CREATE TABLE "RecommendationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "allowedComponentTypes" TEXT NOT NULL DEFAULT '[]',
    "allowedValueTiers" TEXT NOT NULL DEFAULT '[]',
    "tierPriority" TEXT NOT NULL DEFAULT '[]',
    "fallbackComponentTypes" TEXT NOT NULL DEFAULT '[]',
    "fallbackValueTiers" TEXT NOT NULL DEFAULT '[]',
    "maxProducts" INTEGER NOT NULL DEFAULT 3,
    "sortOrder" TEXT NOT NULL DEFAULT 'TIER_DIVERSITY',
    "layout" TEXT NOT NULL DEFAULT 'grid',
    "purpose" TEXT NOT NULL DEFAULT 'GENERAL',
    "collapsedByDefault" BOOLEAN NOT NULL DEFAULT false,
    "emptyStateTitle" TEXT NOT NULL DEFAULT '',
    "emptyStateDescription" TEXT NOT NULL DEFAULT '',
    "emptyCtaLabel" TEXT NOT NULL DEFAULT '',
    "emptyCtaUrl" TEXT NOT NULL DEFAULT '',
    "sourceSectionId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'LAUNCH_DEFAULT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecommendationRule_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "RecommendationScenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecommendationRule_sourceSectionId_fkey" FOREIGN KEY ("sourceSectionId") REFERENCES "RecommendationSection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RecommendationRule_scenarioId_key_key" ON "RecommendationRule"("scenarioId", "key");
CREATE INDEX "RecommendationRule_scenarioId_enabled_displayOrder_idx" ON "RecommendationRule"("scenarioId", "enabled", "displayOrder");
CREATE INDEX "RecommendationRule_sourceSectionId_idx" ON "RecommendationRule"("sourceSectionId");

CREATE TABLE "RecommendationRuleOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecommendationRuleOverride_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RecommendationRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecommendationRuleOverride_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RecommendationRuleOverride_ruleId_productId_key" ON "RecommendationRuleOverride"("ruleId", "productId");
CREATE INDEX "RecommendationRuleOverride_ruleId_action_displayOrder_idx" ON "RecommendationRuleOverride"("ruleId", "action", "displayOrder");
CREATE INDEX "RecommendationRuleOverride_productId_idx" ON "RecommendationRuleOverride"("productId");

CREATE TABLE "CreatorRecommendationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "allowedComponentTypes" TEXT NOT NULL DEFAULT '[]',
    "allowedValueTiers" TEXT NOT NULL DEFAULT '[]',
    "derivedCategories" TEXT NOT NULL DEFAULT '[]',
    "tierPriority" TEXT NOT NULL DEFAULT '[]',
    "maxProducts" INTEGER NOT NULL DEFAULT 3,
    "source" TEXT NOT NULL DEFAULT 'LAUNCH_DEFAULT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CreatorRecommendationRule_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "RecommendationScenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CreatorRecommendationRule_scenarioId_key_key" ON "CreatorRecommendationRule"("scenarioId", "key");
CREATE INDEX "CreatorRecommendationRule_scenarioId_enabled_displayOrder_idx" ON "CreatorRecommendationRule"("scenarioId", "enabled", "displayOrder");
