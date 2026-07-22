-- M2: give cash payments the same double-submit protection the unique
-- stripeSessionId already gives LINK payments.
--
-- Nullable + UNIQUE: Postgres treats every NULL as distinct, so existing rows
-- and any cash payment whose client doesn't send a key are unconstrained. Only
-- callers that opt in by supplying a key get the one-row-per-intent guarantee,
-- which is what keeps this migration safe on production data (no backfill, no
-- collision possible among the NULLs).
ALTER TABLE "Payment" ADD COLUMN "cashIdempotencyKey" TEXT;
CREATE UNIQUE INDEX "Payment_cashIdempotencyKey_key" ON "Payment"("cashIdempotencyKey");
