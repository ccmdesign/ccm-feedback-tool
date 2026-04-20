---
title: "Local development"
type: runbook
---

# Local development

Runbook for working on CCM Feedback locally. Covers prereqs, the two store modes (memory and Supabase), unit tests, e2e tests, and common troubleshooting.

## Prerequisites

- **Bun** >= 1.3.11 (`brew install oven-sh/bun/bun` or see [bun.sh](https://bun.sh))
- **Node.js** >= 18 (Prisma and build scripts)
- Optional: **PostgreSQL 15+** locally, or a **Supabase** project (free tier is fine)

## 1. Clone + install

```bash
git clone https://github.com/ccmdesign/ccm-feedback-tool.git
cd ccm-feedback-tool
bun install
```

`bun install` regenerates `bun.lock` on first run after a scope rename; commit any lockfile changes you see.

## 2. Run the demo — memory store (no database)

```bash
cd apps/demo
bun run dev
```

Visit [http://localhost:3000/demo](http://localhost:3000/demo). The widget persists feedbacks in a singleton `MemoryStore` that auto-clears every 10 minutes. Good for quick iteration.

## 3. Run the demo — Supabase Postgres

### Set env vars

Copy `apps/demo/.env.example` to `apps/demo/.env.local` and fill in both connection strings:

```bash
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

- **`DATABASE_URL`** — pgbouncer pooler URL (port 6543). Used at runtime. Always set `pgbouncer=true&connection_limit=1`.
- **`DIRECT_URL`** — direct connection (port 5432). Used by `prisma generate`, `prisma db push`, and `prisma migrate`.

### Generate the Prisma client + push the schema

From the repo root:

```bash
bunx prisma generate --schema=prisma/schema.prisma
bunx prisma db push --schema=prisma/schema.prisma
```

`db push` creates `FeedbackItem` + `FeedbackAnnotation` tables (with indexes and the cascade relation). Re-run on schema changes.

### Start the demo

```bash
cd apps/demo
bun run dev
```

With `DATABASE_URL` set, the demo's `resolveStore()` instantiates `PrismaStore` and persists rows to Supabase. Without it, it falls back to the memory store.

## 4. Unit tests

```bash
bun run test        # watch mode
bun run test:run    # single run (CI)
bun run check       # TypeScript
bun run lint        # Biome
```

## 5. E2E tests (Playwright)

E2E tests run against the built widget bundle, not the demo:

```bash
bun run build       # builds packages/widget/dist/index.js
bun run test:e2e    # runs Playwright across Chromium/Firefox/WebKit
```

If Playwright browsers aren't installed: `bunx playwright install`.

## 6. TS source of truth for the Prisma schema

The canonical model definitions live in `packages/core/src/schema.ts` as `CCM_FEEDBACK_MODELS`. The hand-written `prisma/schema.prisma` mirrors this file field-for-field. If you change one, update the other and run the CLI's `sync` or regenerate the root schema.

## Troubleshooting

### Widget re-prompts for name/email after the rebrand

Expected. The CCM Feedback rebrand invalidated three localStorage keys:

- `siteping_identity` → `ccm_feedback_identity`
- `siteping_retry_queue` → `ccm_feedback_retry_queue`
- `siteping_feedbacks` → `ccm_feedback_items`

The previous identity is abandoned (one-time cost). Any in-flight retry-queue entries from the old key are lost.

### "Table 'FeedbackItem' not found"

Run `bunx prisma db push --schema=prisma/schema.prisma` against your current `DATABASE_URL` / `DIRECT_URL`.

### Stale Prisma client after renaming models

Delete `node_modules/.prisma` and re-run `bunx prisma generate --schema=prisma/schema.prisma`. This is only required after a model rename or a Prisma version bump.

### Debug widget logs

The widget prints lifecycle logs with a `[ccm-feedback]` prefix when `debug: true` is set on `initCcmFeedback()`. Filter your browser console on `[ccm-feedback]` to isolate them.

### E2E suite hangs waiting for a selector

The e2e server serves the widget IIFE bundle. If you see missing selectors:

1. Rebuild the widget: `bun run build --filter=@ccm-feedback/widget`
2. Verify `packages/widget/dist/index.js` exists
3. Re-run `bun run test:e2e`
