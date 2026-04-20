---
priority: p2
status: ready
origin: ce-code-review autofix (CCM-279)
run_id: 20260420-150800-d7209778
---

# CCM-279 — `ADD CONSTRAINT` statements in migration SQL are not idempotent

## Severity: P2 (migration safety)

## File

- `prisma/migrations/ccm-279-projects-and-annotations/migration.sql`

## Problem

The migration comment claims idempotency against a fresh CCM-277 baseline:

```sql
-- Idempotent against a fresh CCM-277 baseline schema.
-- Run via `prisma migrate deploy` or apply directly through `psql --single-transaction`.
```

Most statements use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`,
and `ADD COLUMN IF NOT EXISTS`, which re-run cleanly. But two `ALTER TABLE …
ADD CONSTRAINT` blocks do not — Postgres does not support `IF NOT EXISTS`
on constraints pre-17:

```sql
ALTER TABLE "ReviewBatch"
  ADD CONSTRAINT "ReviewBatch_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeedbackItem"
  ADD CONSTRAINT "FeedbackItem_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

Re-running the migration against a database that already has these
constraints raises `duplicate_object` and aborts the whole transaction
when using `--single-transaction`. Against `prisma migrate deploy` the
migration is never re-applied, so this is latent — but the migration is
also executed by hand in the runbook for emergency rollouts.

## Fix

Wrap each `ADD CONSTRAINT` in a `DO $$ ... EXCEPTION WHEN duplicate_object`
block, or test for existence against `pg_catalog.pg_constraint`:

```sql
DO $$ BEGIN
  ALTER TABLE "ReviewBatch"
    ADD CONSTRAINT "ReviewBatch_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FeedbackItem"
    ADD CONSTRAINT "FeedbackItem_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
```

## Acceptance

- Run the migration twice against a fresh database via
  `psql --single-transaction -f migration.sql`; both runs must complete
  without error and leave the schema identical.
- `prisma migrate deploy` still applies the migration on a clean db.
- Document the test in `docs/migrations/CCM-279-projects-and-annotations.md`.
