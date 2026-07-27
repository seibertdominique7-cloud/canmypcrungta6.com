-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "featuredImage" TEXT,
    "authorName" TEXT NOT NULL DEFAULT 'CanMyPCRunGTA6',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" DATETIME,
    "scheduledAt" DATETIME,
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
    "schemaType" TEXT NOT NULL DEFAULT 'Article',
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ContentPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "publishedAt" DATETIME,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ContentCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "metaDescription" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ContentTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ArticleCategory" (
    "articleId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("articleId", "categoryId"),
    CONSTRAINT "ArticleCategory_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ArticleCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContentCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArticleTag" (
    "articleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("articleId", "tagId"),
    CONSTRAINT "ArticleTag_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ArticleTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ContentTag" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArticleRelated" (
    "articleId" TEXT NOT NULL,
    "relatedArticleId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("articleId", "relatedArticleId"),
    CONSTRAINT "ArticleRelated_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ArticleRelated_relatedArticleId_fkey" FOREIGN KEY ("relatedArticleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentId" TEXT NOT NULL,
    "contentKind" TEXT NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "bodySnapshot" TEXT NOT NULL,
    "editorIdentifier" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER NOT NULL,
    "altText" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "storageKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SiteContent" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "contentType" TEXT NOT NULL DEFAULT 'text',
    "group" TEXT NOT NULL DEFAULT 'General',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Redirect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourcePath" TEXT NOT NULL,
    "destinationPath" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 301,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

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
CREATE INDEX "ContentPage_status_publishedAt_idx" ON "ContentPage"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "ContentPage_showInNavigation_navigationOrder_idx" ON "ContentPage"("showInNavigation", "navigationOrder");

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
CREATE INDEX "SiteContent_group_label_idx" ON "SiteContent"("group", "label");

-- CreateIndex
CREATE UNIQUE INDEX "Redirect_sourcePath_key" ON "Redirect"("sourcePath");

-- CreateIndex
CREATE INDEX "Redirect_enabled_sourcePath_idx" ON "Redirect"("enabled", "sourcePath");
