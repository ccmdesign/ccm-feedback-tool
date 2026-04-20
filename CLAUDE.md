# @ccm-feedback/*

## Build & Test
- `bun install` — install dependencies (bun workspaces)
- `bun run build` — build all packages via Turborepo + tsup (cached)
- `bun run check` — TypeScript type-checking via Turborepo (cached)
- `bun run clean` — clean all dist/ directories
- `bun run test` — run tests in watch mode
- `bun run test:run` — run tests once
- `bun run lint` — biome check
- `bun run lint:fix` — biome auto-fix

## Architecture
- **Monorepo** with bun workspaces — 6 packages in `packages/`:
  - `@ccm-feedback/core` — shared types, schema, store errors + helpers (internal, not published)
  - `@ccm-feedback/widget` — browser feedback widget (Shadow DOM, closed mode). Accepts `store` option for client-side mode (no server needed)
  - `@ccm-feedback/adapter-prisma` — server-side Prisma request handlers
  - `@ccm-feedback/adapter-memory` — in-memory adapter (testing, demos, serverless)
  - `@ccm-feedback/adapter-localstorage` — client-side localStorage adapter (demos, prototyping)
  - `@ccm-feedback/cli` — CLI tool for project setup (`ccm-feedback init/sync/status/doctor`)
- Widget uses Shadow DOM (mode: closed), overlay lives outside Shadow DOM
- DOM anchoring: @medv/finder CSS selector + XPath fallback + text snippet fallback
- Annotations stored as % relative to anchor element bounding box
- Core is an Internal Package (exports raw TS, no build step), bundled into consumers via `noExternal: ["@ccm-feedback/core"]` in tsup
- Turborepo handles build orchestration, dependency ordering (`^build`), and local caching
- Prisma schema lives at `prisma/schema.prisma` (repo root). Models: `FeedbackItem` + `FeedbackAnnotation`. Source of truth is `packages/core/src/schema.ts` (`CCM_FEEDBACK_MODELS`).
- Demo app (`apps/demo`) uses `resolveStore()` in `src/lib/store.ts` — picks `PrismaStore` when `DATABASE_URL` is set, falls back to the memory store otherwise.

## Code Style
- TypeScript strict mode with exactOptionalPropertyTypes
- Conventional Commits: `type(scope): description`
- i18n: English (default) and French locales

## Attribution
- CCM Feedback is a fork of [SitePing](https://github.com/NeosiaNexus/SitePing) by NeosiaNexus, MIT licensed.
- `LICENSE` preserves the original copyright. `NOTICE` documents the attribution. The README footer and the demo's landing footer both link to the upstream repo.
- The `upstream` git remote points at `NeosiaNexus/SitePing` and must not be modified.
