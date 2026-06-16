-- Generic Payment Foundation
-- Additive only. Creates the Payment table + payment enums.
-- Does NOT alter GuestArtistBooking, BookingRequest, or AdminUser: their
-- `payments` relations are virtual on the Prisma side; all FK columns live on Payment.

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('TATTOO', 'VOUCHER', 'GUEST_TABLE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'LINK');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'REFUNDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "source" "PaymentSource" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "grossCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,
    "vatAmountCents" INTEGER NOT NULL,
    "vatRateBps" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "bookingRequestId" TEXT,
    "guestArtistBookingId" TEXT,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "refundedAt" TIMESTAMP(3),
    "refundedAmountCents" INTEGER,
    "createdByAdminId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeSessionId_key" ON "Payment"("stripeSessionId");

-- CreateIndex
CREATE INDEX "Payment_status_source_paidAt_idx" ON "Payment"("status", "source", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");

-- CreateIndex
CREATE INDEX "Payment_source_paidAt_idx" ON "Payment"("source", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_bookingRequestId_idx" ON "Payment"("bookingRequestId");

-- CreateIndex
CREATE INDEX "Payment_guestArtistBookingId_idx" ON "Payment"("guestArtistBookingId");

-- CreateIndex
CREATE INDEX "Payment_refundedAt_idx" ON "Payment"("refundedAt");

-- CreateIndex
CREATE INDEX "Payment_createdByAdminId_idx" ON "Payment"("createdByAdminId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "BookingRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_guestArtistBookingId_fkey" FOREIGN KEY ("guestArtistBookingId") REFERENCES "GuestArtistBooking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CHECK: exactly one target FK set, agreeing with `source`.
-- VOUCHER has no FK column yet (seam not added), so a VOUCHER payment must have
-- NO target FK set for now. Revisit this constraint in the voucher migration
-- (drop + recreate to include voucherSaleId). Prisma does not model CHECK
-- constraints, so it will neither track nor drop this on future migrate runs.
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_target_source_chk" CHECK (
    ("source" = 'TATTOO'      AND "bookingRequestId"     IS NOT NULL AND "guestArtistBookingId" IS NULL)
    OR
    ("source" = 'GUEST_TABLE' AND "guestArtistBookingId" IS NOT NULL AND "bookingRequestId"     IS NULL)
    OR
    ("source" = 'VOUCHER'     AND "bookingRequestId"     IS NULL     AND "guestArtistBookingId" IS NULL)
);
