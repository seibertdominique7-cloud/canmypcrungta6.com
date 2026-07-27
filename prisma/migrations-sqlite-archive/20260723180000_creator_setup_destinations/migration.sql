UPDATE "CreatorRecommendation"
SET "primaryCtaUrl" = '/creator-setup-builder'
WHERE "primaryCtaLabel" = 'Build My Streaming Setup'
  AND "primaryCtaUrl" = '/articles';

UPDATE "CreatorRecommendation"
SET "secondaryCtaUrl" = '/creator-setup-guide'
WHERE "secondaryCtaLabel" = 'View Creator Setup Guide'
  AND "secondaryCtaUrl" = '/articles';
