-- Payment cancellation audit (owner marks a payment no-longer-counting; cash refund).
-- Additive only: two nullable columns on "Payment" + their index + the SetNull FK
-- to AdminUser, mirroring createdByAdmin. No data change to existing rows.

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledByAdminId" TEXT;

-- CreateIndex
CREATE INDEX "Payment_cancelledByAdminId_idx" ON "Payment"("cancelledByAdminId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cancelledByAdminId_fkey" FOREIGN KEY ("cancelledByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
