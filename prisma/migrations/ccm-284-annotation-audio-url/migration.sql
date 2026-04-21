-- CCM-284 — Voice comment pipeline: FeedbackAnnotation.audioUrl
--
-- Idempotent: re-running the migration against a database that already has
-- the column is a no-op. Follows the CCM-279 style (ADD COLUMN IF NOT EXISTS).
-- See commit 39adade for the idempotence pattern.

ALTER TABLE "FeedbackAnnotation" ADD COLUMN IF NOT EXISTS "audioUrl" TEXT;
