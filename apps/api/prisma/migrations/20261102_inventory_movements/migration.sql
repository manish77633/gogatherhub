CREATE TABLE "InventoryMovement" (
  "id" UUID NOT NULL,
  "variantId" UUID NOT NULL,
  "actorId" UUID,
  "reason" VARCHAR(40) NOT NULL,
  "delta" INTEGER NOT NULL,
  "before" INTEGER NOT NULL,
  "after" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InventoryMovement_variantId_createdAt_idx" ON "InventoryMovement"("variantId", "createdAt");
CREATE INDEX "InventoryMovement_actorId_createdAt_idx" ON "InventoryMovement"("actorId", "createdAt");
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
