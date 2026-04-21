# CCM-282 — Annotation intents: text_change + image_swap

Ticket: CCM-282
Schema changes: `prisma/schema.prisma` + `packages/core/src/schema.ts`
Migration SQL: `prisma/migrations/ccm-282-annotation-intents/migration.sql`

## What this migration does

1. Adds `FeedbackAnnotation.type` (TEXT, default `'rectangle'`) — discriminator
   between `rectangle`, `text_change`, and `image_swap` intents.
2. Adds 7 nullable type-specific columns on `FeedbackAnnotation`:
   - `originalText`, `proposedText` — `text_change` text values.
   - `originalAssetUrl`, `proposedAssetUrl`, `proposedAssetSource`,
     `proposedAltText` — `image_swap` asset fields. `proposedAssetUrl` is
     always the CCM-hosted Supabase Storage mirror; `proposedAssetSource`
     is `'link'` (pasted URL, server-mirrored) or `'upload'` (direct
     signed-upload PUT).
   - `assetMeta` (JSONB) — `{ width, height, sizeBytes, mime }` canonicalized
     server-side after the mirror / upload completes.
3. Creates a `FeedbackAnnotation_type_idx` index to keep the admin filter
   efficient.

No data migration script is required — the `DEFAULT 'rectangle'` backfills
every existing row at column creation time, and all type-specific columns
stay NULL for rectangle annotations.

## Idempotency

- Every column addition uses `ADD COLUMN IF NOT EXISTS`.
- The index uses `CREATE INDEX IF NOT EXISTS`.
- No `ADD CONSTRAINT` statements in this migration. If a future revision adds
  one, wrap it in a `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN
  NULL; END $$;` block per the CCM-279 precedent.

To verify locally:

```bash
psql --single-transaction -f prisma/migrations/ccm-282-annotation-intents/migration.sql
psql --single-transaction -f prisma/migrations/ccm-282-annotation-intents/migration.sql
# Second run must succeed as a no-op.
```

## Storage bucket

This PR wires the `assets` Supabase Storage bucket (provisioned in CCM-277
but previously unused). The bucket MUST remain public-read so reviewer-facing
widget previews resolve without additional auth. Writes go through the
service-role admin client only.

Bucket policy (existing, left unchanged):

- Public read via `/storage/v1/object/public/assets/…`.
- Insert/update/delete: service role only.

## Pre-flight

- Supabase project: `ccm-feedback-prod` (ref `qnkvkumtssihbjmocbtv`).
- Take a Supabase snapshot before the prod deploy.
- Confirm `DATABASE_URL`, `DIRECT_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are
  set for the environment being migrated.
- Optional: set `CCM_STORAGE_ORIGIN` to override the computed
  `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/` prefix used
  by the webhook payload and the `proposedAssetUrl` refinement.

## Dev / staging (always run first)

```bash
export DATABASE_URL="...dev pooler URL..."
export DIRECT_URL="...dev direct URL..."

bunx prisma migrate deploy --schema=prisma/schema.prisma
```

Verify:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'FeedbackAnnotation'
  AND column_name IN (
    'type', 'originalText', 'proposedText',
    'originalAssetUrl', 'proposedAssetUrl', 'proposedAssetSource',
    'proposedAltText', 'assetMeta'
  )
ORDER BY column_name;
```

## Production

Only after dev/staging is verified healthy:

```bash
export DATABASE_URL="...prod pooler URL..."
export DIRECT_URL="...prod direct URL..."

bunx prisma migrate deploy --schema=prisma/schema.prisma
```

## Rollback plan

Safe because the migration is additive — every new column is nullable or
carries a DEFAULT.

```sql
DROP INDEX IF EXISTS "FeedbackAnnotation_type_idx";
ALTER TABLE "FeedbackAnnotation" DROP COLUMN IF EXISTS "assetMeta";
ALTER TABLE "FeedbackAnnotation" DROP COLUMN IF EXISTS "proposedAltText";
ALTER TABLE "FeedbackAnnotation" DROP COLUMN IF EXISTS "proposedAssetSource";
ALTER TABLE "FeedbackAnnotation" DROP COLUMN IF EXISTS "proposedAssetUrl";
ALTER TABLE "FeedbackAnnotation" DROP COLUMN IF EXISTS "originalAssetUrl";
ALTER TABLE "FeedbackAnnotation" DROP COLUMN IF EXISTS "proposedText";
ALTER TABLE "FeedbackAnnotation" DROP COLUMN IF EXISTS "originalText";
ALTER TABLE "FeedbackAnnotation" DROP COLUMN IF EXISTS "type";
```

Redeploying the previous app version + running the rollback SQL returns the
DB to the CCM-279 baseline.

## Environment variables introduced / required

| Var | Required | Default | Notes |
|---|---|---|---|
| `CCM_STORAGE_ORIGIN` | no | `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/` | Prefix enforced on `proposedAssetUrl` — widget uploads must be CCM-hosted. |
| `NEXT_PUBLIC_SUPABASE_URL` | yes (prod) | — | Used to derive the default storage origin. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (prod) | — | Server-only. Used by the mirror + sign-upload handlers. Must never ship to the widget. |

## Verification checklist (Unit 13)

- Edit text flow: activate edit mode, click a heading, change text, submit.
  Panel renders a word-level diff.
- Image swap via pasted URL: activate swap mode, click an `<img>`, paste an
  external URL, submit. Network log shows `POST /api/v1/assets/mirror`; panel
  renders old vs. new thumbnails; outbound webhook body carries
  `proposed_asset_url` rooted on the CCM storage origin.
- Image swap via file picker: activate swap mode, click an `<img>`, choose a
  local JPEG. Network log shows `POST /api/v1/assets/sign-upload` followed by
  a direct PUT to the signed URL. Panel renders old vs. new thumbnails.
- Oversized / wrong-MIME file: file picker rejection surfaces inline in the
  panel before any network request is made.
- Mock webhook body (dev): the mixed-type batch emits `text_change`
  annotations with `original_text` / `proposed_text` at annotation top level
  (NOT nested under `target`) and `image_swap` annotations with
  `original_asset_url` / `proposed_asset_url` / `proposed_asset_source` /
  `proposed_alt_text` / `asset_meta` at annotation top level.
