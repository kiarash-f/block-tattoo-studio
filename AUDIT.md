# Production-Readiness Audit — Tattoo Studio API

**Date:** 2026-07-19 · **Branch:** `main` (post-`bf77084`) · **Scope:** full backend (`src/`, `prisma/`)
**Method:** manual code review — every controller, the full Prisma schema, all money paths, guards, webhook, config, and DTOs.
**Intentionally skipped (per instructions):** refund machinery absence, featured-guest null-clearing limitation, booking-analytics test tracking.

Severity meaning: **Critical** = money or data can be lost/abused today with realistic inputs · **High** = production incident waiting on load, concurrency, or an attacker · **Medium** = correctness/ops gap that will bite occasionally · **Low** = hygiene, consistency, hardening.

---

## CRITICAL

### C1 — Rate limiting is completely inert
**Files:** [src/app.module.ts:46](src/app.module.ts:46), [src/auth/auth.controller.ts:27](src/auth/auth.controller.ts:27)
`ThrottlerModule.forRoot` is configured and `@Throttle`/`@SkipThrottle` decorators are sprinkled on controllers, but **`ThrottlerGuard` is never registered** (no `APP_GUARD` provider, no `@UseGuards(ThrottlerGuard)` anywhere — verified by grep). Decorators without the guard do nothing. Every "rate limited" endpoint is actually unlimited: admin login (brute force), public chat (paid Anthropic calls), public booking intake, voucher purchase, guest-booking creation, token-guard argon2 verification.
Additionally, `@nestjs/throttler` v6 interprets `ttl` in **milliseconds** — `{ ttl: 60, limit: 20 }` would mean 20 requests per 60 *ms* even after the guard is added.
**Fix:** register `{ provide: APP_GUARD, useClass: ThrottlerGuard }` and change all `ttl` values to milliseconds (e.g. `60_000`).

### C2 — A customer can be charged with no Payment recorded, silently
**Files:** [src/stripe-webhook/stripe-webhook.service.ts:174](src/stripe-webhook/stripe-webhook.service.ts:174), [src/stripe-webhook/stripe-webhook.service.ts:290](src/stripe-webhook/stripe-webhook.service.ts:290), [src/guest-artist-bookings/guest-booking-expiry.service.ts:15](src/guest-artist-bookings/guest-booking-expiry.service.ts:15)
When the webhook finds the target *not* in `PENDING_PAYMENT`, it skips with a plain `logger.log` — no Sentry, no Payment row. Two realistic ways real money hits this path:
1. **Expiry race:** the cron expires guest bookings at exactly 24 h, and Stripe checkout sessions stay payable for ~24 h by default (no `expires_at` is set in [stripe.service.ts:54](src/stripe/stripe.service.ts:54), and sessions are never invalidated on expiry). A customer paying near/after the 24 h mark is charged; the booking is `EXPIRED`; the webhook skips; nobody is alerted.
2. **Duplicate sessions:** nothing prevents a second checkout session for the same target (e.g. two browser tabs before the voucher flow, or a re-created guest checkout). After the first payment confirms the target, the second session's payment is skipped the same way.
**Fix:** set Stripe `expires_at` shorter than the cron cutoff, expire sessions when expiring bookings, and escalate every "skipped but money received" branch to `Sentry.captureException`.

### C3 — Guest-table availability check is not concurrency-safe (overbooking)
**File:** [src/guest-artist-bookings/guest-artist-bookings.service.ts:142](src/guest-artist-bookings/guest-artist-bookings.service.ts:142)
The check-then-insert runs inside `$transaction` at default READ COMMITTED isolation: two concurrent requests both read the same "tables free" state, both pass, both insert — total booked tables exceeds `totalTables`. No DB constraint backs the invariant. The admin `update()` path ([line 269](src/guest-artist-bookings/guest-artist-bookings.service.ts:269)) doesn't re-check availability at all.
**Fix:** run the transaction at `Serializable` isolation (retry on P2034) or take an advisory lock keyed on the date range; add the availability check to admin updates.

---

## HIGH

### H1 — Artist double-booking TOCTOU on session scheduling
**Files:** [src/bookings/bookings.service.ts:286](src/bookings/bookings.service.ts:286), [src/bookings/bookings.service.ts:368](src/bookings/bookings.service.ts:368), [src/scheduling/scheduling.service.ts:218](src/scheduling/scheduling.service.ts:218), [src/scheduling/session-window.service.ts:103](src/scheduling/session-window.service.ts:103)
`assertNoArtistCollision` runs **before** the transaction that creates the session; two concurrent schedule/walk-in/edit calls for the same artist both pass and both insert overlapping windows. There is no DB-level exclusion constraint to catch what the app check misses.
**Fix:** move the check inside the transaction with an advisory lock per `(artistId, day)`, or add a Postgres `EXCLUDE USING gist` constraint on `(artistId, tsrange(startsAt, endsAt))`.

