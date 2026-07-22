-- Legal-critical code: §14 UStG invoicing + GoBD (§8.3) gaps.
-- ALL ADDITIVE — new tables + new nullable columns only. No column is dropped,
-- retyped, or backfilled, so this is safe to apply to production data with no
-- downtime and nothing to migrate.

-- ─── §8.3 (a): cancellation reason in its own field (never rewrite `note`) ────
ALTER TABLE "Payment" ADD COLUMN "cancellationReason" TEXT;

-- ─── §8.3 (c): soft-delete columns (records feed payments — never hard-delete) ─
ALTER TABLE "GuestArtistBooking" ADD COLUMN "archivedAt" TIMESTAMP(3);
CREATE INDEX "GuestArtistBooking_archivedAt_idx" ON "GuestArtistBooking"("archivedAt");

ALTER TABLE "TattooSession" ADD COLUMN "archivedAt" TIMESTAMP(3);
CREATE INDEX "TattooSession_archivedAt_idx" ON "TattooSession"("archivedAt");

-- ─── §8.2: gap-free invoice counter ──────────────────────────────────────────
-- One row per year holding the last number issued. Rows are created lazily by
-- the first invoice of each year via INSERT ... ON CONFLICT DO UPDATE, so there
-- is nothing to seed. Mutated ONLY by that atomic statement (inside the payment
-- transaction), never read-then-written in app code — that atomicity + the row
-- lock is what makes the sequence gap-free under concurrency and rollback.
CREATE TABLE "InvoiceCounter" (
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceCounter_pkey" PRIMARY KEY ("year")
);

-- ─── §14 UStG invoice: one immutable snapshot per PAID payment ────────────────
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "formattedNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studioName" TEXT NOT NULL,
    "studioAddress" TEXT NOT NULL,
    "studioTaxNumber" TEXT NOT NULL,
    "studioPhone" TEXT,
    "studioWebsite" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "netCents" INTEGER NOT NULL,
    "vatAmountCents" INTEGER NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "vatRateBps" INTEGER NOT NULL,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "source" "PaymentSource" NOT NULL,
    "reference" TEXT,
    "paymentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- One invoice per payment; unique display id; the (year, number) gap-free sequence.
CREATE UNIQUE INDEX "Invoice_formattedNumber_key" ON "Invoice"("formattedNumber");
CREATE UNIQUE INDEX "Invoice_paymentId_key" ON "Invoice"("paymentId");
CREATE UNIQUE INDEX "Invoice_year_number_key" ON "Invoice"("year", "number");
CREATE INDEX "Invoice_issuedAt_idx" ON "Invoice"("issuedAt");

-- Payments are never deleted; Restrict keeps an invoice from being orphaned.
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
