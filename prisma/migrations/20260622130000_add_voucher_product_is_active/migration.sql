-- VoucherProduct.isActive
-- Additive: soft-activation flag so admins can hide a product from the public
-- shop without deleting it. DEFAULT true backfills every existing product as
-- active, so no current row changes behaviour.

-- AlterTable
ALTER TABLE "VoucherProduct" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "VoucherProduct_isActive_idx" ON "VoucherProduct"("isActive");
