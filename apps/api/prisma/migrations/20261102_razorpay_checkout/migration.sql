ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_PENDING';
ALTER TABLE "Order" ADD COLUMN "razorpayOrderId" VARCHAR(100), ADD COLUMN "razorpayPaymentId" VARCHAR(100), ADD COLUMN "paymentExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Order_razorpayOrderId_key" ON "Order"("razorpayOrderId");
CREATE UNIQUE INDEX "Order_razorpayPaymentId_key" ON "Order"("razorpayPaymentId");
