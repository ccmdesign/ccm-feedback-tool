-- CCM-279 — Project, ReviewBatch, and per-annotation status
--
-- Idempotent against a fresh CCM-277 baseline schema.
-- Run via `prisma migrate deploy` or apply directly through `psql --single-transaction`.
-- The follow-up backfill script (scripts/backfill-project-id.mjs) populates
-- Project rows from the existing FeedbackItem.projectName values and fills
-- FeedbackItem.projectId. FeedbackItem.projectName stays writable in this PR
-- and is scheduled for removal in a follow-up ticket.

-- 1. Project
CREATE TABLE IF NOT EXISTS "Project" (
  "id"                              TEXT NOT NULL,
  "name"                            TEXT NOT NULL,
  "stagingUrl"                      TEXT NOT NULL DEFAULT '',
  "implementationWebhookUrl"        TEXT,
  "implementationWebhookSecretHash" TEXT,
  "createdAt"                       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Project_name_key" ON "Project"("name");
CREATE INDEX IF NOT EXISTS "Project_name_idx" ON "Project"("name");

-- 2. ReviewBatch
CREATE TABLE IF NOT EXISTS "ReviewBatch" (
  "id"                 TEXT NOT NULL,
  "projectId"          TEXT NOT NULL,
  "reviewerName"       TEXT NOT NULL,
  "reviewerEmail"      TEXT,
  "submittedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dispatchStatus"     TEXT NOT NULL DEFAULT 'pending',
  "dispatchAttempts"   INTEGER NOT NULL DEFAULT 0,
  "dispatchedAt"       TIMESTAMP(3),
  "nextAttemptAt"      TIMESTAMP(3),
  "dispatchLastError"  TEXT,
  "canonicalBody"      TEXT,
  "annotationIds"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  CONSTRAINT "ReviewBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReviewBatch_projectId_idx" ON "ReviewBatch"("projectId");
CREATE INDEX IF NOT EXISTS "ReviewBatch_dispatchStatus_idx" ON "ReviewBatch"("dispatchStatus");
CREATE INDEX IF NOT EXISTS "ReviewBatch_dispatchStatus_nextAttemptAt_idx"
  ON "ReviewBatch"("dispatchStatus", "nextAttemptAt");

-- Postgres < 17 has no `ADD CONSTRAINT IF NOT EXISTS`; wrap each
-- `ADD CONSTRAINT` in a DO block so re-running the migration against a db
-- that already has the FK doesn't raise `duplicate_object` and abort the
-- enclosing transaction.
DO $$ BEGIN
  ALTER TABLE "ReviewBatch"
    ADD CONSTRAINT "ReviewBatch_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. FeedbackItem additions
ALTER TABLE "FeedbackItem" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
CREATE INDEX IF NOT EXISTS "FeedbackItem_projectId_idx" ON "FeedbackItem"("projectId");
DO $$ BEGIN
  ALTER TABLE "FeedbackItem"
    ADD CONSTRAINT "FeedbackItem_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. FeedbackAnnotation additions
ALTER TABLE "FeedbackAnnotation" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'submitted';
ALTER TABLE "FeedbackAnnotation" ADD COLUMN IF NOT EXISTS "implementationResult" JSONB;
ALTER TABLE "FeedbackAnnotation" ADD COLUMN IF NOT EXISTS "implementationUpdatedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "FeedbackAnnotation_status_idx" ON "FeedbackAnnotation"("status");
