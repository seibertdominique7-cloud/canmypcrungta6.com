-- Preserve structured page content, such as FAQ entries, in the existing
-- revision history without changing older revision records.
ALTER TABLE "ContentRevision" ADD COLUMN "structuredSnapshot" TEXT;
