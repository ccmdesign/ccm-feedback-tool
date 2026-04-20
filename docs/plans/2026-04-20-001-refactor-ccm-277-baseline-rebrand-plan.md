---
title: "CCM-277 Baseline: rebrand to ccm-feedback + Supabase/Netlify wiring"
type: refactor
status: active
date: 2026-04-20
linear: CCM-277
---

# CCM-277 Baseline: rebrand to ccm-feedback + Supabase/Netlify wiring

## Overview

This plan covers the code/repo work required to make CCM-277 landable as a single PR. It renames every package, symbol, element, storage key, log prefix, Prisma model, CLI binary, and brand surface from `siteping` / `@siteping/*` to `ccm-feedback` / `@ccm-feedback/*`, wires a Supabase-ready Prisma datasource and demo toggle, adds Netlify build config for `feedback.ccmdesign.ca`, and preserves MIT attribution to the upstream SitePing project.

Out of scope for this plan (handled by the orchestrator via MCPs after the plan is implemented):

- Supabase project provisioning (`ccm-feedback-dev`, `ccm-feedback-prod`)
- `prisma db push` execution against either environment
- Storage bucket provisioning (`assets`)
- Netlify site creation, DNS, TLS, custom domain binding
- Publishing the renamed packages to npm

## Problem Frame

The repo is a fork of `NeosiaNexus/SitePing`. The target is a CCM-branded internal feedback tool that will be deployed at `feedback.ccmdesign.ca`, backed by Supabase Postgres. This baseline ticket is the precondition for every subsequent CCM-Feedback ticket — nothing else in the roadmap can ship until the rename is clean and the demo is deployable.

The rename is mostly mechanical but has three non-mechanical pieces that need design before execution:

1. **Prisma schema source of truth** — no `schema.prisma` exists in this repo yet (the CLI generates one into consumer projects). The demo needs a schema to run against Supabase, and the repo wants a single place to describe the `FeedbackItem` / `FeedbackAnnotation` tables.
2. **Demo store toggle** — the demo currently uses a `MemoryStore` singleton for simplicity. To satisfy the acceptance criterion ("Submitting feedback on the deployed demo persists a row to Supabase Postgres") without breaking local dev, the route handler needs to pick between memory and Prisma based on `DATABASE_URL`.
3. **Attribution** — MIT license requires keeping the original `LICENSE` copyright intact. We add a `NOTICE` file and a README footer so attribution is visible without forcing us to keep "SitePing" strings everywhere.

## Requirements Trace

- **R1.** Every workspace package is renamed from `@siteping/*` to `@ccm-feedback/*`, and every import site uses the new scope.
- **R2.** The custom element is `<ccm-feedback-widget>`.
- **R3.** The public API is `initCcmFeedback()`.
- **R4.** Prisma models are `FeedbackItem` and `FeedbackAnnotation`.
- **R5.** The CLI binary is `ccm-feedback`.
- **R6.** A `prisma/schema.prisma` exists that can be pushed to Supabase (pooler URL + `directUrl`).
- **R7.** `.env.example` documents Supabase-style connection strings, and `docs/local-dev.md` explains how to run locally (memory + Supabase paths).
- **R8.** A `netlify.toml` at the repo root builds `apps/demo` so Netlify MCP can deploy it without extra configuration.
- **R9.** MIT attribution to `NeosiaNexus/SitePing` is preserved in `LICENSE`, a new `NOTICE`, and a README footer. No other `siteping` strings remain in source.
- **R10.** `bun run build && bun run test:run && bun run test:e2e` all pass with the new names.
- **R11.** `git remote get-url upstream` still points at `NeosiaNexus/SitePing` (confirmed, not modified).

## Scope Boundaries

- No behavioral changes to the widget, adapters, or CLI logic — this is a rename + baseline wiring plan.
- No new features (bulk export, sort, stats, etc. stay exactly as they are).
- No API surface changes beyond the renames listed in Key Technical Decisions.
- Running `prisma migrate` / `prisma db push` is not part of this plan — the schema is wired and committed, execution is an orchestrator step.
- Publishing renamed packages to npm is not part of this plan.

### Deferred to Separate Tasks

- **Supabase provisioning** (`ccm-feedback-dev`, `ccm-feedback-prod`, bucket `assets`): orchestrator via Supabase MCP.
- **Netlify site creation and DNS/TLS for `feedback.ccmdesign.ca`**: orchestrator via Netlify MCP after this PR merges.
- **First `prisma db push` against each Supabase env**: orchestrator runs this after Supabase provisioning, using the wired datasource.
- **npm publish of renamed packages**: follow-up ticket — release-please config is already per-package-component so existing machinery works.
- **Spec-driven feature work** (voice notes, proposed-edit mode, structured change-request contract from `docs/spec.md`): subsequent CCM tickets, not part of P0 baseline.

## Context & Research

### Relevant Code and Patterns

- **Monorepo layout**: bun workspaces + Turborepo. Root `package.json` declares `workspaces: ["packages/*", "apps/*"]`. Internal dep linkage is via `"workspace:*"`.
- **Core package is "internal"**: `packages/core/package.json` has `"private": true` and exports raw TS from `./src/index.ts`. Every downstream package bundles it via tsup `noExternal: ["@siteping/core"]` in `packages/widget/tsup.config.ts` and reads it at build time. After rename the noExternal entry becomes `@ccm-feedback/core`.
- **Widget tsup config** (`packages/widget/tsup.config.ts`) has `globalName: "SitePing"` for the IIFE build — rename to `CcmFeedback`.
- **Custom element creation** happens only in one place: `packages/widget/src/launcher.ts:126` (`document.createElement("siteping-widget")`) and `:36` in a JSDoc comment.
- **Prisma schema source of truth** is `packages/core/src/schema.ts` — a TS data structure `SITEPING_MODELS` with models `SitepingFeedback` / `SitepingAnnotation`. The CLI's prisma-ast generator (`packages/cli/src/generators/prisma.ts`) converts this into consumer projects' `schema.prisma`. After rename we can also materialize the schema into `prisma/schema.prisma` at the repo root for the demo.
- **Adapter Prisma client shape** (`packages/adapter-prisma/src/index.ts`) defines `SitepingPrismaClient` with `sitepingFeedback: { create, findMany, ... }` — this client accessor renames to `feedbackItem` because Prisma derives it from the model name (`FeedbackItem` → `feedbackItem`).
- **Handler factory** is `createSitepingHandler()` from `packages/adapter-prisma/src/index.ts`.
- **Demo store toggle** currently doesn't exist — `apps/demo/src/app/api/siteping/route.ts` hardcodes `memoryStore` from `apps/demo/src/lib/memory-store.ts`. We add a prisma-backed path selected by env.
- **i18n strings with brand**: `packages/widget/src/i18n/en.ts:6,40` and `fr.ts:6,40` contain "Siteping" in ARIA labels and FAB tooltip. `packages/widget/src/i18n/index.ts:25` has a `[siteping]` console.warn prefix.
- **localStorage keys**: three of them — `siteping_identity` (`packages/widget/src/identity.ts:1`), `siteping_retry_queue` (`packages/widget/src/api-client.ts:22,67`), `siteping_feedbacks` (`packages/adapter-localstorage/src/index.ts:15,18`).
- **CLI entry** is `packages/cli/src/index.ts` using `commander`. Binary declared in `packages/cli/package.json` as `"bin": { "siteping": "./dist/index.js" }`.
- **E2E harness**: `e2e/server.mjs` reads `packages/widget/dist/index.js` and serves an HTML page. `e2e/widget.spec.ts` waits for `siteping-widget` selector at line 7/9/28/35 and elsewhere.
- **Demo package** already exists at `apps/demo` as Next.js 15 App Router with `output: "standalone"` — compatible with Netlify's Next.js plugin.
- **CI workflows** at `.github/workflows/ci.yml` and `release.yml` — the latter's output keys are of the form `packages/widget--release_created` (path-based, not name-based), so renaming npm scope does not require rewriting workflow outputs.
- **release-please config** (`release-please-config.json`) uses per-package components (`core`, `widget`, ...). Component names are cosmetic labels in commit/release titles — they don't need to change. Manifest versions carry over.
- **Existing `docs/spec.md`** outlines the longer-term CCM Feedback Tool vision but is explicitly not a requirements doc for CCM-277 — the ticket body itself is the source of truth for P0.

