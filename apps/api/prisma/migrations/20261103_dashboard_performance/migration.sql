CREATE INDEX "Product_sellerId_deletedAt_createdAt_idx" ON "Product"("sellerId", "deletedAt", "createdAt");
CREATE INDEX "Product_status_deletedAt_createdAt_idx" ON "Product"("status", "deletedAt", "createdAt");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
