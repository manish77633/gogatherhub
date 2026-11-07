CREATE TABLE "MediaAsset" (
  "id" UUID NOT NULL, "publicId" VARCHAR(255) NOT NULL, "url" TEXT NOT NULL,
  "filename" VARCHAR(255) NOT NULL, "altText" VARCHAR(500) NOT NULL DEFAULT '',
  "width" INTEGER NOT NULL, "height" INTEGER NOT NULL, "bytes" INTEGER NOT NULL,
  "format" VARCHAR(20) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MediaAsset_publicId_key" ON "MediaAsset"("publicId");
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");
CREATE TABLE "HomepageSection" (
  "id" UUID NOT NULL, "key" VARCHAR(80) NOT NULL, "draft" JSONB NOT NULL DEFAULT '{}',
  "published" JSONB NOT NULL DEFAULT '{}', "enabled" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0, "publishedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "HomepageSection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HomepageSection_key_key" ON "HomepageSection"("key");
CREATE INDEX "HomepageSection_position_idx" ON "HomepageSection"("position");

ALTER TABLE "ContentEntry" ADD COLUMN "publishedSnapshot" JSONB, ADD COLUMN "publishedAt" TIMESTAMP(3), ADD COLUMN "publishedSlug" VARCHAR(160);
UPDATE "ContentEntry" SET "publishedSnapshot" = jsonb_build_object('kind', "kind", 'slug', "slug", 'title', "title", 'body', "body", 'imageUrl', "imageUrl", 'metaTitle', "metaTitle", 'metaDescription', "metaDescription", 'updatedAt', "updatedAt"), "publishedAt" = "updatedAt", "publishedSlug" = "slug" WHERE "published" = true;
CREATE INDEX "ContentEntry_kind_publishedSlug_idx" ON "ContentEntry"("kind", "publishedSlug");