### H2 — Guest-booking money is Float, not integer cents
**Files:** [prisma/schema.prisma:581](prisma/schema.prisma:581) (`GuestArtistBooking.totalPrice Float`), [prisma/schema.prisma:567](prisma/schema.prisma:567) (`StationConfig.pricePerDay Float`), [src/guest-artist-bookings/guest-artist-bookings.service.ts:132](src/guest-artist-bookings/guest-artist-bookings.service.ts:132), [src/stripe-webhook/stripe-webhook.service.ts:183](src/stripe-webhook/stripe-webhook.service.ts:183)
The project's own rule ("integer cents everywhere, never Float") is violated on the guest-table path: price computed with float multiplication + `parseFloat(toFixed(2))`, stored as Float, then compared against Stripe's integer cents via `Math.round(totalPrice * 100)` in the webhook. A float artifact that survives `toFixed` rounding differently than the checkout amount lands in the C2 "amount mismatch" branch.
**Fix:** migrate to `totalPriceCents Int` / `pricePerDayCents Int`, compute in integer cents with explicit rounding at one point.

### H3 — Unauthenticated capacity exhaustion + unbounded date loops (guest bookings)
**Files:** [src/guest-artist-bookings/guest-artist-bookings.service.ts:113](src/guest-artist-bookings/guest-artist-bookings.service.ts:113), [src/guest-artist-bookings/guest-artist-bookings.service.ts:57](src/guest-artist-bookings/guest-artist-bookings.service.ts:57), [src/guest-artist-bookings/dto/create-guest-booking.dto.ts:40](src/guest-artist-bookings/dto/create-guest-booking.dto.ts:40)
`POST /guest-bookings` is public and each created `PENDING_PAYMENT` booking **holds real table capacity for 24 hours** with zero payment — with C1, an attacker (or a bored competitor) can block every table indefinitely for free by re-posting daily. Separately, the DTO caps neither the date span nor a sane `numberOfTables` upper bound: `startDate=2026-01-01&endDate=2126-01-01` makes `eachDay` iterate ~36,500 times per overlapping booking in both availability and create paths — CPU burn on an unauthenticated route.
**Fix:** cap range length (e.g. ≤ 90 days) and `numberOfTables` in the DTO; consider shorter holds (e.g. 2 h) for unpaid bookings.

### H4 — Revoked/deactivated admin access fails open
**Files:** [src/auth/jwt.strategy.ts:33](src/auth/jwt.strategy.ts:33), [src/auth/auth.service.ts:58](src/auth/auth.service.ts:58), [src/admin-users/admin-users.service.ts:97](src/admin-users/admin-users.service.ts:97)
Three compounding gaps: (1) `validate()` never checks `isActive`, so a deactivated admin keeps full access until the JWT expires (default 1 day); (2) password change does not revoke existing tokens; (3) the revocation blocklist lives in Redis with `throwOnConnectError: false` and `revokeTokens` swallows all errors (`catch {}`) — **if Redis is down, logout silently succeeds and revoked tokens keep working** (`isRevoked` returns false).
**Fix:** check `isActive` in the JWT strategy (or embed a token-version claim bumped on deactivate/password change), and make revocation failures loud.

### H5 — Cloudinary uploads run inside a Prisma interactive transaction
**File:** [src/public/public.service.ts:241](src/public/public.service.ts:241) (whole tx starts at [line 99](src/public/public.service.ts:99))
The public intake transaction performs up to 10 external HTTP uploads (10 MB each) *inside* `$transaction`. Prisma's default interactive-transaction timeout is 5 s — a normal multi-image submission on a slow connection to Cloudinary aborts the whole intake; meanwhile a DB connection is pinned for the duration (connection-pool starvation under load). The walk-in path ([bookings.service.ts:442](src/bookings/bookings.service.ts:442)) already does it correctly — uploads after commit.
**Fix:** mirror the walk-in pattern: commit the booking first, upload + insert `Upload` rows afterwards.

### H6 — Public chat is an unauthenticated paid-API proxy
**Files:** [src/chat/chat.controller.ts:12](src/chat/chat.controller.ts:12), [src/chat/chat.service.ts:86](src/chat/chat.service.ts:86)
`POST /public/chat` forwards up to 21 messages × 2,000 chars to Anthropic per request with no auth and (per C1) no working rate limit — unbounded spend on the studio's API key. Even the intended 20 req/min/IP allows ~29k requests/day/IP.
**Fix:** fix C1 first, then add a daily per-IP budget and/or a signed session token from the website; set `maxRetries`/`timeout` on the Anthropic client.

