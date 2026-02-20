-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('APPOINTMENT', 'CONSULTATION', 'COVER_UP', 'WALK_IN');

-- AlterTable
ALTER TABLE "BookingRequest" ADD COLUMN     "bookingType" "BookingType" NOT NULL DEFAULT 'APPOINTMENT';

-- CreateIndex
CREATE INDEX "BookingRequest_bookingType_createdAt_idx" ON "BookingRequest"("bookingType", "createdAt");

-- CreateIndex
CREATE INDEX "BookingRequest_source_bookingType_createdAt_idx" ON "BookingRequest"("source", "bookingType", "createdAt");
