-- CreateEnum
CREATE TYPE "PreferredTimeOfDay" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'ANY');

-- AlterTable
ALTER TABLE "BookingRequest" ADD COLUMN     "preferredDateFrom" TIMESTAMP(3),
ADD COLUMN     "preferredDateTo" TIMESTAMP(3),
ADD COLUMN     "preferredDaysNote" TEXT,
ADD COLUMN     "preferredTimeOfDay" "PreferredTimeOfDay";

-- CreateIndex
CREATE INDEX "BookingRequest_preferredDateFrom_idx" ON "BookingRequest"("preferredDateFrom");

-- CreateIndex
CREATE INDEX "BookingRequest_preferredDateTo_idx" ON "BookingRequest"("preferredDateTo");
