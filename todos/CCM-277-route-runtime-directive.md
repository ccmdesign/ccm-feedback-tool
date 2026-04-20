---
title: "Add explicit `runtime = 'nodejs'` + `dynamic = 'force-dynamic'` on `/api/feedback` route"
priority: p3
status: ready
source: ce-code-review (CCM-277)
---

## Problem

`apps/demo/src/app/api/feedback/route.ts` does not export `runtime` or `dynamic` directives. The file uses:

- Top-level `await resolveStore()` at module scope
- A static chain to `@prisma/client` when `DATABASE_URL` is set
- A GET handler that reads from whichever store is resolved

Next 15 App Router defaults are generally correct here (Node runtime for imports that cannot run on Edge; dynamic for routes that read request state), but behavior under `output: "standalone"` + Netlify's `@netlify/plugin-nextjs` has historically been sensitive. An explicit declaration removes any chance of accidental static optimization.

This is not a regression — the pre-rename route also lacked these directives — but the rebrand PR is a natural moment to tighten it while touching the file.

## Fix

```ts
import { createCcmFeedbackHandler } from "@ccm-feedback/adapter-prisma";
import { resolveStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const store = await resolveStore();

export const { GET, POST, PATCH, DELETE, OPTIONS } = createCcmFeedbackHandler({ store });
```

`force-dynamic` ensures the feedback list is not cached by Next's Data Cache across projects. `nodejs` runtime is needed anyway because `@prisma/client` cannot run on Edge.

## Verification

- `bun run build --filter=@ccm-feedback/demo` succeeds with the directives.
- Deploy to a Netlify preview and observe no-cache headers on `/api/feedback` GET responses.

## Related files

- `apps/demo/src/app/api/feedback/route.ts`
- `apps/demo/next.config.ts`
