---
title: "Netlify build does not run `prisma generate` before Next build"
priority: p1
status: resolved
source: ce-code-review (CCM-277)
resolution: "Added `bunx prisma generate --schema=prisma/schema.prisma` to the Netlify build command in `netlify.toml` so the Prisma client is generated every deploy before `next build` runs."
---

## Problem

`netlify.toml` builds the demo with:

```
command = "cd ../.. && bun install --frozen-lockfile && bun run build --filter=@ccm-feedback/demo"
```

There is no `prisma generate --schema=../../prisma/schema.prisma` step. When `DATABASE_URL` is set on the Netlify site (the whole point of the toggle), the built demo imports `@prisma/client` via `apps/demo/src/lib/prisma.ts:1`. That package ships default stubs until `prisma generate` writes the real client to `node_modules/.prisma/client/`. First runtime request in Prisma mode crashes with:

> @prisma/client did not initialize yet. Please run "prisma generate".

Memory-mode deploys (no `DATABASE_URL`) still work because `./prisma` is only imported inside the `DATABASE_URL` branch of `resolveStore()`, so the unresolved client is never touched.

## Why this was missed

The plan defers "first `prisma db push`" to the orchestrator (one-time). `prisma generate` is required **every build**, not once. It is covered for local dev in `docs/local-dev.md` Section 3, but not in the CI/Netlify path.

## Fix options

Pick one:

1. **Add a build-time generate step in `netlify.toml`** (simplest):
   ```toml
   command = "cd ../.. && bun install --frozen-lockfile && bunx prisma generate --schema=prisma/schema.prisma && bun run build --filter=@ccm-feedback/demo"
   ```
2. **Add a `postinstall` script** on `apps/demo/package.json` (`"postinstall": "prisma generate --schema=../../prisma/schema.prisma"`). Runs on both CI and local installs. Watch for the "no DATABASE_URL at install time" case — `prisma generate` does not need a DB connection, so this is safe.
3. **Add a `prebuild` script** on the demo that runs `prisma generate` automatically.

Either (1) or (2) is fine. (2) is more portable across CI providers.

## Verification

- Redeploy with `DATABASE_URL` set on a Netlify preview.
- `curl https://<preview>/api/feedback` returns an empty list, not a 500 with the "did not initialize yet" message.
- Build log shows the `prisma generate` line writing to `node_modules/.prisma/client/`.

## Related files

- `netlify.toml` (repo root)
- `apps/demo/package.json`
- `apps/demo/src/lib/prisma.ts`
- `docs/local-dev.md` (mentions `prisma generate` for local dev only)
