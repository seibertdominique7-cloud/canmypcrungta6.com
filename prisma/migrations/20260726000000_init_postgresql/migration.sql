-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "RecommendationScenario" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "groupType" TEXT NOT NULL DEFAULT 'SCENARIO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationSection" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "maxProducts" INTEGER NOT NULL DEFAULT 3,
    "collapsedByDefault" BOOLEAN NOT NULL DEFAULT false,
    "layout" TEXT NOT NULL DEFAULT 'grid',
    "purpose" TEXT NOT NULL DEFAULT 'GENERAL',
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "retailer" TEXT NOT NULL DEFAULT 'Other',
    "affiliateUrl" TEXT NOT NULL,
    "defaultPriceText" TEXT NOT NULL DEFAULT 'Check current price',
    "platform" TEXT,
    "valueTier" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchandiseProduct" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchandiseProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationAssignment" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "badge" TEXT NOT NULL DEFAULT 'None',
    "buttonText" TEXT NOT NULL DEFAULT 'View Product',
    "overridePriceText" TEXT,
    "overrideDescription" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationRule" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "allowedComponentTypes" TEXT NOT NULL DEFAULT '[]',
    "allowedValueTiers" TEXT NOT NULL DEFAULT '[]',
    "tierPriority" TEXT NOT NULL DEFAULT '[]',
    "fallbackComponentTypes" TEXT NOT NULL DEFAULT '[]',
    "fallbackValueTiers" TEXT NOT NULL DEFAULT '[]',
    "maxProducts" INTEGER NOT NULL DEFAULT 3,
    "sortOrder" TEXT NOT NULL DEFAULT 'TIER_DIVERSITY',
    "layout" TEXT NOT NULL DEFAULT 'grid',
    "purpose" TEXT NOT NULL DEFAULT 'GENERAL',
    "collapsedByDefault" BOOLEAN NOT NULL DEFAULT false,
    "emptyStateTitle" TEXT NOT NULL DEFAULT '',
    "emptyStateDescription" TEXT NOT NULL DEFAULT '',
    "emptyCtaLabel" TEXT NOT NULL DEFAULT '',
    "emptyCtaUrl" TEXT NOT NULL DEFAULT '',
    "sourceSectionId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'LAUNCH_DEFAULT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationRuleOverride" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationRuleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorRecommendation" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "headline" TEXT NOT NULL,
    "subheadline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "warningText" TEXT NOT NULL DEFAULT '',
    "primaryCtaLabel" TEXT NOT NULL,
    "primaryCtaUrl" TEXT NOT NULL,
    "secondaryCtaLabel" TEXT NOT NULL DEFAULT '',
    "secondaryCtaUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorRecommendationRule" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "allowedComponentTypes" TEXT NOT NULL DEFAULT '[]',
    "allowedValueTiers" TEXT NOT NULL DEFAULT '[]',
    "derivedCategories" TEXT NOT NULL DEFAULT '[]',
    "tierPriority" TEXT NOT NULL DEFAULT '[]',
    "maxProducts" INTEGER NOT NULL DEFAULT 3,
    "source" TEXT NOT NULL DEFAULT 'LAUNCH_DEFAULT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorRecommendationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorRecommendationGroup" (
    "id" TEXT NOT NULL,
    "creatorRecommendationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorRecommendationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorProductAssignment" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorProductAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorGuideLink" (
    "id" TEXT NOT NULL,
    "creatorRecommendationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorGuideLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateProduct" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "retailer" TEXT NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "priceText" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "buttonText" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "platform" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "legacySourceType" TEXT,
    "legacySourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateLink" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "retailer" TEXT NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "priceText" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "buttonText" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePurchaseLink" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "retailer" TEXT NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "buttonText" TEXT NOT NULL,
    "imageUrl" TEXT,
    "releaseStatus" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamePurchaseLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdGlobalSettings" (
    "id" TEXT NOT NULL,
    "masterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultProvider" TEXT NOT NULL DEFAULT 'disabled',
    "adsenseClient" TEXT NOT NULL DEFAULT '',
    "debugPlaceholders" BOOLEAN NOT NULL DEFAULT false,
    "defaultLabel" TEXT NOT NULL DEFAULT 'Advertisement',
    "defaultResponsive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdGlobalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdPlacement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'disabled',
    "useGlobalClient" BOOLEAN NOT NULL DEFAULT true,
    "adClientOverride" TEXT NOT NULL DEFAULT '',
    "adSlot" TEXT NOT NULL DEFAULT '',
    "format" TEXT NOT NULL DEFAULT 'auto',
    "responsive" BOOLEAN NOT NULL DEFAULT true,
    "deviceTarget" TEXT NOT NULL DEFAULT 'both',
    "label" TEXT NOT NULL DEFAULT '',
    "displayOrder" INTEGER NOT NULL,
    "customHtml" TEXT NOT NULL DEFAULT '',
    "customHtmlTrusted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "unsubscribeKey" TEXT NOT NULL,
    "gtaUpdatesConsent" BOOLEAN NOT NULL DEFAULT true,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "scenario" TEXT,
    "signupSource" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "unsubscribedAt" TIMESTAMP(3),
    "lastEmailSentAt" TIMESTAMP(3),

    CONSTRAINT "EmailSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "featuredImage" TEXT,
    "featuredImagePrompt" TEXT NOT NULL DEFAULT '',
    "authorName" TEXT NOT NULL DEFAULT 'CanMyPCRunGTA6',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "contentType" TEXT NOT NULL DEFAULT 'standard',
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "metaDescription" TEXT NOT NULL DEFAULT '',
    "canonicalUrl" TEXT,
    "openGraphTitle" TEXT NOT NULL DEFAULT '',
    "openGraphDescription" TEXT NOT NULL DEFAULT '',
    "openGraphImage" TEXT,
    "twitterTitle" TEXT NOT NULL DEFAULT '',
    "twitterDescription" TEXT NOT NULL DEFAULT '',
    "twitterImage" TEXT,
    "robotsIndex" BOOLEAN NOT NULL DEFAULT true,
    "robotsFollow" BOOLEAN NOT NULL DEFAULT true,
    "focusKeyword" TEXT NOT NULL DEFAULT '',
    "secondaryKeywords" TEXT NOT NULL DEFAULT '[]',
    "schemaType" TEXT NOT NULL DEFAULT 'Article',
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "excerpt" TEXT NOT NULL DEFAULT '',
    "featuredImage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "pageTemplate" TEXT NOT NULL DEFAULT 'standard',
    "navigationLabel" TEXT NOT NULL DEFAULT '',
    "showInNavigation" BOOLEAN NOT NULL DEFAULT false,
    "navigationOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "requiredPageKey" TEXT,
    "showInFooter" BOOLEAN NOT NULL DEFAULT false,
    "footerLabel" TEXT NOT NULL DEFAULT '',
    "footerOrder" INTEGER NOT NULL DEFAULT 0,
    "footerGroup" TEXT NOT NULL DEFAULT 'Resources',
    "publishedAt" TIMESTAMP(3),
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "metaDescription" TEXT NOT NULL DEFAULT '',
    "canonicalUrl" TEXT,
    "openGraphTitle" TEXT NOT NULL DEFAULT '',
    "openGraphDescription" TEXT NOT NULL DEFAULT '',
    "openGraphImage" TEXT,
    "twitterTitle" TEXT NOT NULL DEFAULT '',
    "twitterDescription" TEXT NOT NULL DEFAULT '',
    "twitterImage" TEXT,
    "robotsIndex" BOOLEAN NOT NULL DEFAULT true,
    "robotsFollow" BOOLEAN NOT NULL DEFAULT true,
    "focusKeyword" TEXT NOT NULL DEFAULT '',
    "schemaType" TEXT NOT NULL DEFAULT 'WebPage',
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqEntry" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSubmission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "consentAcknowledged" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "metaDescription" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleCategory" (
    "articleId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ArticleCategory_pkey" PRIMARY KEY ("articleId","categoryId")
);