### H7 — Multi-purpose vouchers are taxed at the wrong time *(also §8.1 — CODE)*
**Files:** [src/stripe-webhook/stripe-webhook.service.ts:330](src/stripe-webhook/stripe-webhook.service.ts:330), [src/payments/payments.service.ts:270](src/payments/payments.service.ts:270)
The schema models `voucherTreatment` (SINGLE_PURPOSE / MULTI_PURPOSE) and snapshots it onto each sale, but **no payment-writing code ever reads it** (grep: zero references in webhook or payments service). Every voucher payment gets the full 19 % VAT split at sale. That is correct for single-purpose (§ 3 Abs. 14 UStG — and redemption correctly writes no Payment, verified at [voucher-sales.service.ts:74](src/vouchers/voucher-sales.service.ts:74)), but for a MULTI_PURPOSE voucher VAT is due at **redemption**, not sale (§ 3 Abs. 15 UStG). If any multi-purpose product is ever sold, the books are wrong.
**Fix (code):** either branch on `voucherTreatment` when recording the payment (0 % at sale, VAT at redemption) or hard-block creation/sale of MULTI_PURPOSE products until that exists.

---

## MEDIUM

### M1 — `cancelPayment` is a non-atomic read-then-update
**File:** [src/payments/payments.service.ts:219](src/payments/payments.service.ts:219)
Two concurrent cancels both pass the `status === PAID` check; the second overwrites `cancelledAt`/`cancelledByAdminId` and can double-append the reason to `note` — the audit trail records the wrong admin. The codebase already has the correct pattern (conditional `updateMany` in voucher redeem).
**Fix:** `updateMany({ where: { id, status: PAID }, ... })` and treat `count === 0` as the conflict signal.

### M2 — Cash payment endpoint has no double-submit protection
**File:** [src/payments/payments.service.ts:181](src/payments/payments.service.ts:181)
A double-click or retried request on `POST /admin/payments` creates two identical PAID rows — real revenue inflation that someone must notice and cancel manually. LINK payments are protected by the `stripeSessionId` unique key; cash has no equivalent.
**Fix:** accept a client-generated idempotency key stored in a unique column (or dedupe same target+amount+admin within a short window).

### M3 — Public intake can overwrite an existing client's PII
**File:** [src/public/public.service.ts:109](src/public/public.service.ts:109)
The unauthenticated intake form matches existing clients by email (then phone) via `findFirst` and **updates** `firstName`/`lastName`/`phone`/`birthday` on the matched row. Anyone who knows a client's email can silently rewrite that client's identity fields. Also, `Client.email` has no unique constraint, so concurrent intakes create duplicate clients.
**Fix:** on public intake, never mutate an existing client's identity fields (create a new row or only fill blanks); consider a unique index on lowercased email.

