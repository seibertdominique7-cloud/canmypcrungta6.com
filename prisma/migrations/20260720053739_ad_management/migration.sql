-- CreateTable
CREATE TABLE "AdGlobalSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultProvider" TEXT NOT NULL DEFAULT 'disabled',
    "adsenseClient" TEXT NOT NULL DEFAULT '',
    "debugPlaceholders" BOOLEAN NOT NULL DEFAULT false,
    "defaultLabel" TEXT NOT NULL DEFAULT 'Advertisement',
    "defaultResponsive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdPlacement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'disabled',
    "useGlobalClient" BOOLEAN NOT NULL DEFAULT true,
    "adClientOverride" TEXT NOT NULL DEFAULT '',
    "adSlot" TEXT NOT NULL DEFAULT '',
    "format" TEXT NOT NULL DEFAULT 'auto',
    "responsive" BOOLEAN NOT NULL DEFAULT true,
    "deviceTarget" TEXT NOT NULL DEFAULT 'both',
    "label" TEXT NOT NULL DEFAULT '',
    "displayOrder" INTEGER NOT NULL,
    "customHtml" TEXT NOT NULL DEFAULT '',
    "customHtmlTrusted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AdPlacement_code_key" ON "AdPlacement"("code");

-- CreateIndex
CREATE INDEX "AdPlacement_enabled_displayOrder_idx" ON "AdPlacement"("enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "AdPlacement_provider_enabled_idx" ON "AdPlacement"("provider", "enabled");
