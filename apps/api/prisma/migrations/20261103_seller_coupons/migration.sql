ALTER TABLE "Coupon" ADD COLUMN "sellerId" UUID;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Coupon_sellerId_idx" ON "Coupon"("sellerId");
