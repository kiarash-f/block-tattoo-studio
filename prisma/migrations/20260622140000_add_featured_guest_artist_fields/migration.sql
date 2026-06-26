-- Featured guest artist promotion fields on Artist.
-- Additive only: one ALTER TABLE on "Artist", no other table touched, no index.
-- isFeaturedGuest backfills existing rows to false (DEFAULT); the three other
-- columns add as NULL. Display-only date columns (DATE, no time component).

-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "availableFrom" DATE,
ADD COLUMN     "availableTo" DATE,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "isFeaturedGuest" BOOLEAN NOT NULL DEFAULT false;