### Institutional Learnings

None applicable — no `docs/solutions/` directory in this repo.

### External References

- Supabase Prisma guide recommends pooler URL (`DATABASE_URL`, pgbouncer, port 6543) for runtime and a `directUrl` (port 5432) for migrations. Prisma 6 supports `directUrl` on the datasource block.
- Netlify Next.js plugin auto-handles `output: "standalone"`. For a monorepo, `netlify.toml` needs `base = "apps/demo"` or a `build.command` + `publish` pair targeting the demo's build output.
- MIT license only requires the copyright notice and permission text to be preserved in copies and substantial portions. A `NOTICE` file and README footer referencing the original is a common pattern for MIT forks.

## Key Technical Decisions

- **Symbol renames (locked by ticket):**
  - `@siteping/*` → `@ccm-feedback/*` (npm scope for all 6 packages)
  - `siteping-widget` → `ccm-feedback-widget` (custom element)
  - `initSiteping` → `initCcmFeedback` (public API)
  - `SitepingConfig` → `CcmFeedbackConfig`
  - `SitepingInstance` → `CcmFeedbackInstance`
  - `SitepingStore` → `CcmFeedbackStore`
  - `SitepingPublicEvents` → `CcmFeedbackPublicEvents`
  - `SitepingPrismaClient` → `CcmFeedbackPrismaClient`
  - `createSitepingHandler` → `createCcmFeedbackHandler`
  - `SITEPING_MODELS` → `CCM_FEEDBACK_MODELS`
  - `SitepingFeedback` model → `FeedbackItem` (Prisma accessor `prisma.feedbackItem`)
  - `SitepingAnnotation` model → `FeedbackAnnotation` (Prisma accessor `prisma.feedbackAnnotation`)
  - IIFE global `SitePing` → `CcmFeedback` (in widget tsup)
  - CLI binary `siteping` → `ccm-feedback`
- **localStorage key renames:** `siteping_identity` → `ccm_feedback_identity`; `siteping_retry_queue` → `ccm_feedback_retry_queue`; `siteping_feedbacks` → `ccm_feedback_items`. No migration shim — this is a baseline rebrand and existing local data (identity, pending retries) is acceptable to invalidate. Call out in `docs/local-dev.md` and the README footer.
- **Log prefix:** `[siteping]` → `[ccm-feedback]`.
- **API route path:** `apps/demo/src/app/api/siteping/route.ts` → `apps/demo/src/app/api/feedback/route.ts`. Widget `endpoint` in `apps/demo/src/app/demo/widget-init.tsx` changes to `/api/feedback`. CLI route generator in `packages/cli/src/generators/route.ts` creates `app/api/feedback/route.ts` by default.
- **Prisma schema lives at repo root `prisma/schema.prisma`.** Reasoning: the demo is currently the only consumer in this repo, but a root-level schema is easier to document, easier for orchestrator scripts to find, and matches Supabase CLI conventions. `apps/demo/package.json` gets a `prisma` scripts block that points at `../../prisma/schema.prisma`. The CLI's `syncPrismaModels` function still works for external consumers and also serves as the generator we can point at `prisma/schema.prisma` once in a CLI-backed helper (or hand-write and keep in sync).
- **Demo store toggle:** at API-route construction time, if `process.env.DATABASE_URL` is set, instantiate `PrismaStore` from `@ccm-feedback/adapter-prisma` wrapping a `PrismaClient`; otherwise fall back to the memory store. Adding `@prisma/client` as a runtime dep of `apps/demo`. `PrismaClient` instantiation uses the Next.js-friendly singleton pattern (`globalThis.__prisma`).
- **Netlify config:** single `netlify.toml` at repo root with `[build] base = "apps/demo"`, `command = "cd ../.. && bun install --frozen-lockfile && bun run build --filter=@ccm-feedback/demo"`, and `publish = ".next"`. The `@netlify/plugin-nextjs` plugin is pinned in `[[plugins]]`. This lets Netlify MCP attach a site without further surgery.
- **Attribution strategy:** keep `LICENSE` byte-identical (MIT Copyright 2025 NeosiaNexus). Add `NOTICE` at repo root. Add a short "Acknowledgements" footer to the root `README.md` linking to the upstream repo. Keep the `upstream` git remote.
- **release-please:** component labels (`core`, `widget`, ...) stay as-is — they're not npm names. `extra-files` pointer in cli config stays (`src/index.ts` still holds the version string). After merge, the next release-please run will produce a v0.x bump per package because only chore changes land.
- **Workspace dep version spec:** stays `workspace:*` (bun resolves to the new scope automatically once names change).
- **`next.config.ts` transpile list:** `transpilePackages: ["@siteping/core"]` → `["@ccm-feedback/core"]`.

## Open Questions

### Resolved During Planning

- **Which Prisma model names?** Locked by ticket: `FeedbackItem`, `FeedbackAnnotation`. Prisma auto-derives client accessors: `prisma.feedbackItem`, `prisma.feedbackAnnotation`.
- **Where does the Prisma schema live?** Repo root `prisma/schema.prisma` (see Key Technical Decisions).
- **Keep `LICENSE` copyright?** Yes — MIT requires it.
- **Drop brand strings from i18n or keep?** Strip — replace `"Siteping"` ARIA/FAB strings with generic `"Feedback"` wording (both locales). No new brand string is introduced at user-visible layer beyond the custom-element name and log prefix.
- **Migrate existing localStorage keys?** No — invalidate. Documented in `docs/local-dev.md`.
- **Does release-please need rewriting?** No — components are labels, not npm names. File paths referenced in `extra-files` still exist after rename.
- **Does the `bun.lock` need regenerating?** Yes — package names change, lock rewrites on `bun install`. Commit the new lockfile in the final workstream.

### Deferred to Implementation

- **Exact `netlify.toml` build command shape** — depends on Netlify MCP's preference between `base = "apps/demo"` with relative `command` versus a root-level command. Implementer should pick what actually works on a fresh Netlify site; both work in theory. Fallback: set `base = "apps/demo"` and use `command = "cd ../.. && bun install --frozen-lockfile && bun run build --filter=@ccm-feedback/demo"`.
- **Whether `prisma/schema.prisma` should be generated or hand-written.** Two valid paths: (a) hand-write the schema (~60 lines) and keep it in sync with `packages/core/src/schema.ts` via a CI check; (b) add a `scripts/generate-schema.mjs` that calls the CLI's `syncPrismaModels` against the root schema and runs in `bun run build`. Pick at implementation time. Hand-write is simpler; generator is safer long-term. If unclear, go with hand-write for this PR and file a follow-up to add the generator.
- **`apps/demo` Netlify env vars** — the set of env vars Netlify needs (`DATABASE_URL`, `DIRECT_URL`, anything else) is tracked in `.env.example`; Netlify MCP will copy them in at deploy time. No code decision required here.
- **Whether i18n should add French copy for any new CCM-specific strings.** There is no new user-facing string introduced by this plan beyond the rename — `"Feedback"` is already present in both locales. Confirm during implementation by skimming the final diff of `packages/widget/src/i18n/en.ts` and `fr.ts`.
- **Rename of the `__sitepingStore` globalThis key** in `apps/demo/src/lib/memory-store.ts` — rename to `__ccmFeedbackStore` for consistency; trivially verified by build + smoke test.

