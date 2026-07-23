-- Remove a stale custom canonical that pointed at a route which does not exist.
-- The renderer will now use the article's current public URL.
UPDATE "Article"
SET "canonicalUrl" = NULL
WHERE "slug" = 'can-my-pc-run-gta-6-system-requirements-checker-upgrade-guide-2026'
  AND "canonicalUrl" = 'https://canmypcrungta6.com/articles/can-my-pc-run-gta-6';

-- Correct obvious product-library title typos without changing URLs, assignments,
-- images, enablement, or any other administrator-managed fields.
UPDATE "Product" SET "title" = 'NVIDIA GeForce RTX 3070', "canonicalName" = 'nvidia geforce rtx 3070' WHERE "title" = 'NVDIA GeForce RTX 3070';
UPDATE "Product" SET "title" = 'Intel CPU Core i5-12400F / 6/12 / 2.5GHz / 6xxChipset / BX8071512400F', "canonicalName" = 'intel cpu core i5-12400f / 6/12 / 2.5ghz / 6xxchipset / bx8071512400f' WHERE "title" = 'NTEL CPU Core i5-12400F / 6/12 / 2.5GHz / 6xxChipset / BX8071512400F';
UPDATE "Product" SET "title" = 'Intel® Core™ i7-12700KF Desktop Processor 12 (8P+4E) Cores up to 5.0 GHz Unlocked', "canonicalName" = 'intel® core™ i7-12700kf desktop processor 12 (8p+4e) cores up to 5.0 ghz unlocked' WHERE "title" = 'ntel® Core™ i7-12700KF Desktop Processor 12 (8P+4E) Cores up to 5.0 GHz Unlocked';
UPDATE "Product" SET "title" = 'MSI Gaming GeForce RTX 3060 Ventus', "canonicalName" = 'msi gaming geforce rtx 3060 ventus' WHERE "title" = 'msi Gaming GeForce RTX 3060 Ventus';
UPDATE "Product" SET "title" = 'Gigabyte GeForce RTX 4080 Super WINDFORCE V2 Graphics Card', "canonicalName" = 'gigabyte geforce rtx 4080 super windforce v2 graphics card' WHERE "title" = 'Gigabyte GeForce RTX 4080 Super WINDFORCE V2 Graphics Card -';
