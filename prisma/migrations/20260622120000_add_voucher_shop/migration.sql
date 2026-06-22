-- Gutschein (Gift Voucher) Shop
-- Additive: new voucher enums + VoucherProduct/VoucherSale tables, and the
-- reserved Payment.voucherSaleId seam (column + FK + index).
--
-- ⚠️ NON-ADDITIVE TAIL: this migration ALSO drops & recreates the
-- `Payment_target_source_chk` CHECK constraint. Prisma does not model CHECK
-- constraints, so `migrate diff` never emits this — it MUST be hand-written here
-- or VOUCHER Payment writes (voucherSaleId set) would be rejected by the old
-- constraint, which required all target FKs NULL for VOUCHER.

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('FULL_DAY', 'HALF_DAY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "VoucherTreatment" AS ENUM ('SINGLE_PURPOSE', 'MULTI_PURPOSE');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('PENDING_PAYMENT', 'VALID', 'REDEEMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VoucherDelivery" AS ENUM ('EMAIL', 'EMAIL_AND_POST');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "voucherSaleId" TEXT;

-- CreateTable
CREATE TABLE "VoucherProduct" (
    "id" TEXT NOT NULL,
    "type" "VoucherType" NOT NULL,
    "name" TEXT NOT NULL,
    "nameDe" TEXT,
    "nameEn" TEXT,
    "priceCents" INTEGER,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "voucherTreatment" "VoucherTreatment" NOT NULL DEFAULT 'SINGLE_PURPOSE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoucherProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherSale" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "VoucherStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "voucherTreatment" "VoucherTreatment" NOT NULL DEFAULT 'SINGLE_PURPOSE',
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "delivery" "VoucherDelivery" NOT NULL DEFAULT 'EMAIL',
    "shippingName" TEXT,
    "shippingLine1" TEXT,
    "shippingLine2" TEXT,
    "shippingPostalCode" TEXT,
    "shippingCity" TEXT,
    "shippingCountry" TEXT,
    "shippedAt" TIMESTAMP(3),
    "grossCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,
    "vatAmountCents" INTEGER NOT NULL,
    "vatRateBps" INTEGER NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "redeemedByAdminId" TEXT,
    "redeemedAgainstBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoucherSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoucherProduct_type_idx" ON "VoucherProduct"("type");

-- CreateIndex
CREATE UNIQUE INDEX "VoucherSale_code_key" ON "VoucherSale"("code");

-- CreateIndex
CREATE INDEX "VoucherSale_status_idx" ON "VoucherSale"("status");

-- CreateIndex
CREATE INDEX "VoucherSale_productId_idx" ON "VoucherSale"("productId");

-- CreateIndex
CREATE INDEX "VoucherSale_buyerEmail_idx" ON "VoucherSale"("buyerEmail");

-- CreateIndex
CREATE INDEX "VoucherSale_redeemedByAdminId_idx" ON "VoucherSale"("redeemedByAdminId");

-- CreateIndex
CREATE INDEX "VoucherSale_redeemedAgainstBookingId_idx" ON "VoucherSale"("redeemedAgainstBookingId");

-- CreateIndex
CREATE INDEX "Payment_voucherSaleId_idx" ON "Payment"("voucherSaleId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_voucherSaleId_fkey" FOREIGN KEY ("voucherSaleId") REFERENCES "VoucherSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherSale" ADD CONSTRAINT "VoucherSale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "VoucherProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherSale" ADD CONSTRAINT "VoucherSale_redeemedByAdminId_fkey" FOREIGN KEY ("redeemedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherSale" ADD CONSTRAINT "VoucherSale_redeemedAgainstBookingId_fkey" FOREIGN KEY ("redeemedAgainstBookingId") REFERENCES "BookingRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- CHECK constraint: extend the polymorphic-target invariant to the VOUCHER seam.
-- Prisma does NOT track this constraint (see add_payment_foundation migration),
-- so it must be dropped & recreated by hand here.
--
-- Before: VOUCHER required ALL target FKs NULL (seam not yet added).
-- After:  VOUCHER requires voucherSaleId NOT NULL and the other two FKs NULL,
--         exactly mirroring the TATTOO / GUEST_TABLE arms.
--
-- Safe against existing rows: no VOUCHER Payment exists yet (the app guard
-- rejected them), and every existing TATTOO/GUEST_TABLE row has voucherSaleId
-- NULL (column just added), so all current rows still satisfy the new predicate.
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_target_source_chk";

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_target_source_chk" CHECK (
    ("source" = 'TATTOO'      AND "bookingRequestId"     IS NOT NULL AND "guestArtistBookingId" IS NULL     AND "voucherSaleId"        IS NULL)
    OR
    ("source" = 'GUEST_TABLE' AND "guestArtistBookingId" IS NOT NULL AND "bookingRequestId"     IS NULL     AND "voucherSaleId"        IS NULL)
    OR
    ("source" = 'VOUCHER'     AND "voucherSaleId"        IS NOT NULL AND "bookingRequestId"     IS NULL     AND "guestArtistBookingId" IS NULL)
);
