CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'SELLER_APPROVED', 'SELLER_REJECTED', 'ADMIN_REVIEW', 'REFUND_PENDING');
CREATE TABLE "ReturnRequest" (
  "id" UUID NOT NULL,
  "orderItemId" UUID NOT NULL,
  "buyerId" UUID NOT NULL,
  "sellerId" UUID NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
  "sellerReason" VARCHAR(500),
  "adminReason" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReturnRequest_orderItemId_key" ON "ReturnRequest"("orderItemId");
CREATE INDEX "ReturnRequest_buyerId_createdAt_idx" ON "ReturnRequest"("buyerId", "createdAt");
CREATE INDEX "ReturnRequest_sellerId_status_createdAt_idx" ON "ReturnRequest"("sellerId", "status", "createdAt");
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
