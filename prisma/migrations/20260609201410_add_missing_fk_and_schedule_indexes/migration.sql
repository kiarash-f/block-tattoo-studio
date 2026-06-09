-- CreateIndex
CREATE INDEX "BookingAssignment_startsAt_idx" ON "BookingAssignment"("startsAt");

-- CreateIndex
CREATE INDEX "BookingAssignment_role_startsAt_idx" ON "BookingAssignment"("role", "startsAt");

-- CreateIndex
CREATE INDEX "BookingLinkToken_createdByAdminId_idx" ON "BookingLinkToken"("createdByAdminId");

-- CreateIndex
CREATE INDEX "BookingRequest_reviewedByAdminId_idx" ON "BookingRequest"("reviewedByAdminId");

-- CreateIndex
CREATE INDEX "BookingRequest_checkedInByAdminId_idx" ON "BookingRequest"("checkedInByAdminId");

-- CreateIndex
CREATE INDEX "TattooSession_stationId_idx" ON "TattooSession"("stationId");
