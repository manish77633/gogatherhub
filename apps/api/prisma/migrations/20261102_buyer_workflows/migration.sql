ALTER TABLE "Order" ADD COLUMN "cancellationReason" VARCHAR(500), ADD COLUMN "cancelledAt" TIMESTAMP(3);
CREATE TABLE "SupportTicket" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "subject" VARCHAR(160) NOT NULL,
  "message" TEXT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupportTicket_userId_createdAt_idx" ON "SupportTicket"("userId", "createdAt");
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
