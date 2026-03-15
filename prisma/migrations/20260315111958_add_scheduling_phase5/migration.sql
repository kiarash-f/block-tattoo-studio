-- AlterTable
ALTER TABLE "BookingRequest" ADD COLUMN     "consultSlotId" TEXT;

-- CreateTable
CREATE TABLE "ConsultSlot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "maxCount" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TattooSession" (
    "id" TEXT NOT NULL,
    "bookingRequestId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "stationId" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "durationNote" TEXT,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TattooSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultSlot_date_idx" ON "ConsultSlot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultSlot_date_key" ON "ConsultSlot"("date");

-- CreateIndex
CREATE INDEX "TattooSession_bookingRequestId_idx" ON "TattooSession"("bookingRequestId");

-- CreateIndex
CREATE INDEX "TattooSession_artistId_idx" ON "TattooSession"("artistId");

-- CreateIndex
CREATE INDEX "TattooSession_scheduledDate_idx" ON "TattooSession"("scheduledDate");

-- CreateIndex
CREATE INDEX "BookingRequest_consultSlotId_idx" ON "BookingRequest"("consultSlotId");

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_consultSlotId_fkey" FOREIGN KEY ("consultSlotId") REFERENCES "ConsultSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TattooSession" ADD CONSTRAINT "TattooSession_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TattooSession" ADD CONSTRAINT "TattooSession_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TattooSession" ADD CONSTRAINT "TattooSession_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "StudioStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
