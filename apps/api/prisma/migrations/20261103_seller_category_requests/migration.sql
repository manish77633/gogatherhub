CREATE TABLE "CategoryRequest" (
    "id" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "note" VARCHAR(500),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CategoryRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CategoryRequest_sellerId_slug_key" ON "CategoryRequest"("sellerId", "slug");
CREATE INDEX "CategoryRequest_status_createdAt_idx" ON "CategoryRequest"("status", "createdAt");
ALTER TABLE "CategoryRequest" ADD CONSTRAINT "CategoryRequest_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
