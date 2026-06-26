-- Per-artist time-block scheduling on TattooSession.
-- Replaces the free-text durationNote with a clock-time window (startsAt/endsAt).
-- Touches ONLY "TattooSession": drops durationNote, adds two nullable timestamp
-- columns, and adds the composite index backing the per-artist same-day collision
-- lookup. scheduledDate is unchanged. Nullable columns keep pre-feature rows valid
-- (required-ness is enforced at the app layer for schedule-tattoo / walk-in).

-- AlterTable
ALTER TABLE "TattooSession" DROP COLUMN "durationNote",
ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "startsAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TattooSession_artistId_scheduledDate_idx" ON "TattooSession"("artistId", "scheduledDate");