## Output Structure

New files created by this plan (repo root relative):

```
prisma/
  schema.prisma                       # FeedbackItem + FeedbackAnnotation, Postgres, url+directUrl

apps/demo/src/
  app/api/feedback/route.ts           # replaces .../api/siteping/route.ts — reads env to pick store
  lib/prisma.ts                       # PrismaClient singleton (new)
  lib/store.ts                        # picks MemoryStore vs PrismaStore from env (new)

docs/
  local-dev.md                        # new — how to run locally
  plans/2026-04-20-001-refactor-ccm-277-baseline-rebrand-plan.md  # this doc

netlify.toml                          # new — Netlify build config for apps/demo
NOTICE                                # new — MIT attribution
```

Files deleted:

```
apps/demo/src/app/api/siteping/route.ts   # replaced by .../api/feedback/route.ts
apps/demo/src/lib/memory-store.ts          # logic moves into src/lib/store.ts
```

Every other change is a rename or content edit in an existing file.

## Implementation Units

Units are ordered by dependency — later units depend on earlier ones having landed. Each unit is scoped to fit in one commit so the rename can be audited incrementally.

- [ ] **Unit 1: Rename `@siteping/core` package + symbols**

**Goal:** Flip the core package name, export surface symbol names (`SitepingConfig` → `CcmFeedbackConfig`, etc.), and the `SITEPING_MODELS` constant + Prisma model names.

**Requirements:** R1, R4

**Dependencies:** None

**Files:**
- Modify: `packages/core/package.json` (name, homepage, repo, bugs, keywords, author)
- Modify: `packages/core/src/index.ts` (re-exports)
- Modify: `packages/core/src/types.ts` (all `Siteping*` type names → `CcmFeedback*`; JSDoc `initSiteping` → `initCcmFeedback`; log prefix in `isStoreNotFound`/`isStoreDuplicate` comments)
- Modify: `packages/core/src/schema.ts` (`SITEPING_MODELS` → `CCM_FEEDBACK_MODELS`; `SitepingFeedback` → `FeedbackItem`; `SitepingAnnotation` → `FeedbackAnnotation`; update relation references)
- Modify: `packages/core/src/testing.ts` (rename any `Siteping*` references)
- Modify: `packages/core/README.md`, `packages/core/CHANGELOG.md`
- Test: `packages/core/__tests__/schema.test.ts` (expects new model/constant names)

**Approach:**
- Use `replace_all` for each symbol with a long enough unique anchor to avoid cross-package collisions.
- Keep the `"private": true` flag — core remains internal.
- The `relation.model` string values in `schema.ts` must match the new model names (`"FeedbackItem"` / `"FeedbackAnnotation"`), otherwise the generated Prisma schema will be broken.
- Do NOT touch `LICENSE` in the package dir (even though it says "SitePing" — the MIT terms require preserving copyright in copies).

**Patterns to follow:**
- Existing symbol-export pattern in `packages/core/src/index.ts`.
- `satisfies Record<string, ModelDef>` constraint on the models constant.

**Test scenarios:**
- Happy path: `packages/core/__tests__/schema.test.ts` enumerates `FeedbackItem.fields.id` and asserts `isId: true, default: "cuid()"`. The test file already covers a model iteration pattern — rename and re-assert against new model names.
- Happy path: the test asserts that `CCM_FEEDBACK_MODELS.FeedbackAnnotation.fields.feedback.relation.model === "FeedbackItem"`.
- Edge case: a test that confirms no model key still begins with `Siteping` (regression guard against partial renames).

**Verification:**
- `bun run --cwd packages/core check` passes (this package has no build).
- `bun run test:run packages/core` is green.
- Grep for `Siteping|siteping` inside `packages/core/` returns only `LICENSE`, `CHANGELOG.md` historical entries, and (intentionally) no source.

---

- [ ] **Unit 2: Rename `@siteping/widget` + symbols + custom element + IIFE global + localStorage keys**

**Goal:** Rename the widget package, its public `initSiteping` API, the custom element `siteping-widget`, the tsup IIFE global `SitePing`, and the two localStorage keys owned by the widget (`siteping_identity`, `siteping_retry_queue`). Update log prefixes and i18n brand strings.

**Requirements:** R1, R2, R3, R9

**Dependencies:** Unit 1 (core types imported here)

**Files:**
- Modify: `packages/widget/package.json` (name, keywords, homepage, repo, bugs, dep `"@siteping/core"` → `"@ccm-feedback/core"`)
- Modify: `packages/widget/tsup.config.ts` (`globalName: "SitePing"` → `"CcmFeedback"`; `noExternal: ["@medv/finder", "@ccm-feedback/core"]`)
- Modify: `packages/widget/src/index.ts` (imports from `@ccm-feedback/core`; export `initCcmFeedback`; JSDoc example uses new name)
- Modify: `packages/widget/src/launcher.ts` (`document.createElement("ccm-feedback-widget")`; log prefix; all `Siteping*` type imports)
- Modify: `packages/widget/src/identity.ts` (`STORAGE_KEY = "ccm_feedback_identity"`)
- Modify: `packages/widget/src/api-client.ts` (`RETRY_QUEUE_KEY = "ccm_feedback_retry_queue"`, `LOCK_NAME = "ccm_feedback_retry_queue"`)
- Modify: `packages/widget/src/markers.ts` (`this.container.id = "ccm-feedback-markers"`)
- Modify: `packages/widget/src/events.ts`, `packages/widget/src/tooltip.ts`, `packages/widget/src/panel*.ts`, `packages/widget/src/store-client.ts`, `packages/widget/src/fab.ts`, `packages/widget/src/annotator.ts`, `packages/widget/src/export-utils.ts`, `packages/widget/src/dom-utils.ts`, `packages/widget/src/icons.ts`, `packages/widget/src/popup.ts`, `packages/widget/src/styles/theme.ts`, `packages/widget/src/dom/anchor.ts`, `packages/widget/src/dom/resolver.ts` (all `@siteping/core` imports → `@ccm-feedback/core`; all `Siteping*` type refs → `CcmFeedback*`; all `[siteping]` log prefixes → `[ccm-feedback]`)
- Modify: `packages/widget/src/i18n/en.ts` (`"panel.ariaLabel": "Feedback panel"`, `"fab.aria": "Feedback menu"`)
- Modify: `packages/widget/src/i18n/fr.ts` (`"panel.ariaLabel": "Panneau de feedback"`, `"fab.aria": "Menu feedback"`)
- Modify: `packages/widget/src/i18n/index.ts` (log prefix)
- Modify: `packages/widget/README.md`, `packages/widget/CHANGELOG.md`
- Test: `packages/widget/__tests__/widget/launcher.test.ts`, `launcher-integration.test.ts`, `fab.test.ts`, `panel.test.ts`, `markers.test.ts`, `store-client.test.ts`, `api-client.test.ts`, `tooltip.test.ts`, `dom-utils.test.ts`, `packages/widget/__tests__/dom/resolver.test.ts` (update element selector, imports, localStorage keys, log-prefix assertions)

