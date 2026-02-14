-- CreateEnum
CREATE TYPE "BookingLinkScope" AS ENUM ('INTAKE_CONTINUE', 'UPLOAD', 'VIEW');

-- CreateEnum
CREATE TYPE "BookingLinkStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED', 'CONSUMED');

-- AlterTable
ALTER TABLE "Upload" ADD COLUMN     "createdViaTokenId" TEXT;

-- CreateTable
CREATE TABLE "BookingLinkToken" (
    "id" TEXT NOT NULL,
    "bookingRequestId" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "scopes" "BookingLinkScope"[],
    "status" "BookingLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "createdByAdminId" TEXT,

    CONSTRAINT "BookingLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingLinkToken_bookingRequestId_idx" ON "BookingLinkToken"("bookingRequestId");

-- CreateIndex
CREATE INDEX "BookingLinkToken_status_expiresAt_idx" ON "BookingLinkToken"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Upload_createdViaTokenId_idx" ON "Upload"("createdViaTokenId");

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_createdViaTokenId_fkey" FOREIGN KEY ("createdViaTokenId") REFERENCES "BookingLinkToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLinkToken" ADD CONSTRAINT "BookingLinkToken_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
