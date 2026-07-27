-- Value Tier is nullable so unmatched or ambiguous legacy products remain
-- explicitly unclassified instead of receiving an invented default.
ALTER TABLE "Product" ADD COLUMN "valueTier" TEXT;

CREATE INDEX "Product_valueTier_enabled_idx" ON "Product"("valueTier", "enabled");
