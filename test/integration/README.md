# Concurrency integration tests

These specs run against a **real Postgres**. They exist to prove that advisory
locks and unique constraints actually serialize concurrent writers — a mocked
Prisma can only confirm that the code calls the functions we wrote, never that
the database enforces anything.

They are excluded from `npm test` (which globs `src/**/*.spec.ts`; these are
`*.int-spec.ts` under `test/`) and **skip themselves entirely when
`TEST_DATABASE_URL` is unset**, so CI and everyday `npm test` stay green
without Postgres.

## Running them

```bash
# 1. Throwaway database (port 55432 avoids clashing with a local dev Postgres)
docker run -d --name tattoo-test-pg \
  -e POSTGRES_USER=testuser -e POSTGRES_PASSWORD=testpass -e POSTGRES_DB=tattoo_test \
  -p 55432:5432 postgres:16-alpine

# 2. Schema
DATABASE_URL="postgresql://testuser:testpass@localhost:55432/tattoo_test?schema=public" \
  npx prisma migrate deploy

# 3. Tests
TEST_DATABASE_URL="postgresql://testuser:testpass@localhost:55432/tattoo_test?schema=public" \
  npm run test:int

# 4. Teardown
docker rm -f tattoo-test-pg
```

Each spec truncates the tables it touches in `beforeEach`, and the runner is
pinned to `maxWorkers: 1` so parallel *suites* can't be mistaken for the
parallel *calls* under test.

`test:int` runs Jest under `--experimental-vm-modules`: `createWalkIn` does a
post-commit `await import('argon2')` for the upload token, which Jest's CJS VM
cannot resolve without it. Unrelated to the concurrency being tested — without
the flag the walk-in commits correctly and then fails on the import.

## What each spec pins down

| Spec | Audit item | Property proven |
|---|---|---|
| `guest-booking-race` | C3 | Per-day booked tables never exceed `totalTables`, across parallel public creates, a burst of 8, and an admin edit racing a public create |
| `artist-session-race` | H1 | An artist never holds two overlapping sessions, across parallel schedule / walk-in / edit calls; different artists still proceed in parallel |
| `payment-race` | M1, M2 | One cancel wins and owns the audit trail; one idempotency key yields exactly one payment even under simultaneous submits |

## The CONTROL tests

`guest-booking-race` and `artist-session-race` each open with a test named
`CONTROL:` that re-implements the **pre-fix** code path and asserts that it
**does** overbook / double-book.

They are the reason the other tests mean anything. A race test that passes
because the race never occurred is indistinguishable from one that passes
because the fix works — the controls fail loudly if the harness ever stops
reproducing the original bug (e.g. if fixtures drift so the two calls stop
contending). They use a barrier to force the interleaving; the tests of the
fixed code deliberately do not, both because a barrier would deadlock against
a real lock and because correctness must not depend on a particular timing.
