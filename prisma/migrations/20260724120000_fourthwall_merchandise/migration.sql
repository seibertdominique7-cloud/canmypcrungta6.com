CREATE TABLE "MerchandiseProduct" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL DEFAULT '',
  "shortDescription" TEXT NOT NULL DEFAULT '',
  "productUrl" TEXT NOT NULL DEFAULT '',
  "imageUrl" TEXT,
  "productType" TEXT NOT NULL DEFAULT 'T-Shirt',
  "badge" TEXT NOT NULL DEFAULT '',
  "priceText" TEXT NOT NULL DEFAULT '',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "homepageVisible" BOOLEAN NOT NULL DEFAULT false,
  "storeVisible" BOOLEAN NOT NULL DEFAULT false,
  "articleVisible" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL DEFAULT 'manual',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "MerchandiseProduct_enabled_displayOrder_idx" ON "MerchandiseProduct"("enabled", "displayOrder");
CREATE INDEX "MerchandiseProduct_homepageVisible_enabled_displayOrder_idx" ON "MerchandiseProduct"("homepageVisible", "enabled", "displayOrder");
CREATE INDEX "MerchandiseProduct_storeVisible_enabled_displayOrder_idx" ON "MerchandiseProduct"("storeVisible", "enabled", "displayOrder");
CREATE INDEX "MerchandiseProduct_articleVisible_enabled_displayOrder_idx" ON "MerchandiseProduct"("articleVisible", "enabled", "displayOrder");
CREATE INDEX "MerchandiseProduct_productType_enabled_idx" ON "MerchandiseProduct"("productType", "enabled");
