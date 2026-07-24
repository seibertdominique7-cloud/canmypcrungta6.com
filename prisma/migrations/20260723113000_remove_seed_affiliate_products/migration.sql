-- Remove only the original sample catalog records. The strict fingerprints
-- protect any seed-origin product that an administrator converted into a real
-- product by replacing its URL, copy, image, or retailer.

DELETE FROM "RecommendationAssignment"
WHERE "productId" IN (
  SELECT "id"
  FROM "Product"
  WHERE (
    "id" LIKE 'seed-%'
    AND "affiliateUrl" = 'https://example.com/replace-me/' || "id"
    AND "shortDescription" = 'Seed placeholder for testing. Replace the URL, image, and copy before publishing.'
    AND "imageUrl" IS NULL
  ) OR (
    "id" = 'seed-fail-gpu-rtx-4060'
    AND "affiliateUrl" = 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4060-4060ti/'
    AND "shortDescription" = 'Explore NVIDIA GeForce RTX 4060 specifications and current buying options.'
    AND "retailer" = 'Other'
    AND "imageUrl" IS NULL
  ) OR (
    "id" = 'seed-fail-gpu-rtx-4070'
    AND "affiliateUrl" = 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4070-family/'
    AND "shortDescription" = 'Explore NVIDIA GeForce RTX 4070 specifications and current buying options.'
    AND "retailer" = 'Other'
    AND "imageUrl" IS NULL
  )
);

DELETE FROM "CreatorProductAssignment"
WHERE "productId" IN (
  SELECT "id"
  FROM "Product"
  WHERE (
    "id" LIKE 'seed-%'
    AND "affiliateUrl" = 'https://example.com/replace-me/' || "id"
    AND "shortDescription" = 'Seed placeholder for testing. Replace the URL, image, and copy before publishing.'
    AND "imageUrl" IS NULL
  ) OR (
    "id" = 'seed-fail-gpu-rtx-4060'
    AND "affiliateUrl" = 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4060-4060ti/'
    AND "shortDescription" = 'Explore NVIDIA GeForce RTX 4060 specifications and current buying options.'
    AND "retailer" = 'Other'
    AND "imageUrl" IS NULL
  ) OR (
    "id" = 'seed-fail-gpu-rtx-4070'
    AND "affiliateUrl" = 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4070-family/'
    AND "shortDescription" = 'Explore NVIDIA GeForce RTX 4070 specifications and current buying options.'
    AND "retailer" = 'Other'
    AND "imageUrl" IS NULL
  )
);

DELETE FROM "Product"
WHERE (
  "id" LIKE 'seed-%'
  AND "affiliateUrl" = 'https://example.com/replace-me/' || "id"
  AND "shortDescription" = 'Seed placeholder for testing. Replace the URL, image, and copy before publishing.'
  AND "imageUrl" IS NULL
) OR (
  "id" = 'seed-fail-gpu-rtx-4060'
  AND "affiliateUrl" = 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4060-4060ti/'
  AND "shortDescription" = 'Explore NVIDIA GeForce RTX 4060 specifications and current buying options.'
  AND "retailer" = 'Other'
  AND "imageUrl" IS NULL
) OR (
  "id" = 'seed-fail-gpu-rtx-4070'
  AND "affiliateUrl" = 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4070-family/'
  AND "shortDescription" = 'Explore NVIDIA GeForce RTX 4070 specifications and current buying options.'
  AND "retailer" = 'Other'
  AND "imageUrl" IS NULL
);

DELETE FROM "AffiliateProduct"
WHERE (
  "id" LIKE 'seed-%'
  AND "affiliateUrl" = 'https://example.com/replace-me/' || "id"
  AND "shortDescription" = 'Seed placeholder for testing. Replace the URL, image, and copy before publishing.'
  AND "imageUrl" IS NULL
) OR (
  "id" = 'seed-fail-gpu-rtx-4060'
  AND "affiliateUrl" = 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4060-4060ti/'
  AND "shortDescription" = 'Explore NVIDIA GeForce RTX 4060 specifications and current buying options.'
  AND "retailer" = 'Other'
  AND "imageUrl" IS NULL
) OR (
  "id" = 'seed-fail-gpu-rtx-4070'
  AND "affiliateUrl" = 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4070-family/'
  AND "shortDescription" = 'Explore NVIDIA GeForce RTX 4070 specifications and current buying options.'
  AND "retailer" = 'Other'
  AND "imageUrl" IS NULL
);

DELETE FROM "AffiliateLink"
WHERE (
  "id" LIKE 'seed-%'
  AND "affiliateUrl" = 'https://example.com/replace-me/' || "id"
  AND "shortDescription" = 'Seed placeholder for testing. Replace the URL, image, and copy before publishing.'
  AND "imageUrl" IS NULL
) OR (
  "id" = 'seed-fail-gpu-rtx-4060'
  AND "affiliateUrl" = 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4060-4060ti/'
  AND "shortDescription" = 'Explore NVIDIA GeForce RTX 4060 specifications and current buying options.'
  AND "retailer" = 'Other'
  AND "imageUrl" IS NULL
) OR (
  "id" = 'seed-fail-gpu-rtx-4070'
  AND "affiliateUrl" = 'https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4070-family/'
  AND "shortDescription" = 'Explore NVIDIA GeForce RTX 4070 specifications and current buying options.'
  AND "retailer" = 'Other'
  AND "imageUrl" IS NULL
);