### M4 — Amount-mismatched guest payments still confirm the booking
**File:** [src/stripe-webhook/stripe-webhook.service.ts:204](src/stripe-webhook/stripe-webhook.service.ts:204)
On `amount_total !== expected`, the code deliberately confirms the booking and emails the customer while skipping the Payment row (Sentry'd). Documented, but the customer-visible outcome ("confirmed") diverges from the books ("no revenue recorded") and depends on a human reading Sentry. The voucher flow made the opposite (safer) choice.
**Fix:** consider matching the voucher behavior (hold, don't confirm) or auto-creating a flagged Payment row so revenue is never silently missing.
**Decision (2026-07-20):** Option A — match the voucher flow (hold, don't confirm, no email; Sentry + human resolution). Not yet implemented; behavior unchanged in the money-safety session. Rationale: with H2 fixed the comparison is exact integer cents end-to-end, so any remaining mismatch is precisely the suspicious case that should be held.

### M5 — Voucher-code delivery failure is a log line
**File:** [src/stripe-webhook/stripe-webhook.service.ts:353](src/stripe-webhook/stripe-webhook.service.ts:353)
The code is delivered *only* by email, post-commit, fire-and-forget. If Resend fails (or `RESEND_API_KEY` is unset — emails silently disabled at boot, [email.service.ts:67](src/email/email.service.ts:67)), the customer paid and got nothing; the only trace is `logger.error`. There is no resend endpoint.
**Fix:** report delivery failures to Sentry and add an admin "resend voucher email" action (the code is already retrievable via lookup-by-code).

### M6 — Three different day-boundary conventions across the API
**Files:** [src/payments/payments.service.ts:418](src/payments/payments.service.ts:418) (UTC days), [src/bookings/admin-analytics/admin-analytics.service.ts:110](src/bookings/admin-analytics/admin-analytics.service.ts:110) (Europe/Berlin days), [src/public/public.service.ts:179](src/public/public.service.ts:179) (server-local `setHours(0,0,0,0)` vs UTC-parsed date)
The payments list filters `paidAt` by UTC calendar days while revenue analytics uses Berlin days — the same query range returns different rows in the two admin views around midnight (2 h divergence in summer). The intake past-date/Sunday check mixes server-local "today" with a UTC-parsed consult date.
**Fix:** standardize on the existing tz-aware helpers (`zoned-date-range.ts`) for every date-range filter.

### M7 — Prisma exception filter logs nothing and mislabels server errors
**File:** [src/common/filters/prisma-exception.filter.ts:31](src/common/filters/prisma-exception.filter.ts:31)
Every unrecognized `PrismaClientKnownRequestError` becomes a generic 400 with no logging and no Sentry (the filter takes precedence over `SentryGlobalFilter` for these). Real database faults surface as "client error", invisible to both logs and monitoring — you cannot debug a failed payment write from logs alone.
**Fix:** log the code/message + `Sentry.captureException` for unhandled codes, and default unknown codes to 500, not 400.

### M8 — Health check checks nothing
**File:** [src/health/health.controller.ts:5](src/health/health.controller.ts:5)
`GET /health` returns `{ok:true}` unconditionally — Railway/orchestrator keeps routing traffic to an instance whose DB or Redis is gone.
**Fix:** probe `SELECT 1` (and optionally Redis) with a short timeout; return 503 on failure.

### M9 — No graceful shutdown
**File:** [src/main.ts:9](src/main.ts:9)
`app.enableShutdownHooks()` is never called: on SIGTERM (every deploy), `OnModuleDestroy` (Prisma `$disconnect`) doesn't run and in-flight requests — including payment webhooks — are cut mid-write.
**Fix:** call `app.enableShutdownHooks()` in bootstrap.

### M10 — Swagger UI is public in production
**File:** [src/main.ts:52](src/main.ts:52)
`/docs` exposes the complete admin API surface (routes, DTO shapes, auth scheme) to anyone, in every environment. Not a direct breach, but a free reconnaissance map.
**Fix:** gate Swagger behind `NODE_ENV !== 'production'` or basic auth.

### M11 — Malformed webhook metadata causes endless Stripe retries
**Files:** [src/stripe-webhook/stripe-webhook.service.ts:69](src/stripe-webhook/stripe-webhook.service.ts:69), [src/payments/payments.service.ts:266](src/payments/payments.service.ts:266)
`vat_rate_bps` is parsed with `Number()`; `NaN` flows into `recordPayment`, which throws `BadRequestException` → the webhook returns 4xx → Stripe retries the same immutable event for days. Same for any unexpected throw in a handler.
**Fix:** for unprocessable-but-verified events, log + Sentry + return 200 (the event will never become processable).

### M12 — Consult-slot capacity counts cancelled bookings (admin paths)
**Files:** [src/scheduling/scheduling.service.ts:59](src/scheduling/scheduling.service.ts:59), [src/scheduling/scheduling.service.ts:118](src/scheduling/scheduling.service.ts:118) vs [src/public/public.service.ts:307](src/public/public.service.ts:307)
The public availability endpoint counts only `PENDING_CONSULT`/`CONSULT_APPROVED`, but admin slot listing and `assignConsultSlot` count **all** bookings — cancelled consults permanently consume slot capacity in the admin view and can block assignment to a slot that's actually free. The capacity check itself is also read-then-write (minor race, admin-only).
**Fix:** apply the same status filter to `_count.bookings` in both admin paths.

### M13 — Uploads buffer fully in RAM with no global cap
**Files:** [src/public/public.controller.ts:186](src/public/public.controller.ts:186), [src/booking-links/public-booking.controller.ts:109](src/booking-links/public-booking.controller.ts:109)
`memoryStorage` with 10 × 10 MB per request means one request can hold 100 MB; a handful of concurrent (unauthenticated, un-throttled per C1) uploads OOM a small container.
**Fix:** rely on the C1 fix + reduce per-file/per-request limits, or stream to Cloudinary.

### M14 — Every transactional email failure is silently swallowed
**Files:** [src/bookings/bookings.service.ts:245](src/bookings/bookings.service.ts:245), [src/bookings/bookings.service.ts:329](src/bookings/bookings.service.ts:329), [src/bookings/bookings.service.ts:474](src/bookings/bookings.service.ts:474), [src/public/public.service.ts:280](src/public/public.service.ts:280), [src/scheduling/scheduling.service.ts:145](src/scheduling/scheduling.service.ts:145)
`.catch(() => void 0)` — not even a log line. Clients silently never learn their consult date or cancellation. (The webhook's email sends at least log; nothing reports to Sentry.)
**Fix:** replace with a shared `.catch(err => { logger.error(...); Sentry.captureException(err); })` helper.

### M15 — Stripe client: no timeout, no retries, no idempotency key
**File:** [src/stripe/stripe.service.ts:33](src/stripe/stripe.service.ts:33)
The SDK defaults to `maxNetworkRetries: 0` and an 80 s request timeout; a network blip fails the purchase after the sale row was created (orphan `PENDING_PAYMENT`), and a client retry can mint multiple sessions for one sale (see C2-2).
**Fix:** configure `maxNetworkRetries: 2`, `timeout: 15_000`, and pass an idempotency key derived from the target id.

### M16 — Analytics accepts unbounded date ranges
**Files:** [src/bookings/admin-analytics/dto/analytics-range-query.dto.ts:11](src/bookings/admin-analytics/dto/analytics-range-query.dto.ts:11), [src/bookings/admin-analytics/admin-analytics.service.ts:524](src/bookings/admin-analytics/admin-analytics.service.ts:524)
`from=0001-01-01&to=9999-12-31&granularity=day` builds ~3.6 M bucket objects and loads every row in range with no limit. Admin-authenticated, so abuse requires a token — but one stray frontend bug freezes the API.
**Fix:** reject ranges longer than e.g. 366 days per granularity in the DTO or service.

### M17 — No request logging / correlation IDs
**Files:** [src/main.ts](src/main.ts), app-wide
There is no HTTP access log and no request ID; debugging "the payment that failed yesterday at 14:32" relies on scattered per-service `logger` lines and whatever Railway captures. Combined with M7 (DB errors invisible), a failed payment is often *not* reconstructable from logs alone.
**Fix:** add a logging interceptor/middleware (method, path, status, duration, requestId) and include the requestId in error responses.

---

## LOW

### L1 — Login timing allows user enumeration
[src/auth/auth.service.ts:21](src/auth/auth.service.ts:21) — unknown email returns fast (no bcrypt), known email pays a bcrypt compare. **Fix:** always run a dummy compare.

### L2 — Admin bootstrap endpoint is unusable
[src/admin-users/admin-users.controller.ts:31](src/admin-users/admin-users.controller.ts:31) — `POST /admin/users/seed` ("creates the first admin") requires a valid admin JWT, which cannot exist yet. First admin can only be created via direct DB access. **Fix:** decide — either make seed unauthenticated-but-self-disabling (it already refuses when any admin exists) or delete it and document the DB path.

### L3 — Config/comment drift
[src/config/env.validation.ts:7](src/config/env.validation.ts:7) PORT default 3000 vs [src/main.ts:64](src/main.ts:64) fallback 3102; [src/main.ts:10](src/main.ts:10) says "Shopify webhook"; [src/payments/payments.service.ts:84](src/payments/payments.service.ts:84) and [:491](src/payments/payments.service.ts:491) still say vouchers "don't exist yet". **Fix:** align and delete stale comments.

### L4 — Observability config gaps
[src/instrument.ts:4](src/instrument.ts:4) — `SENTRY_DSN` isn't in the Joi schema (silently unset = Sentry off), no `environment`/`release`/`tracesSampleRate`; `REDIS_URL` is read in [app.module.ts:57](src/app.module.ts:57) but not validated. **Fix:** validate the vars; tag Sentry with environment + release.

### L5 — Public-token verification is expensive and writes per request
[src/booking-links/booking-links.service.ts:129](src/booking-links/booking-links.service.ts:129) — every guarded request costs a 19 MB argon2 verify plus an unconditional `useCount` UPDATE. A junk-token flood burns CPU (mitigated once C1 is fixed). **Fix:** rate-limit + consider making the usage write fire-and-forget.

### L6 — Upload MIME checks trust the client header
[src/public/public.controller.ts:199](src/public/public.controller.ts:199) — `f.mimetype` comes from the request; no magic-byte sniffing. Cloudinary's `resource_type: 'image'` re-validates server-side, so impact is low. **Fix:** optional magic-byte check.

### L7 — Admin guest-booking edits skip availability and reprice at current rates
[src/guest-artist-bookings/guest-artist-bookings.service.ts:269](src/guest-artist-bookings/guest-artist-bookings.service.ts:269) — date/table changes bypass the capacity check (overbooking by admin) and recalc `totalPrice` from *today's* `StationConfig`, silently repricing an already-agreed booking.

### L8 — Unbounded list endpoints
[src/scheduling/scheduling.service.ts:56](src/scheduling/scheduling.service.ts:56) (`listConsultSlots` — every slot ever, no pagination), [src/scheduling/scheduling.service.ts:157](src/scheduling/scheduling.service.ts:157), [src/admin-users/admin-users.service.ts:49](src/admin-users/admin-users.service.ts:49). Fine today, unbounded growth later.

### L9 — Chat system prompt contains hard-coded placeholder studio data
[src/chat/chat.service.ts:10](src/chat/chat.service.ts:10) — name "Ink & Soul", Köln address, phone, artists, and prices are baked into code and look like sample data. If real, prices/hours drift from reality without a deploy; if placeholder, the bot lies in production. **Fix:** move to config/DB and verify contents.

### L10 — Collision check is scoped to one UTC day
[src/session-window.service.ts:80](src/scheduling/session-window.service.ts:80) — a window crossing midnight is only checked against its `scheduledDate` day; an overlap with the next calendar day's sessions passes.

### L11 — An admin can deactivate any admin, including the last one
[src/admin-users/admin-users.service.ts:88](src/admin-users/admin-users.service.ts:88) — no self/last-admin protection; full lockout possible (recoverable only via DB).

### L12 — Password policy is length ≥ 8 only
[src/admin-users/dto/create-admin-user.dto.ts](src/admin-users/dto/create-admin-user.dto.ts) — no max length either (bcrypt silently truncates at 72 bytes). Low, admin-only accounts.

### L13 — Walk-in silently rewrites matched client records and fabricates budget
[src/bookings/bookings.service.ts:386](src/bookings/bookings.service.ts:386) — same overwrite behavior as M3 (admin-initiated, so lower risk); missing `budgetRange` defaults to `UNDER_200` ([line 413](src/bookings/bookings.service.ts:413)), fabricating analytics data.

### L14 — Cash voucher payments are impossible
[src/payments/dto/create-payment.dto.ts](src/payments/dto/create-payment.dto.ts) — the DTO has no `voucherSaleId`, so a voucher sold at the counter for cash can't be recorded (and `createCashPayment` never passes it). If intentional, document it; if not, add the field.

---

## §8 — German legal & regulatory (code-level)

> Each item is tagged **CODE** (fixable in this repo) and/or **BUSINESS/LEGAL** (a question for the studio's Steuerberater/lawyer — flagged, not interpreted).

### 8.1 VAT / UStG — mostly correct, one real defect
- ✅ **Single-purpose vouchers are taxed at sale, not redemption** — verified: the webhook records the VAT-split Payment when the sale is paid ([stripe-webhook.service.ts:330](src/stripe-webhook/stripe-webhook.service.ts:330)), and redemption is a pure status flip that writes **no** Payment ([voucher-sales.service.ts:74](src/vouchers/voucher-sales.service.ts:74)). No double taxation.
- ✅ **Per-transaction VAT storage is USt-Voranmeldung-ready:** every Payment snapshots `grossCents/netCents/vatAmountCents/vatRateBps` with the enforced invariant `net + vat = gross` ([payments.service.ts:72](src/payments/payments.service.ts:72)); analytics groups by `vatRateBps` ([admin-analytics.service.ts:393](src/bookings/admin-analytics/admin-analytics.service.ts:393)).
- ✅ **CODE — FIXED (2026-07-22):** Multi-purpose vouchers (H7) are now hard-blocked on BOTH creation/update (`VoucherProductsService.assertTreatmentSupported`) and sale (`VoucherPurchaseService.purchase` rejects `MULTI_PURPOSE`), so no voucher can be sold with mis-timed VAT. The proper §3 Abs. 15 redemption-time VAT path is still not built — remove both blocks together when it lands.
- ⚠️ **BUSINESS/LEGAL:** confirm with the Steuerberater that 19 % is the right rate for *all* current payment types (tattoo services, guest-table rental — table/space rental can have different VAT treatment than services; I am not asserting which applies).

### 8.2 Invoicing / §14 UStG — foundation built (2026-07-22)
**CODE + BUSINESS/LEGAL.** Originally: no invoice model, no number sequence, nothing.
**Now built (foundation, no PDF yet):** an `Invoice` model created in the SAME transaction as every PAID `Payment` (cash + webhook), snapshotting the §14 mandatory fields (studio identity + tax number from config, invoice date, net/VAT/gross + rate, best-available customer). Numbers are **per-year, gap-free**, allocated by the DB via an `InvoiceCounter` row (`INSERT … ON CONFLICT DO UPDATE … RETURNING`) inside the payment transaction — concurrent payments serialize on the counter row lock and a rolled-back payment returns its number to the pool. Fetch via `GET /admin/payments/:id/invoice`. Historical (pre-deploy) payments are **not** backfilled. Deferred: PDF rendering; invoice cancellation/Storno (see §8.3); full B2B recipient address. Whether receipts suffice for which sales: Steuerberater.

### 8.3 GoBD / AO §147 — good bones, several gaps
- ✅ Payments have no delete endpoint; cancellation is a status change preserving amounts; `createdByAdminId`/`cancelledByAdminId`/`cancelledAt` give a who/when trail; `createdAt` vs backdatable `paidAt` are separate, so entry time is preserved.
- ✅ **CODE — FIXED (2026-07-22):** `cancelPayment` no longer rewrites `note`. The reason goes in its own set-once `Payment.cancellationReason` field, written once on the atomic PAID→CANCELLED conditional update; the original `note` is untouched.
- ✅ **CODE — FIXED (2026-07-22):** `paidAt` on the cash path is now bounded — rejected if in the future (5 min skew allowance) or before `PAYMENTS_GO_LIVE_DATE`. The webhook always stamps `now()`, so it's unaffected.
- ✅ **CODE — FIXED (2026-07-22):** `GuestArtistBooking` and `TattooSession` are now soft-deleted (`archivedAt` timestamp) instead of hard-deleted; every active view + availability/collision/analytics query filters `archivedAt = null`, so an archived row frees its capacity while staying for financial context.
- ⚠️ **CODE — DEFERRED (invoice cancellation / Storno):** once an invoice is issued for a PAID payment (§8.2), cancelling that payment (PAID→CANCELLED) does **not** retract the invoice. Under German law an issued invoice is never deleted — retracting it requires a Storno/correction (credit note), which this session does **not** build. We record `cancellationReason`, but a cancelled payment leaves a live invoice number behind. This is a known gap, not an oversight — flag for the Steuerberater conversation.
- ⚠️ **BUSINESS/LEGAL:** immutability is app-level only — the DB role can still `UPDATE` amounts, and there's no append-only audit log or hash chain. Whether app-level controls satisfy GoBD for this business size, and the 10-year retention/export (DATEV) setup: Steuerberater.

### 8.4 Cash payments / KassenSichV — flag for the owner
**BUSINESS/LEGAL (explicitly not interpreting):** cash is recorded via `POST /admin/payments` into Postgres. Whether this constitutes an "elektronisches Aufzeichnungssystem" subject to KassenSichV/TSE certification is a Steuerberater question — raise it before go-live.
**CODE (tamper-evidence, current state):** amounts are not editable after creation (no update path touches `grossCents` — only status/note change) ✅; but there is no tamper-*evidence* (no hash chain / no versioning), and M2 (duplicate cash rows) plus unbounded `paidAt` backdating weaken the record's credibility.

### 8.5 GDPR / DSGVO
- ❌ **CODE — no erasure/anonymization path at all:** there is no endpoint to delete or anonymize a `Client`. The correct pattern for Art. 17 vs AO retention — anonymize the person, keep the financial rows — is unbuildable today. Add an anonymize action (blank client identity fields, keep bookings/payments).
- ⚠️ **CODE — Art. 9 health data:** `MedicalDeclaration` (allergies, pregnancy, heart condition, medication — [schema.prisma:315](prisma/schema.prisma:315)) is special-category data stored in plaintext with no retention policy and cascade-deleted with its booking. Define retention (BUSINESS: how long must tattoo medical/consent records be kept — likely years, per liability) and restrict what admin list endpoints return it.
- ⚠️ **CODE — abandoned-purchase PII lives forever:** `PENDING_PAYMENT` voucher sales keep buyer name/email/shipping address indefinitely (no cleanup analog to the guest-booking expiry cron). Add an expiry/cleanup for never-paid sales.
- ❌ **CODE + BUSINESS — email marketing without consent machinery:** `POST /admin/campaigns` sends raw-HTML marketing to **every client with an email** ([campaigns.service.ts:34](src/campaigns/campaigns.service.ts:34)); there is no `marketingConsent` field anywhere, no unsubscribe link in the template, no suppression list, and no record of what was sent to whom (grep: zero hits for unsubscribe/opt-out/consent). Under UWG §7 + GDPR this is the single most fine-prone feature in the codebase. Code: consent flag + unsubscribe endpoint + audit. Business: confirm lawful basis for existing clients (Bestandskundenprivileg conditions are narrow — lawyer question).
- ✅ Logs and Sentry are clean: `sendDefaultPii: false`, log lines use record IDs rather than emails/names; the public payment-status endpoint deliberately returns no amounts/customer data.
- ⚠️ **BUSINESS:** public chat messages (whatever visitors type, potentially personal/health data pre-tattoo) are forwarded to Anthropic ([chat.service.ts:86](src/chat/chat.service.ts:86)) — must appear in the privacy policy / AVV list. Stripe as processor is expected and fine; only `customer_email` is sent ✅.

### 8.6 Distance selling / §312g BGB (voucher shop)
**CODE + BUSINESS/LEGAL.** The voucher shop is an online consumer sale, so a 14-day Widerruf presumptively applies — and **the backend cannot execute one**: nothing ever sets `VoucherStatus.CANCELLED` (grep: only *read* at [voucher-sales.service.ts:94](src/vouchers/voucher-sales.service.ts:94)), and there is no refund flow (known/by design). Minimum code: an admin action that cancels a sale (status → CANCELLED, blocking redemption) and records the money side per the future refund design. Whether any §312g exception applies to these vouchers: lawyer question — flagged, not answered.

### 8.7 Price display / PAngV
✅ Backend amounts are consistently **gross** (VAT is derived *from* the inclusive amount everywhere — `computeVatSplit` divides gross by 1.19), so public catalog prices (`priceCents` on voucher products, `pricePerDay` for tables) are VAT-inclusive as PAngV requires. **CODE (low):** nothing in the API/Swagger *labels* them as gross — document it so the frontend doesn't accidentally add VAT on top. Final display compliance ("inkl. MwSt." labels) is a frontend/BUSINESS concern.

### 8.8 Consent/waiver signature (adjacent, noticed in passing)
**BUSINESS/LEGAL:** the in-studio consent stores only a typed `fullName` + timestamp ([schema.prisma:353](prisma/schema.prisma:353)) — no signature image/hash. Whether that suffices as bodily-injury consent documentation for tattooing: lawyer question.

---

## §7 — Testing gaps

**Decently covered:** payments service (VAT split, target invariant, balance, cancel, list — 37 cases), webhook idempotency/routing (small: 4 cases), session-window collision logic, voucher products/purchase/sales, bookings controller, analytics overview/timeseries, artists.

**Zero coverage on critical paths:**
| Path | Risk it leaves untested |
|---|---|
| [guest-artist-bookings.service.ts](src/guest-artist-bookings/guest-artist-bookings.service.ts) | availability math, overbooking (C3), float pricing (H2), expiry cron |
| [auth.service.ts](src/auth/auth.service.ts) / [jwt.strategy.ts](src/auth/jwt.strategy.ts) | login, revocation, Redis-down fail-open (H4) |
| [booking-links.service.ts](src/booking-links/booking-links.service.ts) | token validation, expiry, scope enforcement |
| [public.service.ts](src/public/public.service.ts) | intake transaction, client matching/overwrite (M3), consult-date rules |
| [bookings.service.ts](src/bookings/bookings.service.ts) | scheduleTattooSession, walk-in flow, status transitions (service level) |
| [campaigns.service.ts](src/campaigns/campaigns.service.ts) | audience resolution (who gets mass email) |
| [stripe-webhook.service.ts](src/stripe-webhook/stripe-webhook.service.ts) | amount-mismatch branches, voucher path, expiry race (C2) — spec covers only idempotency/routing |
| E2E | a single default `app.e2e-spec.ts` smoke test; no E2E for auth, webhook signature, or any money flow |

---

## Suggested fix-session grouping

1. **Money safety (C2, H2, M4, M11, M15):** webhook skip-alerting, session expiry, integer cents, Stripe client config.
2. **Concurrency (C3, H1, M1, M2, M12):** serializable/locked availability, DB exclusion constraint, conditional updates, cash idempotency.
3. **Security (C1, H3, H4, H6, M10):** ThrottlerGuard, JWT isActive/fail-closed revocation, DTO range caps, Swagger gating.
4. **Ops (M7, M8, M9, M14, M17, L4):** health probes, shutdown hooks, exception filter logging, email failure reporting, request logging, Sentry config.
5. **Legal-critical code (H7, 8.2, 8.5, 8.6):** voucherTreatment handling, invoice numbering, marketing consent + unsubscribe, client anonymization, voucher cancellation — schedule the Steuerberater conversation in parallel (8.1 rate question, 8.3 GoBD setup, 8.4 KassenSichV, 8.6 Widerruf, 8.8 consent form).
