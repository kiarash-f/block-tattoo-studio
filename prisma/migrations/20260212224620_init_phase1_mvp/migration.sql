-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('NEW', 'IN_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BudgetRange" AS ENUM ('UNDER_200', '200_400', '400_700', '700_1000', '1000_1500', '1500_2000', 'OVER_2000');

-- CreateEnum
CREATE TYPE "IntakeSource" AS ENUM ('DIRECT', 'INSTAGRAM', 'FACEBOOK', 'GOOGLE', 'TIKTOK', 'OTHER');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "instagram" TEXT,
    "birthday" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingRequest" (
    "id" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'NEW',
    "clientId" TEXT NOT NULL,
    "placement" TEXT,
    "sizeDescription" TEXT,
    "styleNotes" TEXT,
    "description" TEXT NOT NULL,
    "budgetRange" "BudgetRange" NOT NULL,
    "referencesNotes" TEXT,
    "preferredArtistName" TEXT,
    "studioChooses" BOOLEAN NOT NULL DEFAULT true,
    "source" "IntakeSource" NOT NULL DEFAULT 'DIRECT',
    "utmCampaign" TEXT,
    "utmAdset" TEXT,
    "utmAd" TEXT,
    "referrer" TEXT,
    "landingPath" TEXT,
    "adminNotes" TEXT,
    "internalStatusNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalDeclaration" (
    "id" TEXT NOT NULL,
    "bookingRequestId" TEXT NOT NULL,
    "hasAllergies" BOOLEAN NOT NULL,
    "allergiesDetails" TEXT,
    "hasSkinCondition" BOOLEAN NOT NULL,
    "skinConditionDetails" TEXT,
    "isPregnantOrNursing" BOOLEAN NOT NULL,
    "hasHeartCondition" BOOLEAN NOT NULL,
    "hasDiabetes" BOOLEAN NOT NULL,
    "takesBloodThinners" BOOLEAN NOT NULL,
    "takesMedication" BOOLEAN NOT NULL,
    "medicationDetails" TEXT,
    "otherNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "bookingRequestId" TEXT NOT NULL,
    "isAdultConfirmed" BOOLEAN NOT NULL,
    "termsAccepted" BOOLEAN NOT NULL,
    "privacyAccepted" BOOLEAN NOT NULL,
    "fullName" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "bookingRequestId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT,
    "bytes" INTEGER,
    "cloudinaryPublicId" TEXT NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_isActive_idx" ON "AdminUser"("isActive");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_phone_idx" ON "Client"("phone");

-- CreateIndex
CREATE INDEX "BookingRequest_status_createdAt_idx" ON "BookingRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BookingRequest_clientId_createdAt_idx" ON "BookingRequest"("clientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalDeclaration_bookingRequestId_key" ON "MedicalDeclaration"("bookingRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Consent_bookingRequestId_key" ON "Consent"("bookingRequestId");

-- CreateIndex
CREATE INDEX "Upload_bookingRequestId_createdAt_idx" ON "Upload"("bookingRequestId", "createdAt");

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDeclaration" ADD CONSTRAINT "MedicalDeclaration_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_bookingRequestId_fkey" FOREIGN KEY ("bookingRequestId") REFERENCES "BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
