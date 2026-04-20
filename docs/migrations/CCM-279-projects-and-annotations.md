# CCM-279 — Projects, ReviewBatch, annotation status

Ticket: CCM-279
Schema changes: `prisma/schema.prisma` + `packages/core/src/schema.ts`
Migration SQL: `prisma/migrations/ccm-279-projects-and-annotations/migration.sql`
Backfill script: `scripts/backfill-project-id.mjs`

## What this migration does

1. Creates `Project` and `ReviewBatch` tables with indexes + FKs.
2. Adds `FeedbackItem.projectId` (nullable, FK with `ON DELETE SET NULL`).
3. Adds `FeedbackAnnotation.status` (default `"submitted"`), `implementationResult` (JSONB), `implementationUpdatedAt` (timestamp).
4. Creates supporting indexes on `ReviewBatch.dispatchStatus,nextAttemptAt` and `FeedbackAnnotation.status`.
5. Leaves `FeedbackItem.projectName` in place for this release — removal is a follow-up.

## Pre-flight

- Supabase project: `ccm-feedback-prod` (ref `qnkvkumtssihbjmocbtv`).
- Take a Supabase snapshot (dashboard → project settings → snapshots).
- Confirm `DATABASE_URL` + `DIRECT_URL` are set for the environment you're migrating.

## Dev / staging (always run first)

```bash
# From the repo root with the prod .env exported:
export DATABASE_URL="...dev pooler URL..."
export DIRECT_URL="...dev direct URL..."

# Apply the schema migration
bunx prisma migrate deploy --schema=prisma/schema.prisma

# Backfill Project rows + FeedbackItem.projectId
bun scripts/backfill-project-id.mjs
```

Verify:

```sql
-- no feedbacks should be missing projectId after backfill
SELECT COUNT(*) FROM "FeedbackItem" WHERE "projectId" IS NULL;

-- one Project row per distinct projectName
SELECT COUNT(DISTINCT name) FROM "Project";
```

## Production

Only run this after the dev/staging rollout is confirmed healthy and the
Netlify deploy for this PR has succeeded.

```bash
export DATABASE_URL="...prod pooler URL..."
export DIRECT_URL="...prod direct URL..."

bunx prisma migrate deploy --schema=prisma/schema.prisma
bun scripts/backfill-project-id.mjs
```

Post-migration smoke:

- Sign in to `/admin` as `dev@ccmdesign.ca`.
- Confirm the project list shows one row per historical `projectName`.
- Open one project — `implementationWebhookUrl` is `null` (expected; admin fills it in later).
- Fill in an implementation webhook URL pointing at a known endpoint.
- Submit a test review via the widget and confirm the outbound payload arrives.

## Rollback plan

If the migration needs rolling back (schema is additive, so rollback is low-risk):

```sql
-- Drop new columns on FeedbackAnnotation
ALTER TABLE "FeedbackAnnotation" DROP COLUMN IF EXISTS "implementationUpdatedAt";
ALTER TABLE "FeedbackAnnotation" DROP COLUMN IF EXISTS "implementationResult";
ALTER TABLE "FeedbackAnnotation" DROP COLUMN IF EXISTS "status";

-- Drop FK + column on FeedbackItem
ALTER TABLE "FeedbackItem" DROP CONSTRAINT IF EXISTS "FeedbackItem_projectId_fkey";
ALTER TABLE "FeedbackItem" DROP COLUMN IF EXISTS "projectId";

-- Drop ReviewBatch + Project
DROP TABLE IF EXISTS "ReviewBatch";
DROP TABLE IF EXISTS "Project";
```

Application code guards against missing tables via feature flag (no admin
routes are reachable without `DATABASE_URL` pointing at a migrated DB), so
reverting the schema plus redeploying the previous app version is safe.
