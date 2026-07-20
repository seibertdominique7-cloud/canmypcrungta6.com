-- Additive media metadata and optional folders. Existing URLs and storage keys
-- are preserved exactly.
CREATE TABLE "MediaFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

ALTER TABLE "MediaAsset" ADD COLUMN "originalFilename" TEXT NOT NULL DEFAULT '';
ALTER TABLE "MediaAsset" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'upload';
ALTER TABLE "MediaAsset" ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "MediaAsset" ADD COLUMN "folderId" TEXT REFERENCES "MediaFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "MediaAsset" SET "originalFilename" = "filename";
UPDATE "MediaAsset"
SET "sourceType" = 'external', "storageProvider" = 'external'
WHERE "url" LIKE 'https://%' OR "url" LIKE 'http://%';

CREATE UNIQUE INDEX "MediaFolder_slug_key" ON "MediaFolder"("slug");
CREATE INDEX "MediaFolder_displayOrder_name_idx" ON "MediaFolder"("displayOrder", "name");
CREATE INDEX "MediaAsset_sourceType_createdAt_idx" ON "MediaAsset"("sourceType", "createdAt");
CREATE INDEX "MediaAsset_folderId_createdAt_idx" ON "MediaAsset"("folderId", "createdAt");
