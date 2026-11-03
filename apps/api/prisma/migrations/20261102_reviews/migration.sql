CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TABLE "Review" (
  "id" UUID NOT NULL,
  "buyerId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "orderItemId" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "body" TEXT NOT NULL,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "moderationReason" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Review_orderItemId_key" ON "Review"("orderItemId");
CREATE INDEX "Review_productId_status_createdAt_idx" ON "Review"("productId", "status", "createdAt");
CREATE INDEX "Review_buyerId_createdAt_idx" ON "Review"("buyerId", "createdAt");
ALTER TABLE "Review" ADD CONSTRAINT "Review_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
