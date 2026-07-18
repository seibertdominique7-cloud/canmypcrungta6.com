-- Keep existing admin-edited headings intact while updating the original default.
UPDATE "RecommendationScenario"
SET "heading" = 'Recommended Gaming Accessories'
WHERE "code" = 'PASS_RECOMMENDED'
  AND "heading" = 'Recommended Accessories';

-- Seed placeholders are admin examples only and must never be published.
UPDATE "AffiliateLink"
SET "enabled" = false
WHERE "affiliateUrl" LIKE 'https://example.com/replace-me/%';
