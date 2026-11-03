CREATE TYPE "ContentKind" AS ENUM ('PAGE', 'BLOG', 'FAQ', 'POLICY', 'BANNER');
CREATE TABLE "ContentEntry" (
  "id" UUID NOT NULL,
  "kind" "ContentKind" NOT NULL,
  "slug" VARCHAR(160) NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "body" TEXT NOT NULL,
  "imageUrl" TEXT,
  "metaTitle" VARCHAR(200),
  "metaDescription" VARCHAR(500),
  "published" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContentEntry_kind_slug_key" ON "ContentEntry"("kind", "slug");
CREATE INDEX "ContentEntry_kind_published_updatedAt_idx" ON "ContentEntry"("kind", "published", "updatedAt");
