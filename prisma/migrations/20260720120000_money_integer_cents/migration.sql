-- H2: migrate guest-booking money from Float euros to integer cents.
-- Safe on production data: add the new column, backfill from the old one,
-- enforce NOT NULL, then drop the old column. The ::numeric cast converts the
-- double through its decimal representation, so e.g. 80.10 becomes exactly
-- 8010 with no float artifact.

-- GuestArtistBooking.totalPrice (Float, euros) -> totalPriceCents (Int)
ALTER TABLE "GuestArtistBooking" ADD COLUMN "totalPriceCents" INTEGER;
UPDATE "GuestArtistBooking" SET "totalPriceCents" = ROUND("totalPrice"::numeric * 100)::integer;
ALTER TABLE "GuestArtistBooking" ALTER COLUMN "totalPriceCents" SET NOT NULL;
ALTER TABLE "GuestArtistBooking" DROP COLUMN "totalPrice";

-- StationConfig.pricePerDay (Float, euros) -> pricePerDayCents (Int)
ALTER TABLE "StationConfig" ADD COLUMN "pricePerDayCents" INTEGER;
UPDATE "StationConfig" SET "pricePerDayCents" = ROUND("pricePerDay"::numeric * 100)::integer;
ALTER TABLE "StationConfig" ALTER COLUMN "pricePerDayCents" SET NOT NULL;
ALTER TABLE "StationConfig" DROP COLUMN "pricePerDay";
