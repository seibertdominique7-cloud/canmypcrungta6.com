-- Extend existing CMS pages with public visibility and footer placement controls.
ALTER TABLE "ContentPage" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ContentPage" ADD COLUMN "requiredPageKey" TEXT;
ALTER TABLE "ContentPage" ADD COLUMN "showInFooter" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContentPage" ADD COLUMN "footerLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContentPage" ADD COLUMN "footerOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ContentPage" ADD COLUMN "footerGroup" TEXT NOT NULL DEFAULT 'Resources';

-- Structured FAQ entries remain attached to the existing CMS page record.
CREATE TABLE "FaqEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FaqEntry_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "ContentPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Contact messages are stored in the existing application database when no
-- outbound email adapter is configured.
CREATE TABLE "ContactSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "consentAcknowledged" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "ContentPage_requiredPageKey_key" ON "ContentPage"("requiredPageKey");
CREATE INDEX "ContentPage_showInFooter_footerGroup_footerOrder_idx" ON "ContentPage"("showInFooter", "footerGroup", "footerOrder");
CREATE INDEX "FaqEntry_pageId_enabled_displayOrder_idx" ON "FaqEntry"("pageId", "enabled", "displayOrder");
CREATE INDEX "ContactSubmission_status_createdAt_idx" ON "ContactSubmission"("status", "createdAt");
CREATE INDEX "ContactSubmission_email_createdAt_idx" ON "ContactSubmission"("email", "createdAt");
