ALTER TABLE "User" ADD COLUMN "googleSub" VARCHAR(255);
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");
