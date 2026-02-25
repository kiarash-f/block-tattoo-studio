-- AlterTable
ALTER TABLE "BookingRequest" ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "checkedInByAdminId" TEXT,
ADD COLUMN     "inStudioCompletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Consent" ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "submittedByAdminId" TEXT;

-- AlterTable
ALTER TABLE "MedicalDeclaration" ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "submittedByAdminId" TEXT;

-- CreateIndex
CREATE INDEX "BookingRequest_checkedInAt_idx" ON "BookingRequest"("checkedInAt");

-- CreateIndex
CREATE INDEX "BookingRequest_inStudioCompletedAt_idx" ON "BookingRequest"("inStudioCompletedAt");

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_checkedInByAdminId_fkey" FOREIGN KEY ("checkedInByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalDeclaration" ADD CONSTRAINT "MedicalDeclaration_submittedByAdminId_fkey" FOREIGN KEY ("submittedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_submittedByAdminId_fkey" FOREIGN KEY ("submittedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