**Approach:**
- Treat `.ts` source files separately from `__tests__` files — same rules, but tests also need the new localStorage key names in spies.
- The IIFE global rename is cosmetic but checked by a few docs and potentially e2e — verify downstream consumers only reference it by `import` in ESM mode.
- The custom-element rename is the one that most affects tests — search `__tests__/` for any hardcoded `"siteping-widget"` string.

**Patterns to follow:**
- Existing singleton-guard pattern in `launcher.ts` (untouched by the rename).
- `createT()` i18n helper for any brand-free string changes.

**Test scenarios:**
- Happy path: `launcher-integration.test.ts` asserts `document.querySelector("ccm-feedback-widget")` returns the host element after init.
- Happy path: `api-client.test.ts` asserts retry-queue entries are written to `localStorage` under key `ccm_feedback_retry_queue`.
- Edge case: a guard test that instantiating with `debug: true` logs messages prefixed with `[ccm-feedback]`, not `[siteping]`.
- Error path: `api-client.test.ts` covers the existing failure cases — only the storage key name assertions change.

**Verification:**
- `bun run --cwd packages/widget build` produces `dist/index.js` with `var CcmFeedback = ...` in the IIFE wrapper (verify by grepping the minified output).
- `bun run test:run packages/widget` is green.
- No `siteping`/`SitePing` strings remain under `packages/widget/src/` or `packages/widget/__tests__/`.

---

- [ ] **Unit 3: Rename `@siteping/adapter-prisma` + handler factory + Prisma accessor**

**Goal:** Rename the adapter package, the `createSitepingHandler` factory, the `SitepingPrismaClient` shape, and the `sitepingFeedback` Prisma accessor to `feedbackItem` (auto-derived from `FeedbackItem`). Update validation and README.

**Requirements:** R1, R4, R5 (the CLI generator for the route references these)

**Dependencies:** Unit 1

**Files:**
- Modify: `packages/adapter-prisma/package.json` (name, keywords, homepage, repo, bugs, devDep `@siteping/core` → `@ccm-feedback/core`)
- Modify: `packages/adapter-prisma/src/index.ts`:
  - Imports from `@ccm-feedback/core`
  - `SitepingPrismaClient` interface → `CcmFeedbackPrismaClient`, key `sitepingFeedback` → `feedbackItem`
  - Class `PrismaStore`: every `this.prisma.sitepingFeedback.*` call becomes `this.prisma.feedbackItem.*` (7 sites)
  - `createSitepingHandler` → `createCcmFeedbackHandler`
  - Log prefix `[siteping]` → `[ccm-feedback]`
  - Error string `"Table 'SitepingFeedback' not found..."` → `"Table 'FeedbackItem' not found..."`
  - JSDoc example imports + endpoint path → `/api/feedback`
- Modify: `packages/adapter-prisma/src/validation.ts` (imports only)
- Modify: `packages/adapter-prisma/README.md`, `packages/adapter-prisma/CHANGELOG.md`
- Test: `packages/adapter-prisma/__tests__/handler.test.ts` (mocked `prisma.feedbackItem.*`; assert `createCcmFeedbackHandler` export)
- Test: `packages/adapter-prisma/__tests__/auth-cors.test.ts` (same rename of handler + mock accessor)

**Approach:**
- The mock in both test files shapes a fake `PrismaClient` with a `sitepingFeedback` object — rename the key to `feedbackItem`, and update every reference that destructures or calls it.
- The `isStoreNotFound` / `isStoreDuplicate` helpers live in core and are untouched here.

**Patterns to follow:**
- Existing `INCLUDE_ANNOTATIONS` constant and wrapping approach — unchanged.

**Test scenarios:**
- Happy path: `handler.test.ts` `POST /feedbacks` creates a record — `expect(prisma.feedbackItem.create).toHaveBeenCalledOnce()`.
- Error path: `handler.test.ts` `P2002` duplicate path — assert it resolves to 200 with existing record lookup via `prisma.feedbackItem.findUnique`.
- Error path: `auth-cors.test.ts` unchanged behavior beyond renames.
- Integration: the "Table 'FeedbackItem' not found" error message surfaces when `findMany` throws `P2021` — the existing test (if present) should assert the new string.

**Verification:**
- `bun run --cwd packages/adapter-prisma build` succeeds.
- `bun run test:run packages/adapter-prisma` is green.
- Grep of `siteping` under `packages/adapter-prisma/` returns zero hits in source or tests.

---

- [ ] **Unit 4: Rename `@siteping/adapter-memory` + `@siteping/adapter-localstorage`**

**Goal:** Rename both remaining storage adapters. Update the `adapter-localstorage` key (`siteping_feedbacks` → `ccm_feedback_items`) and the associated public API option.

**Requirements:** R1

**Dependencies:** Unit 1

**Files:**
- Modify: `packages/adapter-memory/package.json`, `packages/adapter-memory/src/index.ts`, `packages/adapter-memory/README.md`, `packages/adapter-memory/CHANGELOG.md`
- Modify: `packages/adapter-memory/__tests__/memory-store.test.ts` (imports)
- Modify: `packages/adapter-localstorage/package.json`, `packages/adapter-localstorage/src/index.ts` (`DEFAULT_KEY = "ccm_feedback_items"`; JSDoc `initSiteping` → `initCcmFeedback`; docs: the option called `keyPrefix` or similar — update comment)
- Modify: `packages/adapter-localstorage/README.md`, `packages/adapter-localstorage/CHANGELOG.md`
- Test: `packages/adapter-localstorage/__tests__/localstorage-store.test.ts` (asserts new default key)

**Approach:**
- These are small leaf packages. Single-pass rename per file.

**Patterns to follow:**
- Existing `SitepingStore` import pattern (now `CcmFeedbackStore`).

**Test scenarios:**
- Happy path: `localstorage-store.test.ts` asserts the default storage key is `ccm_feedback_items`.
- Happy path: `memory-store.test.ts` existing behavioral tests keep passing after import renames.
- Edge case: `localstorage-store.test.ts` covers custom-key override — confirm the test still works with the renamed default.

**Verification:**
- `bun run --cwd packages/adapter-memory build` and `bun run --cwd packages/adapter-localstorage build` succeed.
- `bun run test:run packages/adapter-memory packages/adapter-localstorage` is green.

---

- [ ] **Unit 5: Rename `@siteping/cli` + binary + command names + route generator**

**Goal:** Rename the CLI package, its binary to `ccm-feedback`, every help string and `siteping init` example, and update the route generator to create `app/api/feedback/route.ts` referencing `@ccm-feedback/adapter-prisma` + `createCcmFeedbackHandler`.

**Requirements:** R1, R5

**Dependencies:** Units 1, 3

