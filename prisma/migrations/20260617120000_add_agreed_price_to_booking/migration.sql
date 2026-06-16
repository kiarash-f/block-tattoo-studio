-- Cost tracking on tattoo bookings: agreed total price in integer cents.
-- Additive only — nullable column, no default, no backfill. Nothing else altered.

-- AlterTable
ALTER TABLE "BookingRequest" ADD COLUMN "agreedPriceCents" INTEGER;
