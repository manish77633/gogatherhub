CREATE TABLE "WishlistItem" (
  "userId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("userId","productId")
);
CREATE INDEX "WishlistItem_userId_createdAt_idx" ON "WishlistItem"("userId", "createdAt");
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "RecentView" (
  "userId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "viewedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecentView_pkey" PRIMARY KEY ("userId","productId")
);
CREATE INDEX "RecentView_userId_viewedAt_idx" ON "RecentView"("userId", "viewedAt");
ALTER TABLE "RecentView" ADD CONSTRAINT "RecentView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecentView" ADD CONSTRAINT "RecentView_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