**Files:**
- Modify: `packages/cli/package.json` (name, bin `"siteping"` → `"ccm-feedback"`, keywords, homepage, repo, bugs, devDep `@siteping/core` → `@ccm-feedback/core`)
- Modify: `packages/cli/src/index.ts` (`new Command().name("ccm-feedback")`, all examples, all `siteping` command examples in `addHelpText`)
- Modify: `packages/cli/src/commands/init.ts` (intro banner, messages, "Re-run `ccm-feedback init`" text, "Sync CCM Feedback models" prompt, docs URL — update to point at `ccmdesign/ccm-feedback-tool` repo)
- Modify: `packages/cli/src/commands/sync.ts`, `packages/cli/src/commands/status.ts`, `packages/cli/src/commands/doctor.ts` (all `siteping` references, default endpoint `/api/siteping` → `/api/feedback`)
- Modify: `packages/cli/src/generators/prisma.ts` (import `CCM_FEEDBACK_MODELS`)
- Modify: `packages/cli/src/generators/route.ts`:
  - `ROUTE_TEMPLATE` uses `import { createCcmFeedbackHandler } from "@ccm-feedback/adapter-prisma"`
  - `export const { GET, POST, PATCH, DELETE, OPTIONS } = createCcmFeedbackHandler({ prisma, /* apiKey: process.env.CCM_FEEDBACK_API_KEY */ })`
  - Output path `app/api/feedback/route.ts`
- Modify: `packages/cli/src/utils/find-schema.ts` (no rename expected — verify no `siteping` strings)
- Modify: `packages/cli/README.md`, `packages/cli/CHANGELOG.md`
- Test: `packages/cli/__tests__/generators/prisma.test.ts` (imports, expected model names in output), `packages/cli/__tests__/generators/route.test.ts` (expected output path + template content), `packages/cli/__tests__/commands/*.test.ts` (all four command tests), `packages/cli/__tests__/utils/find-schema.test.ts`

**Approach:**
- The `commander` program version is read from `src/index.ts` via release-please's `extra-files` pointer — leave the version string alone (`"0.4.3"` — release-please will bump it).
- `route.ts` template: the path segment `"siteping"` in `app/api/siteping/route.ts` becomes `"feedback"`. Update both the `routePath` join and the docstring.

**Patterns to follow:**
- Existing command-per-file structure — unchanged, just rename contents.
- `p.intro("ccm-feedback — Setup")` mirrors existing banner format.

**Test scenarios:**
- Happy path: `route.test.ts` asserts the generator writes `app/api/feedback/route.ts` with the new handler import and factory name.
- Happy path: `prisma.test.ts` asserts the generated schema contains `model FeedbackItem { ... }` and `model FeedbackAnnotation { ... }`.
- Happy path: `init.test.ts` asserts the intro banner and the rerun instruction use `ccm-feedback`.
- Edge case: `status.test.ts` and `doctor.test.ts` assert default endpoint is `/api/feedback`.
- Integration: running `ccm-feedback init` against a fixture Next.js project (if the test already does an end-to-end fixture) ends up with an api route under `app/api/feedback/` and a Prisma schema with the new model names.

**Verification:**
- `bun run --cwd packages/cli build` succeeds, and `packages/cli/dist/index.js` is executable with `#!/usr/bin/env node` shebang.
- `bun run test:run packages/cli` is green.
- Running the built CLI locally: `bun packages/cli/dist/index.js --help` prints `ccm-feedback` as the program name.

---

- [ ] **Unit 6: Update root workspace metadata + release-please**

**Goal:** Rename the root workspace package and update repo/homepage/bugs URLs to the CCM repo. Verify release-please config still works (it will — component labels are cosmetic).

**Requirements:** R1, R9

**Dependencies:** Units 1–5 (so the lockfile rewrite in Unit 11 has all the new names to resolve)

**Files:**
- Modify: `package.json` (`name: "ccm-feedback"`; `homepage: "https://feedback.ccmdesign.ca"`; `repository.url`/`bugs.url` → `https://github.com/ccmdesign/ccm-feedback-tool`; `author: "ccmdesign"`; keep packageManager pinned to bun 1.3.11)
- Modify: `release-please-config.json` (no component renames required; sanity-check component list matches new reality)
- Modify: `.release-please-manifest.json` (no change — versions carry over)
- Modify: `CHANGELOG.md` root (rewrite per-package bullets to the `@ccm-feedback/*` names)
- Modify: `tsconfig.json`, `tsconfig.base.json` (no change expected — verify they contain no `siteping` strings)

**Approach:**
- Leave `release-please-config.json` component names alone — they are string labels that appear in PR titles and are fine as `widget`, `core`, etc. If a cleanup is desired it can ship in a follow-up.

**Patterns to follow:**
- Existing root package.json structure.

**Test scenarios:**
- Test expectation: none — pure metadata change, covered by the verification grep sweep in Unit 11.

**Verification:**
- `bun install` from the worktree root rewrites `bun.lock` with the new scope names and zero `@siteping/*` entries. (Lock commit happens in Unit 11.)

---

- [ ] **Unit 7: Rewrite the demo app for rebrand + API route move**

**Goal:** Rename `@siteping/demo` → `@ccm-feedback/demo`, move API route from `/api/siteping` to `/api/feedback`, update all landing-page brand content, rewrite layout metadata for `feedback.ccmdesign.ca`, and rename the memory-store globalThis key.

**Requirements:** R1, R2, R3, R9

**Dependencies:** Units 1, 2, 3, 4

**Files:**
- Modify: `apps/demo/package.json` (`name: "@ccm-feedback/demo"`; deps `@siteping/*` → `@ccm-feedback/*`)
- Modify: `apps/demo/next.config.ts` (`transpilePackages: ["@ccm-feedback/core"]`)
- Create: `apps/demo/src/app/api/feedback/route.ts` (imports `@ccm-feedback/adapter-prisma`, uses the new `store` selection helper added in Unit 8)
- Delete: `apps/demo/src/app/api/siteping/route.ts`
- Modify: `apps/demo/src/app/demo/widget-init.tsx` (import `initCcmFeedback` from `@ccm-feedback/widget`; `endpoint: "/api/feedback"`)
- Modify: `apps/demo/src/app/layout.tsx` (metadata `metadataBase`, title, description, openGraph, twitter, theme-color if we want it — rebrand everything to "CCM Feedback"; domain `https://feedback.ccmdesign.ca`)
- Modify: `apps/demo/src/app/robots.ts`, `apps/demo/src/app/sitemap.ts` (domain + any brand strings)
- Modify: `apps/demo/src/app/demo/page.tsx` (any brand text)
- Modify: `apps/demo/src/components/demo/banner.tsx`
- Modify: `apps/demo/src/components/landing/{hero,hero-mockup,features,comparison,faq,cta-footer,footer,header,mobile-nav,package-manager-tabs,widget-dogfood}.tsx` (brand text, links, install snippets)
- Modify: `apps/demo/src/lib/memory-store.ts` → rename the `__sitepingStore` globalThis key to `__ccmFeedbackStore` (this file is refactored further in Unit 8)

**Approach:**
- Strip "SitePing" from user-visible copy. Replace with "CCM Feedback" or "Feedback" where the brand name is incidental.
- Update install snippets in `package-manager-tabs.tsx` to `bun add @ccm-feedback/widget` etc.
- Add a small README-style footer note on the landing page (in `footer.tsx` or `cta-footer.tsx`) acknowledging "Based on SitePing by NeosiaNexus — MIT licensed" with a link to the upstream repo. This satisfies the README-footer attribution requirement in a user-visible way.
- Metadata `metadataBase: new URL("https://feedback.ccmdesign.ca")`; title template `"%s — CCM Feedback"`; siteName `"CCM Feedback"`.
- Do NOT try to rework landing page visuals or copy beyond the brand rename — that is out of scope.

**Patterns to follow:**
- Existing Next.js metadata object in `apps/demo/src/app/layout.tsx`.
- Existing component structure — keep the same layout, only swap strings/links.

