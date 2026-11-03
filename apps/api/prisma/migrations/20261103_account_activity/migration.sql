CREATE TABLE "SupportReply" (
 "id" UUID NOT NULL, "ticketId" UUID NOT NULL, "authorId" UUID NOT NULL,
 "authorRole" VARCHAR(20) NOT NULL, "message" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SupportReply_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "SupportReply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE,
 CONSTRAINT "SupportReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id")
);
CREATE INDEX "SupportReply_ticketId_createdAt_idx" ON "SupportReply"("ticketId", "createdAt");
CREATE TABLE "NotificationRead" (
 "userId" UUID NOT NULL, "notificationId" VARCHAR(160) NOT NULL,
 "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("userId", "notificationId"),
 CONSTRAINT "NotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
