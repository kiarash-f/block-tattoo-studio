-- CreateEnum
CREATE TYPE "ArtistStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AssignmentRole" AS ENUM ('PRIMARY', 'SECONDARY', 'ASSISTANT', 'GUEST');

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "studioId" TEXT,
    "displayName" TEXT NOT NULL,
    "handle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" "ArtistStatus" NOT NULL DEFAULT 'ACTIVE',
    "bio" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioStation" (
    "id" TEXT NOT NULL,
    "studioId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "status" "StationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAssignment" (
    "id" TEXT NOT NULL,
    "bookingRequestId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "stationId" TEXT,
    "role" "AssignmentRole" NOT NULL DEFAULT 'PRIMARY',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Artist_handle_key" ON "Artist"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_email_key" ON "Artist"("email");

-- CreateIndex
CREATE INDEX "Artist_studioId_status_idx" ON "Artist"("studioId", "status");

-- CreateIndex
CREATE INDEX "Artist_displayName_idx" ON "Artist"("displayName");

-- CreateIndex
CREATE INDEX "StudioStation_studioId_status_idx" ON "StudioStation"("studioId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudioStation_studioId_name_key" ON "StudioStation"("studioId", "name");

-- CreateIndex
CREATE INDEX "BookingAssignment_bookingRequestId_idx" ON "BookingAssignment"("bookingRequestId");

-- CreateIndex
CREATE INDEX "BookingAssignment_artistId_idx" ON "BookingAssignment"("artistId");

-- CreateIndex
CREATE INDEX "BookingAssignment_stationId_idx" ON "BookingAssignment"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingAssignment_bookingRequestId_artistId_role_key" ON "BookingAssignment"("bookingRequestId", "artistId", "role");

-- AddForeignKey
ALTER TABLE "BookingAssignment" ADD CONSTRAINT "BookingAssignment_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAssignment" ADD CONSTRAINT "BookingAssignment_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAssignment" ADD CONSTRAINT "BookingAssignment_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "StudioStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