**Test scenarios:**
- Test expectation: none — demo has no unit tests; behavior is covered by e2e (Unit 10) and manual build verification.
- Verification via `bun run build --filter=@ccm-feedback/demo` produces a Next build with no errors and no `siteping` strings in the static HTML output.

**Verification:**
- `curl localhost:3000/api/feedback` (dev) returns 200 with an empty list (memory store path).
- Old `/api/siteping` path 404s.
- Page source contains `<ccm-feedback-widget>` after client-side hydration.

---

- [ ] **Unit 8: Demo store toggle + Prisma client singleton**

**Goal:** Wire the demo so the route handler uses `PrismaStore` when `DATABASE_URL` is set, otherwise `MemoryStore`. Add `@prisma/client` as a runtime dep. Add a Prisma singleton helper.

**Requirements:** R6, R10

**Dependencies:** Unit 7

**Files:**
- Create: `apps/demo/src/lib/prisma.ts` — `PrismaClient` singleton using the standard `globalThis.__ccmFeedbackPrisma` pattern. Import from `@prisma/client`. Export a named `prisma`.
- Create: `apps/demo/src/lib/store.ts` — `export function resolveStore(): CcmFeedbackStore` that returns a `PrismaStore` when `process.env.DATABASE_URL` is set, else a `MemoryStore` singleton (current behavior). Also re-exports a 10-minute reset interval for memory-mode parity with today's demo.
- Delete: `apps/demo/src/lib/memory-store.ts` (its logic moves into `src/lib/store.ts`).
- Modify: `apps/demo/src/app/api/feedback/route.ts` — use `resolveStore()` instead of importing a memory store directly.
- Modify: `apps/demo/package.json` — add `dependencies: { "@prisma/client": "^6.0.0" }` and `devDependencies: { "prisma": "^6.0.0" }`. Add a `scripts.prisma:generate` pointing at `../../prisma/schema.prisma` so `prisma generate` works from the demo.

**Approach:**
- Gate Prisma instantiation behind the env check so local `bun run dev` without a DB still works.
- The singleton pattern is a Next.js dev-mode necessity: `globalThis.__ccmFeedbackPrisma ??= new PrismaClient()`.
- `PrismaStore` constructor takes a `PrismaClient` that must have been generated against the renamed schema — this is why the Prisma schema (Unit 9) must land before CI runs against a DB, but for memory mode the toggle works without any generated client (the `import "@prisma/client"` lazy-resolves only in the Prisma branch).
- Use a dynamic `await import("@prisma/client")` inside `resolveStore` so the bundle doesn't eagerly require Prisma at module evaluation time in memory mode.

**Patterns to follow:**
- Existing `globalThis as typeof globalThis & { __sitepingStore?: MemoryStore }` pattern — apply the same shape to `__ccmFeedbackPrisma` and `__ccmFeedbackMemoryStore`.

**Test scenarios:**
- Test expectation: none at unit level — the toggle behavior is verified by:
  - Manual run without `DATABASE_URL`: the demo's `/api/feedback` round-trip uses memory (existing behavior).
  - Integration sanity check (optional): a smoke script documented in `docs/local-dev.md`.
- E2E suite (Unit 10) exercises the widget against the memory path so long as the test harness does not set `DATABASE_URL`.

**Verification:**
- `bun run build --filter=@ccm-feedback/demo` succeeds with no `DATABASE_URL` set.
- Starting the built demo locally with `DATABASE_URL=<local-postgres>` makes a POST to `/api/feedback` persist a row (only a sanity check — the acceptance flow runs after orchestrator pushes the schema to Supabase).

---

- [ ] **Unit 9: Add `prisma/schema.prisma` at repo root**

**Goal:** Hand-write the Postgres schema matching `CCM_FEEDBACK_MODELS`, with pooler `url` + `directUrl` env bindings, so the orchestrator can `prisma db push` against Supabase immediately after the PR merges.

**Requirements:** R6

**Dependencies:** Unit 1 (model name source of truth)

**Files:**
- Create: `prisma/schema.prisma`
  - `generator client { provider = "prisma-client-js" }`
  - `datasource db { provider = "postgresql"; url = env("DATABASE_URL"); directUrl = env("DIRECT_URL") }`
  - `model FeedbackItem { ... }` with every field from `CCM_FEEDBACK_MODELS.FeedbackItem` (matching types, defaults, native types, relations, indexes)
  - `model FeedbackAnnotation { ... }` likewise with cascade relation back to `FeedbackItem`
  - `@@map("feedback_items")` / `@@map("feedback_annotations")` OR leave unmapped (Prisma default camelCase → PascalCase); **implementer decision** — prefer unmapped to match the TS model definitions.
