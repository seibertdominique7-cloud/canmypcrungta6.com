-- CreateTable
CREATE TABLE "EmailSubscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "unsubscribeKey" TEXT NOT NULL,
    "gtaUpdatesConsent" BOOLEAN NOT NULL DEFAULT true,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "scenario" TEXT,
    "signupSource" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "unsubscribedAt" DATETIME,
    "lastEmailSentAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailSubscriber_normalizedEmail_key" ON "EmailSubscriber"("normalizedEmail");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSubscriber_unsubscribeKey_key" ON "EmailSubscriber"("unsubscribeKey");

-- CreateIndex
CREATE INDEX "EmailSubscriber_status_createdAt_idx" ON "EmailSubscriber"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmailSubscriber_scenario_status_idx" ON "EmailSubscriber"("scenario", "status");

-- CreateIndex
CREATE INDEX "EmailSubscriber_signupSource_status_idx" ON "EmailSubscriber"("signupSource", "status");

-- CreateIndex
CREATE INDEX "EmailSubscriber_gtaUpdatesConsent_status_idx" ON "EmailSubscriber"("gtaUpdatesConsent", "status");

-- CreateIndex
CREATE INDEX "EmailSubscriber_marketingConsent_status_idx" ON "EmailSubscriber"("marketingConsent", "status");
