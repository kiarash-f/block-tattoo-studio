-- CreateIndex
CREATE INDEX "BookingRequest_createdAt_idx" ON "BookingRequest"("createdAt");

-- CreateIndex
CREATE INDEX "BookingRequest_source_createdAt_idx" ON "BookingRequest"("source", "createdAt");
