-- Recreate BookingStatus enum with new values, migrating existing data

-- Step 1: Create new enum type
CREATE TYPE "BookingStatus_new" AS ENUM (
  'PENDING_CONSULT',
  'CONSULT_APPROVED',
  'CONSULT_NO_SHOW',
  'TATTOO_SCHEDULED',
  'COMPLETED',
  'CANCELLED'
);

-- Step 2: Migrate column using CASE (no ADD VALUE needed)
ALTER TABLE "BookingRequest"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "BookingStatus_new"
    USING CASE "status"::text
      WHEN 'NEW'        THEN 'PENDING_CONSULT'
      WHEN 'IN_REVIEW'  THEN 'PENDING_CONSULT'
      WHEN 'NEEDS_INFO' THEN 'PENDING_CONSULT'
      WHEN 'APPROVED'   THEN 'CONSULT_APPROVED'
      WHEN 'REJECTED'   THEN 'CANCELLED'
      WHEN 'COMPLETED'  THEN 'COMPLETED'
      WHEN 'CANCELLED'  THEN 'CANCELLED'
      ELSE 'PENDING_CONSULT'
    END::"BookingStatus_new",
  ALTER COLUMN "status" SET DEFAULT 'PENDING_CONSULT'::"BookingStatus_new";

-- Step 3: Swap types
DROP TYPE "BookingStatus";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";

-- Step 4: Add consultDate column
ALTER TABLE "BookingRequest" ADD COLUMN IF NOT EXISTS "consultDate" DATE;

-- Step 5: Index
CREATE INDEX IF NOT EXISTS "BookingRequest_consultDate_idx" ON "BookingRequest"("consultDate");
