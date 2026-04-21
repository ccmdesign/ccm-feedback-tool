-- CCM-282 — Annotation intent discriminator + type-specific columns
--
-- Adds a "type" discriminator column (default "rectangle") plus 7 nullable
-- type-specific columns on FeedbackAnnotation so the model can carry
-- text_change and image_swap intents in addition to the existing rectangle
-- pin. Default backfills every existing row to "rectangle" — no data
-- migration script required.
--
-- Idempotent against a schema already at the CCM-279 baseline. Run via
-- `prisma migrate deploy` or apply directly through `psql --single-transaction`.

-- 1. Discriminator + type-specific columns on FeedbackAnnotation
ALTER TABLE "FeedbackAnnotation" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'rectangle';
ALTER TABLE "FeedbackAnnotation" ADD COLUMN IF NOT EXISTS "originalText" TEXT;
ALTER TABLE "FeedbackAnnotation" ADD COLUMN IF NOT EXISTS "proposedText" TEXT;
ALTER TABLE "FeedbackAnnotation" ADD COLUMN IF NOT EXISTS "originalAssetUrl" TEXT;
ALTER TABLE "FeedbackAnnotation" ADD COLUMN IF NOT EXISTS "proposedAssetUrl" TEXT;
ALTER TABLE "FeedbackAnnotation" ADD COLUMN IF NOT EXISTS "proposedAssetSource" TEXT;
ALTER TABLE "FeedbackAnnotation" ADD COLUMN IF NOT EXISTS "proposedAltText" TEXT;
ALTER TABLE "FeedbackAnnotation" ADD COLUMN IF NOT EXISTS "assetMeta" JSONB;

-- 2. Index on the discriminator so the admin filter stays efficient.
CREATE INDEX IF NOT EXISTS "FeedbackAnnotation_type_idx" ON "FeedbackAnnotation"("type");

-- 3. Guard: mirror the pattern from CCM-279 for any future ADD CONSTRAINT so
-- re-runs don't raise `duplicate_object`. This migration only adds columns +
-- an index, so no constraint blocks are required yet. Leaving the comment
-- for the next author.
