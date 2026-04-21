-- CCM-290 — Agent API + threaded replies
--
-- Adds:
--   1. `Project.agentToken` — plaintext token used by `/api/v1/agent/feedback`
--      handlers. Per user decision, stored in plaintext; comparisons at the
--      handler layer are still constant-time (timingSafeEqual).
--   2. `FeedbackReply` table — 1:N reply thread on `FeedbackItem` with
--      `source` in {"user", "agent"}, cascade-deletes with its parent.
--
-- Idempotent: safe to re-run against a database already at CCM-284 baseline
-- (uses ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS, and guarded
-- constraint / index creation).

-- 1. Project.agentToken — nullable plaintext column.
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "agentToken" TEXT;

-- 2. FeedbackReply table — threaded user/agent reply records.
CREATE TABLE IF NOT EXISTS "FeedbackReply" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "authorEmail" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackReply_pkey" PRIMARY KEY ("id")
);

-- 2a. Guarded FK — drop + re-add pattern fails on re-run, so only add when missing.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'FeedbackReply_feedbackId_fkey'
          AND table_name = 'FeedbackReply'
    ) THEN
        ALTER TABLE "FeedbackReply"
            ADD CONSTRAINT "FeedbackReply_feedbackId_fkey"
            FOREIGN KEY ("feedbackId") REFERENCES "FeedbackItem"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 3. Reply lookup index on the parent FK.
CREATE INDEX IF NOT EXISTS "FeedbackReply_feedbackId_idx" ON "FeedbackReply"("feedbackId");
