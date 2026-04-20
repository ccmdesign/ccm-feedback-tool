---
title: "Fix misleading comment in `apps/demo/src/lib/store.ts` about dynamic Prisma import"
priority: p3
status: done
source: ce-code-review (CCM-277)
resolved_in: "autofix commit — chore(review): autofix [CCM-277]"
---

> Resolved in-place by ce-code-review autofix mode. Kept as a record of the
> finding. The comment was rewritten to match the actual lazy-loading behavior.

## Problem

`apps/demo/src/lib/store.ts` lines 14-16:

```ts
 * - When `DATABASE_URL` is set, instantiate a `PrismaStore` wrapping the shared
 *   Prisma client (dynamic import keeps `@prisma/client` out of the
 *   memory-only code path).
```

The comment says "dynamic import keeps `@prisma/client` out of the memory-only code path." This is accurate in practice (the dynamic `await import("./prisma")` only runs in the `DATABASE_URL` branch), but `apps/demo/src/lib/prisma.ts:1` uses a **static** `import { PrismaClient } from "@prisma/client";`. A future reader scanning the codebase may assume both layers use dynamic imports and be surprised by the static top-level import in the singleton file.

The CCM-277 plan (Unit 8 approach note) explicitly said:

> Use a dynamic `await import("@prisma/client")` inside `resolveStore` so the bundle doesn't eagerly require Prisma at module evaluation time in memory mode.

The final implementation chained the laziness instead (`resolveStore` → dynamic import `./prisma` → `./prisma` statically imports `@prisma/client`). This is equivalent behavior but differs from the plan's literal wording.

## Fix

Update the comment to reflect reality:

```ts
 * - When `DATABASE_URL` is set, instantiate a `PrismaStore` wrapping the shared
 *   Prisma client. The Prisma singleton module (`./prisma`) is loaded lazily
 *   via `await import()` below, so memory-only deploys never evaluate the
 *   `import { PrismaClient } from "@prisma/client"` inside it.
```

No behavior change — this is a doc-accuracy fix.

## Verification

- `bun run check` still passes.
- `bun run build --filter=@ccm-feedback/demo` still produces a memory-mode bundle that does not pull `@prisma/client` eagerly (verify with `grep -r "PrismaClient" apps/demo/.next/server/` after a memory-mode build).

## Related files

- `apps/demo/src/lib/store.ts`
- `apps/demo/src/lib/prisma.ts`
