-- CreateEnum
CREATE TYPE "CancelReason" AS ENUM ('CLIENT_CANCELLED', 'NO_SHOW', 'STUDIO_CANCELLED', 'OTHER');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "BookingRequest" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "cancelReason" "CancelReason",
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BookingRequest_approvedAt_idx" ON "BookingRequest"("approvedAt");

-- CreateIndex
CREATE INDEX "BookingRequest_completedAt_idx" ON "BookingRequest"("completedAt");

-- CreateIndex
CREATE INDEX "BookingRequest_cancelledAt_idx" ON "BookingRequest"("cancelledAt");

-- CreateIndex
CREATE INDEX "BookingRequest_status_approvedAt_idx" ON "BookingRequest"("status", "approvedAt");

-- CreateIndex
CREATE INDEX "BookingRequest_status_completedAt_idx" ON "BookingRequest"("status", "completedAt");
