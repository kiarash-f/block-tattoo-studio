-- Phase 10: Guest Artist Station Booking

-- CreateEnum
CREATE TYPE "GuestBookingStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'NO_SHOW');

-- CreateTable: StationConfig
CREATE TABLE "StationConfig" (
    "id" TEXT NOT NULL,
    "totalTables" INTEGER NOT NULL,
    "pricePerDay" DOUBLE PRECISION NOT NULL,
    "monthlyDiscountPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable: GuestArtistBooking
CREATE TABLE "GuestArtistBooking" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "numberOfTables" INTEGER NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "discountApplied" DOUBLE PRECISION NOT NULL,
    "acknowledgment" BOOLEAN NOT NULL,
    "status" "GuestBookingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestArtistBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestArtistBooking_status_idx" ON "GuestArtistBooking"("status");
CREATE INDEX "GuestArtistBooking_startDate_endDate_idx" ON "GuestArtistBooking"("startDate", "endDate");
CREATE INDEX "GuestArtistBooking_email_idx" ON "GuestArtistBooking"("email");