-- CreateTable
CREATE TABLE "ArticleTag" (
    "articleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ArticleTag_pkey" PRIMARY KEY ("articleId","tagId")
);

-- CreateTable
CREATE TABLE "ArticleRelated" (
    "articleId" TEXT NOT NULL,
    "relatedArticleId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArticleRelated_pkey" PRIMARY KEY ("articleId","relatedArticleId")
);

-- CreateTable
CREATE TABLE "ContentRevision" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "contentKind" TEXT NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "bodySnapshot" TEXT NOT NULL,
    "structuredSnapshot" TEXT,
    "editorIdentifier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'upload',
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER NOT NULL,
    "altText" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "storageKey" TEXT NOT NULL,
    "folderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteContent" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "contentType" TEXT NOT NULL DEFAULT 'text',
    "group" TEXT NOT NULL DEFAULT 'General',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Redirect" (
    "id" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "destinationPath" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 301,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Redirect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationScenario_code_key" ON "RecommendationScenario"("code");

-- CreateIndex
CREATE INDEX "RecommendationScenario_groupType_enabled_displayOrder_idx" ON "RecommendationScenario"("groupType", "enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "RecommendationSection_scenarioId_enabled_displayOrder_idx" ON "RecommendationSection"("scenarioId", "enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "Product_canonicalName_idx" ON "Product"("canonicalName");

-- CreateIndex
CREATE INDEX "Product_componentType_enabled_idx" ON "Product"("componentType", "enabled");

-- CreateIndex
CREATE INDEX "Product_retailer_enabled_idx" ON "Product"("retailer", "enabled");

-- CreateIndex
CREATE INDEX "Product_valueTier_enabled_idx" ON "Product"("valueTier", "enabled");

-- CreateIndex
CREATE INDEX "MerchandiseProduct_enabled_displayOrder_idx" ON "MerchandiseProduct"("enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "MerchandiseProduct_homepageVisible_enabled_displayOrder_idx" ON "MerchandiseProduct"("homepageVisible", "enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "MerchandiseProduct_storeVisible_enabled_displayOrder_idx" ON "MerchandiseProduct"("storeVisible", "enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "MerchandiseProduct_articleVisible_enabled_displayOrder_idx" ON "MerchandiseProduct"("articleVisible", "enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "MerchandiseProduct_productType_enabled_idx" ON "MerchandiseProduct"("productType", "enabled");

-- CreateIndex
CREATE INDEX "RecommendationAssignment_sectionId_enabled_displayOrder_idx" ON "RecommendationAssignment"("sectionId", "enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "RecommendationAssignment_productId_enabled_idx" ON "RecommendationAssignment"("productId", "enabled");

-- CreateIndex
CREATE INDEX "RecommendationRule_scenarioId_enabled_displayOrder_idx" ON "RecommendationRule"("scenarioId", "enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "RecommendationRule_sourceSectionId_idx" ON "RecommendationRule"("sourceSectionId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationRule_scenarioId_key_key" ON "RecommendationRule"("scenarioId", "key");

-- CreateIndex
CREATE INDEX "RecommendationRuleOverride_ruleId_action_displayOrder_idx" ON "RecommendationRuleOverride"("ruleId", "action", "displayOrder");

-- CreateIndex
CREATE INDEX "RecommendationRuleOverride_productId_idx" ON "RecommendationRuleOverride"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationRuleOverride_ruleId_productId_key" ON "RecommendationRuleOverride"("ruleId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorRecommendation_scenarioId_key" ON "CreatorRecommendation"("scenarioId");

-- CreateIndex
CREATE INDEX "CreatorRecommendation_enabled_updatedAt_idx" ON "CreatorRecommendation"("enabled", "updatedAt");

-- CreateIndex
CREATE INDEX "CreatorRecommendationRule_scenarioId_enabled_displayOrder_idx" ON "CreatorRecommendationRule"("scenarioId", "enabled", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorRecommendationRule_scenarioId_key_key" ON "CreatorRecommendationRule"("scenarioId", "key");

-- CreateIndex
CREATE INDEX "CreatorRecommendationGroup_creatorRecommendationId_enabled__idx" ON "CreatorRecommendationGroup"("creatorRecommendationId", "enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "CreatorProductAssignment_groupId_enabled_displayOrder_idx" ON "CreatorProductAssignment"("groupId", "enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "CreatorProductAssignment_productId_enabled_idx" ON "CreatorProductAssignment"("productId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProductAssignment_groupId_productId_key" ON "CreatorProductAssignment"("groupId", "productId");

-- CreateIndex
CREATE INDEX "CreatorGuideLink_creatorRecommendationId_enabled_displayOrd_idx" ON "CreatorGuideLink"("creatorRecommendationId", "enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "AffiliateProduct_sectionId_enabled_displayOrder_idx" ON "AffiliateProduct"("sectionId", "enabled", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateProduct_legacySourceType_legacySourceId_sectionId_key" ON "AffiliateProduct"("legacySourceType", "legacySourceId", "sectionId");

-- CreateIndex
CREATE INDEX "AffiliateLink_scenarioId_enabled_displayOrder_idx" ON "AffiliateLink"("scenarioId", "enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "GamePurchaseLink_enabled_displayOrder_idx" ON "GamePurchaseLink"("enabled", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AdPlacement_code_key" ON "AdPlacement"("code");

-- CreateIndex
CREATE INDEX "AdPlacement_enabled_displayOrder_idx" ON "AdPlacement"("enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "AdPlacement_provider_enabled_idx" ON "AdPlacement"("provider", "enabled");

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

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Article_status_scheduledAt_idx" ON "Article"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Article_featured_status_idx" ON "Article"("featured", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPage_slug_key" ON "ContentPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPage_requiredPageKey_key" ON "ContentPage"("requiredPageKey");

-- CreateIndex
CREATE INDEX "ContentPage_status_publishedAt_idx" ON "ContentPage"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "ContentPage_showInNavigation_navigationOrder_idx" ON "ContentPage"("showInNavigation", "navigationOrder");

-- CreateIndex
CREATE INDEX "ContentPage_showInFooter_footerGroup_footerOrder_idx" ON "ContentPage"("showInFooter", "footerGroup", "footerOrder");

-- CreateIndex
CREATE INDEX "FaqEntry_pageId_enabled_displayOrder_idx" ON "FaqEntry"("pageId", "enabled", "displayOrder");

-- CreateIndex
CREATE INDEX "ContactSubmission_status_createdAt_idx" ON "ContactSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContactSubmission_email_createdAt_idx" ON "ContactSubmission"("email", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentCategory_slug_key" ON "ContentCategory"("slug");

-- CreateIndex
CREATE INDEX "ContentCategory_displayOrder_name_idx" ON "ContentCategory"("displayOrder", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ContentTag_slug_key" ON "ContentTag"("slug");

-- CreateIndex
CREATE INDEX "ContentTag_name_idx" ON "ContentTag"("name");

-- CreateIndex
CREATE INDEX "ArticleCategory_categoryId_isPrimary_idx" ON "ArticleCategory"("categoryId", "isPrimary");

-- CreateIndex
CREATE INDEX "ArticleTag_tagId_idx" ON "ArticleTag"("tagId");

-- CreateIndex
CREATE INDEX "ArticleRelated_relatedArticleId_idx" ON "ArticleRelated"("relatedArticleId");

-- CreateIndex
CREATE INDEX "ContentRevision_contentKind_contentId_createdAt_idx" ON "ContentRevision"("contentKind", "contentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_url_key" ON "MediaAsset"("url");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- CreateIndex
CREATE INDEX "MediaAsset_filename_createdAt_idx" ON "MediaAsset"("filename", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_sourceType_createdAt_idx" ON "MediaAsset"("sourceType", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_folderId_createdAt_idx" ON "MediaAsset"("folderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFolder_slug_key" ON "MediaFolder"("slug");

-- CreateIndex
CREATE INDEX "MediaFolder_displayOrder_name_idx" ON "MediaFolder"("displayOrder", "name");

-- CreateIndex
CREATE INDEX "SiteContent_group_label_idx" ON "SiteContent"("group", "label");

-- CreateIndex
CREATE UNIQUE INDEX "Redirect_sourcePath_key" ON "Redirect"("sourcePath");

-- CreateIndex
CREATE INDEX "Redirect_enabled_sourcePath_idx" ON "Redirect"("enabled", "sourcePath");

-- AddForeignKey
ALTER TABLE "RecommendationSection" ADD CONSTRAINT "RecommendationSection_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "RecommendationScenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationAssignment" ADD CONSTRAINT "RecommendationAssignment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationAssignment" ADD CONSTRAINT "RecommendationAssignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "RecommendationSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationRule" ADD CONSTRAINT "RecommendationRule_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "RecommendationScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationRule" ADD CONSTRAINT "RecommendationRule_sourceSectionId_fkey" FOREIGN KEY ("sourceSectionId") REFERENCES "RecommendationSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationRuleOverride" ADD CONSTRAINT "RecommendationRuleOverride_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RecommendationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationRuleOverride" ADD CONSTRAINT "RecommendationRuleOverride_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorRecommendation" ADD CONSTRAINT "CreatorRecommendation_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "RecommendationScenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorRecommendationRule" ADD CONSTRAINT "CreatorRecommendationRule_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "RecommendationScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorRecommendationGroup" ADD CONSTRAINT "CreatorRecommendationGroup_creatorRecommendationId_fkey" FOREIGN KEY ("creatorRecommendationId") REFERENCES "CreatorRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorProductAssignment" ADD CONSTRAINT "CreatorProductAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CreatorRecommendationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorProductAssignment" ADD CONSTRAINT "CreatorProductAssignment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorGuideLink" ADD CONSTRAINT "CreatorGuideLink_creatorRecommendationId_fkey" FOREIGN KEY ("creatorRecommendationId") REFERENCES "CreatorRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateProduct" ADD CONSTRAINT "AffiliateProduct_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "RecommendationSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateLink" ADD CONSTRAINT "AffiliateLink_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "RecommendationScenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaqEntry" ADD CONSTRAINT "FaqEntry_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "ContentPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCategory" ADD CONSTRAINT "ArticleCategory_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCategory" ADD CONSTRAINT "ArticleCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleTag" ADD CONSTRAINT "ArticleTag_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleTag" ADD CONSTRAINT "ArticleTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ContentTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleRelated" ADD CONSTRAINT "ArticleRelated_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleRelated" ADD CONSTRAINT "ArticleRelated_relatedArticleId_fkey" FOREIGN KEY ("relatedArticleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "MediaFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