- Modify: `apps/demo/package.json` — add `"prisma:generate": "prisma generate --schema=../../prisma/schema.prisma"` and `"prisma:push": "prisma db push --schema=../../prisma/schema.prisma"`.
- Modify: `.gitignore` — ensure `prisma/migrations/` is allowed (initial `db push` doesn't create migrations, but if we ever `prisma migrate dev`, keep them tracked).

**Approach:**
- Hand-write for this PR. A follow-up can add `scripts/generate-schema.mjs` that calls the CLI's `syncPrismaModels` against this file to keep it in sync with `packages/core/src/schema.ts` automatically.
- Native types to replicate from core: `@db.Text` on `message`, `cssSelector`, `xpath`, `textSnippet`, `textPrefix`, `textSuffix`, `neighborText`.
- Indexes to add: `@@index([projectName])`, `@@index([projectName, status, createdAt])` on `FeedbackItem`; `@@index([feedbackId])` on `FeedbackAnnotation`.
- Unique: `clientId @unique` on `FeedbackItem`.
- Cascade: `FeedbackAnnotation.feedback FeedbackItem @relation(fields: [feedbackId], references: [id], onDelete: Cascade)`.
- Relation array: `annotations FeedbackAnnotation[]` on `FeedbackItem`.

**Patterns to follow:**
- The TS source in `packages/core/src/schema.ts` is the canonical reference — mirror it field-for-field.

**Test scenarios:**
- Happy path: a sanity test (can live in `packages/cli/__tests__/generators/prisma.test.ts` since it already tests schema generation) that imports the root schema text and compares structural shape against `CCM_FEEDBACK_MODELS`. Optional — skip if it adds disproportionate cost.
- Test expectation: none at the unit level for the schema file itself (schema.prisma is not executed in unit tests). Verification is `prisma validate` in the verification phase.

**Verification:**
- `bunx prisma validate --schema=prisma/schema.prisma` passes with or without `DATABASE_URL` set (validate does not connect).
- `bunx prisma generate --schema=prisma/schema.prisma` succeeds and writes the client into `node_modules/.prisma/client/`.

---

- [ ] **Unit 10: E2E suite rename + widget bundle assertions**

**Goal:** Update `e2e/server.mjs` and `e2e/widget.spec.ts` to reference the new element selector `ccm-feedback-widget`, the new project comments, and any brand strings. Confirm the bundle path is still correct.

**Requirements:** R10

**Dependencies:** Units 2 (widget rename), 7 (demo rename — e2e doesn't use the demo but shares the bundle)

**Files:**
- Modify: `e2e/server.mjs` — page `<title>` and banner text rebranded; HTML loads `packages/widget/dist/index.js` (path unchanged); IIFE global reference (if any) `window.SitePing.initSiteping` → `window.CcmFeedback.initCcmFeedback`
- Modify: `e2e/widget.spec.ts` — every `"siteping-widget"` selector → `"ccm-feedback-widget"`; log-prefix assertions if any; retry-queue storage key assertions if any

**Approach:**
- The e2e page constructs the widget via the IIFE bundle — double-check `e2e/server.mjs` for the `window.SitePing` access. If it uses `window.SitePing.initSiteping`, switch to `window.CcmFeedback.initCcmFeedback`.
- Playwright's `waitForSelector("ccm-feedback-widget", { state: "attached" })` is the key gate.

**Patterns to follow:**
- Existing `shadow()` helper structure — keep as-is, only change selectors.

**Test scenarios:**
- Happy path: full e2e suite `bun run test:e2e` passes against the renamed widget bundle (Chromium, Firefox, WebKit — per the existing `playwright.config.ts`).
- Edge case: the test that toggles widget visibility via the FAB still works because `.sp-fab` CSS class is unchanged (this is a widget-internal class, not part of the brand rename scope).
- Error path: the retry-queue path in `api-client.ts` is exercised by one of the panel tests — assert new localStorage key if asserted before.

**Verification:**
- `bun run build` then `bun run test:e2e` is green across all three browsers.

---

- [ ] **Unit 11: Root docs, LICENSE handling, NOTICE, env, Netlify, local-dev docs, lockfile rewrite**

**Goal:** Land the final set of root-level files — new `NOTICE`, updated `README.md`, updated `CHANGELOG.md` root, updated `CONTRIBUTING.md` and `SECURITY.md`, new `docs/local-dev.md`, new `netlify.toml`, updated `apps/demo/.env.example`, regenerated `bun.lock`. Leave `LICENSE` byte-identical.

**Requirements:** R7, R8, R9, R11

**Dependencies:** Units 1–10 (lockfile regeneration picks up all renamed packages)

**Files:**
- Create: `NOTICE` at repo root with:

  ```
  CCM Feedback Tool
  Copyright 2026 CCM Design (Claudio Mendonca)

  This product is derived from SitePing by NeosiaNexus, distributed under the MIT License.
  Original project: https://github.com/NeosiaNexus/SitePing
  See the LICENSE file for full MIT license text. The original copyright notice is preserved.
  ```

- Modify: `README.md` (rebrand headings, install snippets, examples, links; add an "Acknowledgements" footer section linking to the upstream repo and the MIT license)
- Modify: `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md` (brand rename; contribution flow still targets `ccmdesign/ccm-feedback-tool`; security contact updated if CCM wants — otherwise leave and flag in open questions)
- Modify: `apps/demo/.env.example` — new template:

  ```
  # Supabase Postgres (required for persistent storage — optional for local memory-store mode)
  # Pooler URL (pgbouncer, port 6543) — used at runtime.
  # DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
  #
  # Direct URL (port 5432) — used by Prisma migrations and introspection.
  # DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
  #
  # Leave both unset to run the demo against an ephemeral in-memory store.
  # See docs/local-dev.md for the full runbook.
  ```

- Create: `docs/local-dev.md` covering:
  1. Prereqs (`bun >=1.3.11`, Node 18+ for Prisma, optional Postgres 15+ or a Supabase project).
  2. Clone + `bun install`.
  3. Running the demo with the memory store: `bun run dev` (no env vars). Caveat: resets every 10 minutes.
  4. Running the demo against Supabase: set `DATABASE_URL` + `DIRECT_URL` in `apps/demo/.env.local`, run `bunx prisma generate --schema=prisma/schema.prisma` once, optionally `bunx prisma db push --schema=prisma/schema.prisma` if not yet pushed.
  5. Running unit tests: `bun run test:run`.
  6. Running e2e: `bun run build` (for the widget bundle) then `bun run test:e2e`.
  7. Troubleshooting: stale `node_modules/.prisma` after model rename — delete and regenerate; cleared local widget data (identity + retry queue) expected once after rebrand.
  8. Pointer to `packages/core/src/schema.ts` as the TS source of truth for Prisma models.
- Create: `netlify.toml` at repo root:

  ```
  [build]
  base    = "apps/demo"
  command = "cd ../.. && bun install --frozen-lockfile && bun run build --filter=@ccm-feedback/demo"
  publish = ".next"

  [[plugins]]
  package = "@netlify/plugin-nextjs"

  [build.environment]
  NODE_VERSION = "20"
  NEXT_TELEMETRY_DISABLED = "1"
  ```

- Delete: nothing new beyond Units 7 and 8.
- Modify: `bun.lock` — regenerate via `bun install` at the end of this unit; commit the new lockfile.

**Approach:**
- `LICENSE` stays as-is. Verify byte-identical at the end.
- `NOTICE` is MIT-standard.
- The README footer (Acknowledgements section) is the README-attribution half of the MIT compliance pattern.
- `docs/local-dev.md` is the first entry in the new `docs/plans/`-adjacent `docs/` body of knowledge — keep it concise (~100 lines).
- `netlify.toml` must live at the repo root, not in `apps/demo/`, because Netlify's `base` directive is resolved from the root of the deployed repo. The `command` then uses `cd ../..` to run the workspace-level build.
- Lockfile: run `bun install` from the worktree root once all package.json edits are in place. Commit the resulting `bun.lock`.

**Patterns to follow:**
- Existing README structure — keep section ordering.
- Existing `apps/demo/.env.example` comment style.

**Test scenarios:**
- Test expectation: none — docs and config files.
- The verification phase (Unit 12) does the final grep sweep.

**Verification:**
- `diff LICENSE <original>` is empty — LICENSE untouched.
- `netlify.toml` passes `bunx --yes @netlify/cli build --dry --skip-deploy` (if installed; optional).
- `docs/local-dev.md` renders correctly (any markdown preview).

---

- [ ] **Unit 12: Verification pass — build, unit tests, e2e, and grep sweep**

**Goal:** Prove the acceptance criteria for the code/repo portion of CCM-277: all three test commands green, and zero `siteping` strings outside the permitted allowlist.

**Requirements:** R10, R9

**Dependencies:** Units 1–11

**Files:**
- Read-only: every file the grep sweep visits.
- Optionally modify: `.github/workflows/ci.yml` if the grep sweep uncovers a stale reference (unlikely — CI uses path-based filtering).

**Approach:**
- Run, in order, from the worktree root:
  1. `bun install` (should be a no-op if Unit 11 already ran it)
  2. `bun run clean` (defensive — removes dist/ + .next/)
  3. `bun run build`
  4. `bun run check`
  5. `bun run lint`
  6. `bun run test:run`
  7. `bun run test:e2e`
- Grep sweep with an explicit allowlist:
  - Find all matches of `/siteping/i` under the worktree.
  - Expected hits only in: `LICENSE`, `NOTICE`, `README.md` (Acknowledgements footer), `CHANGELOG.md` (historical changelog), package-level `CHANGELOG.md` historical entries, `.git/config` (the `upstream` remote — not part of source grep), and `docs/spec.md` (pre-existing CCM feedback tool spec that references SitePing in context).
- Confirm `git remote get-url upstream` prints `https://github.com/NeosiaNexus/SitePing.git`.

**Patterns to follow:**
- The existing root `package.json` scripts are the canonical test entry points.

**Test scenarios:**
- Happy path: entire suite green.
- Regression guard: the grep sweep produces a small, hand-verifiable list of allowed matches only.

**Verification:**
- The three acceptance commands from the ticket (`bun run build && bun run test:run && bun run test:e2e`) all return exit code 0.
- The allowlisted grep matches are the only remaining mentions of `siteping` / `SitePing`.
- `git status` is clean after the last commit in this unit.

## System-Wide Impact

- **Interaction graph:** The rename touches every import edge between the 6 packages + the demo + the e2e harness. There are no external entry points yet (no npm publish). The rename does not alter any function signatures — only names. Risk of breakage is low if the grep sweep in Unit 12 is exhaustive.
- **Error propagation:** Unchanged. The `StoreNotFoundError` / `StoreDuplicateError` type hierarchy and HTTP 404/409 mapping in `adapter-prisma` stay byte-identical in behavior.
- **State lifecycle risks:** Existing users of the widget on a staging site will see:
  - Their local `siteping_identity` entry go unused — they'll be asked for name/email again on first interaction. Acceptable for a rebrand baseline; documented in `docs/local-dev.md`.
  - Any in-flight `siteping_retry_queue` entries will be abandoned. For a demo environment, this is inconsequential; for a production rollout, post-PR we'd want a follow-up migration shim, but the P0 baseline explicitly accepts this.
  - Previously created annotations on a running Supabase `SitepingFeedback` table wouldn't be readable after rename — but no such table exists yet (Supabase provisioning is outside this plan), so there is no data to migrate.
- **API surface parity:** The custom element name, public API name, Prisma model names, and API route path all change together — downstream consumers (none yet) would need to update in lockstep. This is the entire point of landing the rebrand as a single PR.
- **Integration coverage:** The e2e suite in Unit 10 is the primary integration check. It exercises: custom-element attachment, FAB → Panel flow, feedback submission, retry queue, and marker rendering, all against the real widget bundle.
- **Unchanged invariants:**
  - `SitepingStore` interface contract (5 methods, 2 error shapes) is renamed to `CcmFeedbackStore` but its contract is byte-identical. Any future adapter implementing `CcmFeedbackStore` behaves like one implementing the old `SitepingStore` — no new guarantees added, none removed.
  - Prisma model field set, types, defaults, native types, indexes, and cascade behavior are exactly preserved — the only diff is the model/table name.
  - Widget z-index constants, panel layout, FAB position logic, shadow-DOM mode (`closed`), CSS class names (`sp-*`), and marker coordinates stay the same. Existing styles bolted to `.sp-fab`, `.sp-panel`, etc. continue to work.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| A rename misses a reference and CI turns red halfway through | Split the work into 12 dependency-ordered units; run `bun run check` after each and the full suite + grep in Unit 12. The grep-sweep allowlist is the stop-ship check. |
| `bun.lock` rewrite produces unrelated dep drift | Run `bun install` with `--frozen-lockfile` in CI; accept only the lockfile lines driven by scope renames. Commit the new lockfile in one dedicated commit (Unit 11). |
| The Prisma schema at `prisma/schema.prisma` drifts from `packages/core/src/schema.ts` over time | Short-term: hand-write + verify via review. Long-term: file a follow-up ticket to add a `scripts/generate-schema.mjs` that drives the root schema from the TS source via `syncPrismaModels`. |
| Netlify MCP deploy fails because `netlify.toml` layout doesn't match Netlify's monorepo conventions | `base = "apps/demo"` with relative command is the conservative default. If the orchestrator's first deploy fails, fall back to a root-level `command = "bun run build --filter=@ccm-feedback/demo"` with `publish = "apps/demo/.next"`. |
| The `_demo` landing page copy rewrite accidentally breaks a Tailwind class or component prop | Keep component-shape edits strictly to strings/links; run `bun run check` + visit `localhost:3000` after Unit 7. |
| Existing e2e bundle path `packages/widget/dist/index.js` breaks because tsup output changes shape when `globalName` is renamed | Verify the first build of Unit 2 produces the same filenames (`index.js`, `index.global.js`). The IIFE global rename only changes the emitted `var CcmFeedback = (() => { ... })()` identifier — file names are untouched. |
| Release-please labels no longer match the intended npm scope and a release PR ships with stale titles | Component labels (`core`, `widget`, ...) are cosmetic. Accept for P0; follow-up can rename them if a cleaner release-PR title is wanted. |
| CLI test for prisma-ast output still expects the old model names | Unit 5 explicitly calls out `prisma.test.ts` — update assertions to match `FeedbackItem` / `FeedbackAnnotation`. |
| Widget debug logs in existing staging environments become harder to grep | Replace `[siteping]` with `[ccm-feedback]`; document the new prefix in `docs/local-dev.md` troubleshooting section. |

## Documentation / Operational Notes

- **README footer (Acknowledgements):** required for MIT attribution visibility and explicitly called out in the ticket's Acceptance section.
- **`docs/local-dev.md`:** new — the canonical runbook for teammates and for orchestrator MCPs to reference when resolving env issues.
- **`NOTICE`:** standard for MIT forks; lives at repo root alongside `LICENSE`.
- **`CLAUDE.md`:** the existing project-level guide mentions `@siteping/*` package names in the Architecture section — update to `@ccm-feedback/*` as part of Unit 11 (fold into the root docs sweep). It's not strictly required for the acceptance check but keeping it stale would bite us on the very next Claude Code session.
- **Rollout / orchestrator handoff:**
  1. This PR lands → Netlify MCP attaches a site to the worktree's deploy preview.
  2. Supabase MCP provisions `ccm-feedback-dev` and `ccm-feedback-prod`; records pooler + direct URLs.
  3. Orchestrator sets `DATABASE_URL` + `DIRECT_URL` as Netlify env vars and runs `bunx prisma db push --schema=prisma/schema.prisma` against each env.
  4. DNS → `feedback.ccmdesign.ca` → Netlify; TLS auto-provisioned.
  5. Manual smoke: submit a feedback on the deployed demo, verify a row lands in Supabase `FeedbackItem`.

## Sources & References

- Linear ticket body: CCM-277 (provided in the planning input)
- Existing codebase:
  - `packages/core/src/schema.ts` (`SITEPING_MODELS` — canonical model shape)
  - `packages/core/src/types.ts` (every `Siteping*` symbol)
  - `packages/widget/src/launcher.ts` (custom element creation site)
  - `packages/widget/tsup.config.ts` (IIFE global name)
  - `packages/widget/src/i18n/{en,fr,index}.ts` (brand strings)
  - `packages/widget/src/identity.ts` + `api-client.ts` (localStorage keys)
  - `packages/adapter-prisma/src/index.ts` (Prisma accessor + handler factory)
  - `packages/adapter-localstorage/src/index.ts` (localStorage default key)
  - `packages/cli/src/index.ts` + `commands/*` + `generators/*` (binary + help + route template)
  - `apps/demo/src/app/api/siteping/route.ts` (current API route)
  - `apps/demo/src/lib/memory-store.ts` (current store singleton + globalThis key)
  - `apps/demo/src/app/layout.tsx` + landing components (brand surface)
  - `e2e/server.mjs` + `e2e/widget.spec.ts` (element selector assertions)
  - `.github/workflows/{ci,release}.yml` (CI gates)
  - `release-please-config.json` + `.release-please-manifest.json` (release machinery)
  - `package.json` root (workspace layout)
- External references:
  - Supabase Prisma setup (pooler URL + `directUrl`): https://supabase.com/docs/guides/integrations/prisma
  - Netlify Next.js plugin (`@netlify/plugin-nextjs`): https://docs.netlify.com/frameworks/next-js/overview/
  - MIT license attribution conventions (`NOTICE` + README footer pattern): standard OSS practice
