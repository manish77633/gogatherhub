CREATE TABLE "CartItem" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "variantId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CartItem_userId_variantId_key" ON "CartItem"("userId", "variantId");
CREATE INDEX "CartItem_userId_updatedAt_idx" ON "CartItem"("userId", "updatedAt");
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
