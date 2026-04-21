---
title: "feat(CCM-290): Agent API + threaded replies + Comment-default composer"
type: feat
status: active
date: 2026-04-21
linear: CCM-290
---

# feat(CCM-290): Agent API + threaded replies + Comment-default composer

## Overview

Three coordinated changes ship together under CCM-290:

1. A new `"comment"` feedback type becomes the default selection in the widget's submission composer, and the composer itself is refactored from a 2x2 button grid into a styled single `<select>` (Comment first).
2. `FeedbackItem` records gain a 1-to-many `FeedbackReply` children collection, readable and writable by both the widget (user replies, session-trusted) and a new token-authenticated agent HTTP API.
3. `Project` gains a plaintext `agentToken` column plus a `rotateAgentToken` store method, gating a new `createCcmAgentFeedbackHandler` factory that exposes list/get/patch/addReply over `/api/v1/agent/feedback`. An "API link" pill in the panel header copies the configured `agentApiUrl` to the clipboard so the developer can hand it to their agent.

The work is deliberately split into five commit-per-phase units to keep type-checks, lint, and unit tests green at every step.

## Problem Frame

Today the widget only captures feedback in four types (`question`/`change`/`bug`/`other`), there is no way for an agent (or any non-widget actor) to read, triage, or respond to feedbacks, and users receive no acknowledgement when their feedback is looked at. This closes the loop: users file comments, agents answer back, and both sides see the same thread inside the widget.

The user has explicitly asked for a plaintext `agentToken` ("no worry" call) rather than a hashed column, which simplifies integration with AI agent stacks that don't carry secrets. This matches the convenience model of `DATABASE_URL`-style secrets and is acceptable for the current threat model (dev tool, staging-first rollout).

## Requirements Trace

- R1. Widget composer defaults to a new `"comment"` feedback type and is rendered as a `<select>` instead of a 2x2 button grid (PHASE 1 + PHASE 4).
- R2. Feedback records carry an ordered list of replies, each tagged `"user"` or `"agent"` as its source (PHASE 1 + PHASE 2).
- R3. An HTTP API under `/api/v1/agent/feedback[...]` lets an authenticated agent list, get, patch, and reply to feedbacks for a given project, authenticated via a per-project plaintext `agentToken` (PHASE 3).
- R4. The widget panel detail view displays replies and exposes a plain-text composer that calls `client.addReply(feedbackId, { author, body })`, routed to the existing non-agent `/api/feedback/[id]/replies` route (PHASE 5).
- R5. When `agentApiUrl` is configured, the panel header shows an "API link" pill that copies the URL to the clipboard and flashes a localized toast (PHASE 5).
- R6. Prisma schema remains generated from `CCM_FEEDBACK_MODELS` (source of truth); no hand-edits to `prisma/schema.prisma`. A migration is committed alongside the model change (PHASE 1).
- R7. `bun run check`, `bun run lint`, and `bun run test:run` must pass at the end of each phase; each phase ends with one Conventional Commit.

## Scope Boundaries

- No backwards-compatibility shim for `"comment"` — it slots into `FEEDBACK_TYPES` next to the existing types as if it had always been there.
- No threading of replies (no "reply to a reply"), no markdown rendering inside reply bodies, no rich text — plain text only.
- No changes to annotation intents (`rectangle`/`text_change`/`image_swap`), review batches, or asset flows.
- No email notifications, webhook fan-out, or push when replies arrive.
- Agent API is token-auth only via `?token=…` query param; no OAuth, no JWT, no session cookies, no rate limiting (applied at the proxy layer if ever needed).

### Deferred to Separate Tasks

- Token rotation admin UI: the store method and route exist, but the admin `apps/demo/src/app/admin` UI gains no new controls this pass. Deferred to a follow-up CCM-### task.
- Reply threading + markdown rendering: explicitly out for CCM-290; revisit if agents need structured responses.
- Real-time reply updates (SSE/WebSocket): the widget reloads replies on detail open/refresh; live push is deferred.

## Context & Research

### Relevant Code and Patterns

- `packages/core/src/types.ts` — `FEEDBACK_TYPES`, `FeedbackRecord`, `CcmFeedbackStore`, `CcmProjectStore`, `CcmFeedbackConfig` all live here.
- `packages/core/src/schema.ts` — `CCM_FEEDBACK_MODELS` is the Prisma source of truth; the CLI regenerates `prisma/schema.prisma` from it.
- `packages/adapter-prisma/src/index.ts` — existing `PrismaStore` + `createCcmFeedbackHandler` factory with `safeCompare` (timing-safe) + per-method auth gating: mirror this shape for the agent handler.
- `packages/adapter-prisma/src/project-store.ts` — `ProjectStore.rotateProjectSecret` is the template for the new `rotateAgentToken`. Uses `generateSecret()` from `./secret.js` and returns plaintext once.
- `packages/adapter-prisma/src/review-handler.ts` — precedent for an additional handler factory alongside `createCcmFeedbackHandler`.
- `packages/adapter-prisma/src/validation.ts` — `feedbackCreateSchema` + `feedbackPatchSchema` use `z.enum(FEEDBACK_TYPES)`, so extending the constant is enough; also hosts `_AssertPatch`/`_AssertQuery` compile-time drift checks to keep mirrored interfaces honest.
- `packages/adapter-memory/src/index.ts` and `packages/adapter-localstorage/src/index.ts` — same adapter shape; both implement `CcmFeedbackStore` and must stay in lockstep.
- `packages/widget/src/popup.ts` (~L97–147) — 2x2 button grid to be replaced with `<select>`; `selectedType`, `typeRow`, `selectType`, `updateSubmitState` all touch this region.
- `packages/widget/src/panel.ts` (~L90–155) — header buttons (`deleteAllBtn`, `exportBtn`, `closeBtn`) + filter chip construction; both the "API link" pill and the `"comment"` filter chip slot here.
- `packages/widget/src/panel-detail.ts` — detail view rendering; new reply list + composer attach here.
- `packages/widget/src/panel-sort.ts` — type sort/group helpers; must know about `"comment"`.
- `packages/widget/src/styles/theme.ts` — `typeQuestion`/`typeChange`/`typeBug`/`typeOther` + matching `*Bg` colors; extend with `typeComment`/`typeCommentBg`.
- `packages/widget/src/i18n/en.ts` + `fr.ts` + `types.ts` — `"type.question"` family lives here; add `"type.comment"` plus `"panel.apiLink"` + `"panel.apiLinkCopied"`.
- `packages/widget/src/api-client.ts` — `WidgetClient` interface + `ApiClient` HTTP implementation; add `listReplies` + `addReply`. The `v1Url` helper already derives `/api/v1/...` from the widget's `endpoint` — `/api/feedback/[id]/replies` sits next to the existing feedback endpoint.
- `packages/widget/src/store-client.ts` — `StoreClient` wraps a `CcmFeedbackStore` directly (client-side mode); must also implement `listReplies` + `addReply`.
- `apps/demo/src/app/api/feedback/route.ts` — sibling of the new `apps/demo/src/app/api/feedback/[id]/replies/route.ts` that the widget will call.
- `apps/demo/src/lib/store.ts` — `resolveStore()` selects `PrismaStore` vs memory store based on `DATABASE_URL`; agent routes need the same resolution.
- `prisma/migrations/` — follow the existing date-prefixed migration folder convention.

### Institutional Learnings

- Prisma schema drift has already burned the team — the CCM-282 annotation intent plan re-affirmed "never hand-edit `prisma/schema.prisma`; always regenerate from `CCM_FEEDBACK_MODELS`." This plan repeats the constraint for the `FeedbackReply` model and the `agentToken` column.
- The CCM-279 work established `generateSecret()` + `hashSecret()` + constant-time `timingSafeEqual` as the canonical auth primitive. The user's explicit "plaintext token" call means we skip `hashSecret` for `agentToken` but keep `timingSafeEqual` for the compare.
- CCM-282 added `_AssertPatch`/`_AssertQuery` compile-time drift checks in `validation.ts`. Follow that pattern when touching `feedbackCreateSchema`/`feedbackPatchSchema` so the manual interfaces stay in sync.
- Internal-package pattern: `@ccm-feedback/core` exports raw TS and is bundled into consumers via `noExternal` in tsup — any new type added here flows to all adapters automatically without a build step. But `bun run check` is still needed to catch TypeScript drift across the workspace.

### External References

- Not required: the codebase already carries strong patterns for every layer this feature touches (Prisma adapter handlers, Zod-enforced validation, Shadow-DOM widget composer, i18n).

## Key Technical Decisions

- **Plaintext `agentToken` column** (per user's explicit call): stored as nullable `String` on `Project`, generated by existing `generateSecret()`. Compared at the handler with `timingSafeEqual` to prevent timing leaks despite being plaintext. Rotation through a dedicated `rotateAgentToken` store method parallels `rotateProjectSecret`.
- **Separate handler factory `createCcmAgentFeedbackHandler`** rather than a branch in the existing `createCcmFeedbackHandler`: different auth mode (query-param token vs Bearer header), different request shape (project scoped by name in query), and different response permissions (no destructive DELETE surface). A separate factory keeps the existing public widget handler's threat model unchanged.
- **Agent API token in `?token=…` query**: matches the user brief. Explicitly rejecting `Authorization: Bearer` keeps the surface minimal and makes URL-sharing possible for the "API link" copy button.
- **Replies live on the `FeedbackItem` cascade path**: `FeedbackReply.feedbackId` has `onDelete: Cascade`, so deleting a feedback also drops its replies. Reuse the `INCLUDE_ANNOTATIONS` pattern (`include: { annotations: true, replies: true }`) when fetching feedbacks so `FeedbackRecord.replies` is always hydrated.
- **`source` column as a plain `String`** (`"user"` | `"agent"`), not a Prisma enum: enums in Prisma are Postgres-only and the project targets dual MySQL/Postgres support; mirror how `type` on `FeedbackItem` is a plain `String`.
- **Widget replies route through the non-agent `/api/feedback/[id]/replies`** (session-trusted, no token) per brief: the widget already has an authenticated session identity (author name/email), so it does not need the agent token. This also isolates per-tenant agent tokens from ever reaching the browser.
- **Comment-first ordering and default**: the user flow is "write text, maybe pick a type, submit." Making Comment the default means the textarea's first keystroke enables the submit button — a simpler one-shot flow. The `<select>` preserves the affordance that a user *can* re-classify, but low-ceremony feedback lands as a Comment by default.
- **`<select>` inside Shadow DOM**: honors the closed-Shadow DOM constraint; browser-native `<select>` avoids re-implementing a headless combobox and keeps keyboard-navigation and screen-reader behavior for free. Styled via inline CSS mirroring `textarea` tokens.
- **Submit-enabled rule simplification**: since a type is always selected (`"comment"` by default), `updateSubmitState` becomes "enable when textarea has non-whitespace content." No more dual-condition (type + text).
- **"API link" copy UX is synchronous**: `navigator.clipboard.writeText(agentApiUrl)` with a 1500ms transient toast. If `navigator.clipboard` is unavailable (insecure context, older browser), silently fall back to a `document.execCommand("copy")` on a temporary hidden `<textarea>`.

## Open Questions

### Resolved During Planning

- "Should the agent token compare be `timingSafeEqual` even for a plaintext secret?" — Yes. Plaintext-on-disk does not excuse timing leaks at compare-time. Same primitive as the existing `safeCompare` in `adapter-prisma/src/index.ts`.
- "Where do agent routes resolve the store?" — Reuse `apps/demo/src/lib/store.ts`'s `resolveStore()`; same PrismaStore/memory-store split. Project lookups use `ProjectStore` (Prisma-backed); memory store callers will 501 on agent routes since `CcmProjectStore` is Prisma-only today — matches existing admin route behavior.
- "Should replies be ordered ascending or descending?" — Ascending by `createdAt` (oldest first). Matches a chat/forum transcript; the widget's detail view reads top-to-bottom.
- "Do we need an index on `FeedbackReply.source`?" — No. `feedbackId` index is enough; source is a low-cardinality filter used only inside already-small per-feedback lists.
- "Does `FeedbackResponse` (HTTP serialization) need to grow?" — Yes. Add a `ReplyResponse` type (ISO-string dates) and extend `FeedbackResponse.replies: ReplyResponse[]`. Mirror the shape of `AnnotationResponse`.

### Deferred to Implementation

- Exact CSS tokens for the `<select>` (padding, chevron icon): match the existing textarea border/background tokens; fine-tune during P4.
- Whether to show `typeComment` chip color in panel filters matching the badge on feedback cards: pick during P4 once the `typeComment` swatch is in `theme.ts`.
- Whether `addReply` from `StoreClient` should notify via an event bus to update an open panel detail: decide during P5 — the simplest approach is for the detail component to re-query after its own `addReply` call.
- Memory adapter's `rotateAgentToken` behavior: if we ever add `CcmProjectStore` to memory, make it mirror `ProjectStore`. Not in scope this pass.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

**Data flow for an agent reply:**

```
agent                                                     widget user
  |                                                            |
  | POST /api/v1/agent/feedback/[id]/replies?token=…           |
  | { body, author }                                           |
  v                                                            |
createCcmAgentFeedbackHandler                                   |
  - resolveStore() → PrismaStore                                |
  - ProjectStore.findByAgentToken(token)  [timingSafeEqual]     |
  - PrismaStore.addReply({feedbackId, source:"agent", ...})     |
  - 201 ReplyResponse                                           |
                                                                v
                                                panel-detail.ts renders
                                                "agent" badge + body on
                                                next open/refresh (or
                                                after widget's own
                                                addReply completes)
```

**Reply schema (directional, source of truth is `CCM_FEEDBACK_MODELS`):**

```
FeedbackReply {
  id         String  @id @default(cuid())
  feedbackId String
  feedback   FeedbackItem @relation(fields:[feedbackId], references:[id], onDelete: Cascade)
  author     String
  authorEmail String?
  source     String   // "user" | "agent"
  body       String   @db.Text
  createdAt  DateTime @default(now())
  @@index([feedbackId])
}
```

**Composer shape (PHASE 4):**

```
<div popup>
  <select aria-label="Feedback type" data-ccm-feedback="popup-type">
    <option value="comment" selected>Comment</option>
    <option value="question">Question</option>
    <option value="change">Change</option>
    <option value="bug">Bug</option>
    <option value="other">Other</option>
  </select>
  <textarea …/>
  <buttons: [mic?] [cancel] [submit]>
</div>
```

## Implementation Units

- [ ] **Unit 1 (PHASE 1): Core types + schema + migration**

  **Goal:** Land the `"comment"` `FeedbackType`, the `FeedbackReply` model, the `agentToken` column on `Project`, and the extended store contract — nothing downstream yet.

  **Requirements:** R1 (type only), R2, R3 (schema only), R6, R7.

  **Dependencies:** None.

  **Files:**
  - Modify: `packages/core/src/types.ts` — add `"comment"` to `FEEDBACK_TYPES`; define `ReplyCreateInput`, `ReplyRecord`, `ReplyResponse`; extend `FeedbackRecord` with `replies: ReplyRecord[]`; extend `FeedbackResponse` with `replies: ReplyResponse[]`; extend `CcmFeedbackStore` with `addReply(input): Promise<ReplyRecord>` and `listReplies(feedbackId): Promise<ReplyRecord[]>`; extend `CcmProjectStore` with `rotateAgentToken(id): Promise<{ agentToken: string }>`.
  - Modify: `packages/core/src/schema.ts` — add `FeedbackReply` model (cuid id, `feedbackId` FK with onDelete Cascade, `author`, `authorEmail?`, `source`, `body` with `nativeType:"Text"`, `createdAt`, index on `feedbackId`); add `agentToken: { type: "String", optional: true }` to `Project.fields`; add `replies` 1-to-many back-relation to `FeedbackItem.fields`.
  - Create: `prisma/schema.prisma` regenerated via the CLI (do **not** hand-edit).
  - Create: `prisma/migrations/YYYYMMDDHHMMSS_ccm290_agent_replies/migration.sql` — additive: new table, new `Project.agentToken` column, new `FeedbackItem.replies` back-rel is relation-only.
  - Test: `packages/core/__tests__/schema.test.ts` (or closest existing schema drift test) — assert `FEEDBACK_TYPES` includes `"comment"`, assert `CCM_FEEDBACK_MODELS.FeedbackReply` exists with expected fields.

  **Approach:**
  - The brief nominates the first widget composer option as "Comment" default. Here we only widen the type enum; widget changes come in P4.
  - Regenerate `prisma/schema.prisma` with the CLI (`bun run` script that wraps the CLI's Prisma generator), not by hand. Running the CLI is a build-adjacent task; the implementer confirms the diff touches only the two additions before committing.
  - Do not yet implement `addReply`/`listReplies`/`rotateAgentToken` in any adapter — this unit is contract-only. Adapter tests that exercise the expanded `CcmFeedbackStore` can stay green because the interface is implemented by all three adapters in P2.

  **Execution note:** Extend the compile-time drift assertions. When `CcmFeedbackStore` grows, the memory + localstorage adapters must implement the new methods or TypeScript will fail — that's the canary for the next phase.

  **Patterns to follow:**
  - CCM-282's `AnnotationType` extension (`types.ts` + `schema.ts` together, no hand-editing `.prisma`).
  - CCM-279's `CcmProjectStore.rotateProjectSecret` shape for `rotateAgentToken`.

  **Test scenarios:**
  - Happy path: `FEEDBACK_TYPES` array includes `"comment"` as a member.
  - Happy path: `CCM_FEEDBACK_MODELS.FeedbackReply.fields` includes `id`, `feedbackId`, `author`, `authorEmail`, `source`, `body`, `createdAt`; `FeedbackReply.indexes` includes `{ fields: ["feedbackId"] }`.
  - Happy path: `CCM_FEEDBACK_MODELS.Project.fields.agentToken` exists with `optional: true`.
  - Happy path: `CCM_FEEDBACK_MODELS.FeedbackItem.fields.replies` exists with `relation.kind: "1-to-many"` and `relation.model: "FeedbackReply"`.
  - Integration: `bun run check` across all packages succeeds with expanded `CcmFeedbackStore` surface and matching `FeedbackRecord` shape; failures in P2 adapters at this step are acceptable only if the adapter files are already touched in this same commit (they are not — this is a pure types/schema commit that *will* transiently fail until P2 lands).

  **Verification:**
  - `bun run check` passes at root after this commit (P1 must leave the workspace green, so if the adapter types break, they need either a temporary `// @ts-expect-error` on the three adapter classes *or* P2 must fold into P1). **Decision:** add temporary stub implementations at adapter class level that `throw new Error("not implemented in phase 1")` to keep the commit green without leaking the methods' final shape. P2 replaces the stubs.
  - `bun run lint` passes.
  - `bun run test:run` passes (no new behavioral tests yet beyond the schema shape assertions).
  - Prisma migration `dry-run` equivalent: inspect the generated SQL, confirm it is additive only.

- [ ] **Unit 2 (PHASE 2): Adapter implementations + validation extension**

  **Goal:** Make `addReply` / `listReplies` real in all three adapters, hydrate `replies` in every `FeedbackRecord` read path, and teach `feedbackCreateSchema` / `feedbackPatchSchema` about the `"comment"` type.

  **Requirements:** R2, R7.

  **Dependencies:** Unit 1 (types + schema).

  **Files:**
  - Modify: `packages/adapter-prisma/src/index.ts` — extend `CcmFeedbackPrismaClient` with a `feedbackReply` shape (`create`, `findMany`); update `INCLUDE_ANNOTATIONS` to `INCLUDE_RELATIONS = { annotations: true, replies: { orderBy: { createdAt: "asc" } } }`; implement `PrismaStore.addReply`, `PrismaStore.listReplies`; use `INCLUDE_RELATIONS` in `createFeedback`, `findByClientId`, `getFeedbacks`, `updateFeedback`.
  - Modify: `packages/adapter-prisma/src/project-store.ts` — implement `ProjectStore.rotateAgentToken(id)`: `generateSecret()`, `prisma.project.update({ where:{id}, data:{agentToken} })`, return `{ agentToken }`. Also add an internal `findByAgentToken(token): Promise<{ id, name } | null>` that timing-safe compares against all non-null `agentToken` rows (linear scan is fine for the current project scale; index can be added later if needed).
  - Modify: `packages/adapter-memory/src/index.ts` — add in-memory `replies` map keyed by feedbackId; implement `addReply`/`listReplies`; include `replies: []` in every `FeedbackRecord` the adapter returns.
  - Modify: `packages/adapter-localstorage/src/index.ts` — add a sibling localStorage key for replies; implement `addReply`/`listReplies`; hydrate `replies` on every read.
  - Modify: `packages/adapter-prisma/src/validation.ts` — no change to the `FEEDBACK_TYPES` import is needed because it already does `z.enum(FEEDBACK_TYPES)`, but add a smoke assertion test that `"comment"` is a valid `type` for `feedbackCreateSchema.safeParse`. Add a new `replyCreateSchema` (author, body, optional authorEmail) for the P3 agent route to reuse.
  - Modify: `packages/widget/src/panel-sort.ts` — handle `"comment"` (add to ordering, any type-based grouping).
  - Modify: `packages/widget/src/styles/theme.ts` — add `typeComment: "#6b7280"` and `typeCommentBg: "#e5e7eb"` (light); add dark-theme counterparts (suggest `typeComment: "#9ca3af"`, `typeCommentBg: "rgba(107,114,128,0.15)"`); extend `getTypeColor` / `getTypeBgColor` to map `"comment"`.
  - Test: `packages/adapter-prisma/__tests__/prisma-store.replies.test.ts` (new) — `addReply` writes, `listReplies` reads back in ascending order, `getFeedbacks` hydrates replies.
  - Test: `packages/adapter-memory/__tests__/replies.test.ts` (new).
  - Test: `packages/adapter-localstorage/__tests__/replies.test.ts` (new).
  - Test: `packages/adapter-prisma/__tests__/validation.test.ts` (modify) — `"comment"` is valid for `feedbackCreateSchema`; `replyCreateSchema` accepts `{author,body}` and rejects empty body.

  **Approach:**
  - Keep adapter stubs from P1 removed once the real implementations land.
  - `PrismaStore.listReplies` should `orderBy: { createdAt: "asc" }`. Matches the detail view's transcript-style rendering.
  - `addReply` returns the hydrated `ReplyRecord`, not just an id — the widget/API clients will echo it back to the caller immediately.
  - `ProjectStore.findByAgentToken` lives inside `ProjectStore` (not a new file) to keep the Project surface colocated. It is called by the agent handler in P3.
  - The `source` argument to `addReply` is part of the input type (`ReplyCreateInput.source: "user" | "agent"`). The widget's reply client *always* passes `"user"`; the agent handler *always* passes `"agent"`. No server-side inference — the caller is responsible.

  **Patterns to follow:**
  - `PrismaStore.createFeedback`'s nested `annotations.create` pattern for any future bulk reply creation (not needed in this PR).
  - `ProjectStore.rotateProjectSecret`'s shape for `rotateAgentToken`.
  - `AnnotationRecord`'s date handling (Date on server, ISO string on the wire).

  **Test scenarios:**
  - Happy path (prisma): `addReply` with `source:"user"` then `source:"agent"` returns both in `listReplies` in insertion order.
  - Happy path (memory): same, with a per-store fresh instance.
  - Happy path (localstorage): same, with a mocked `localStorage`.
  - Edge case: `listReplies` for a feedback with no replies returns `[]`, not `null`, not `undefined`.
  - Edge case: deleting a feedback (Prisma) cascades: `listReplies(id)` after `deleteFeedback(id)` throws `StoreNotFoundError` or returns `[]` (either is acceptable — document the chosen behavior in a store contract comment).
  - Edge case: `addReply` with a `feedbackId` that does not exist throws a Prisma foreign-key error → adapter translates to a clear error; memory/localstorage mirror with `StoreNotFoundError`.
  - Validation: `feedbackCreateSchema.safeParse({ type: "comment", ... valid rest })` succeeds; `type: "bogus"` still fails.
  - Validation: `replyCreateSchema.safeParse({ author:"Alice", body:"Hi" })` succeeds; empty body fails; body over 5000 chars fails.
  - Integration: `getFeedbacks` response includes `replies: []` on every record by default (so the widget doesn't need null guards).

  **Verification:**
  - `bun run check` + `bun run lint` + `bun run test:run` green.
  - Widget panel-sort has no runtime unknown-type path when `"comment"` is added to a mocked feedback list.

- [ ] **Unit 3 (PHASE 3): Agent API handler + demo routes**

  **Goal:** Ship `createCcmAgentFeedbackHandler` + three demo App Router routes under `/api/v1/agent/feedback`, token-authed against `Project.agentToken`.

  **Requirements:** R3, R7.

  **Dependencies:** Unit 2 (adapter methods real).

  **Files:**
  - Create: `packages/adapter-prisma/src/agent-handler.ts` — `createCcmAgentFeedbackHandler({ store, projectStore, allowedOrigins? })` exporting four handler functions (`listFeedback`, `getFeedback`, `patchFeedback`, `addReply`); each reads `?token=…`, looks up project via `projectStore.findByAgentToken(token)` with `timingSafeEqual`, and rejects with 401 on no match. `listFeedback` reads `?projectName=…&status=…`; `getFeedback` + `patchFeedback` + `addReply` accept the feedback id as a second argument (routes wire the dynamic segment).
  - Modify: `packages/adapter-prisma/src/index.ts` — re-export `createCcmAgentFeedbackHandler`.
  - Modify: `packages/adapter-prisma/src/validation.ts` — ensure `replyCreateSchema` exported; add `agentPatchSchema` accepting `{ status: FeedbackStatus, author?: string }`.
  - Create: `apps/demo/src/app/api/v1/agent/feedback/route.ts` — delegates `GET` to `createCcmAgentFeedbackHandler({…}).listFeedback`.
  - Create: `apps/demo/src/app/api/v1/agent/feedback/[id]/route.ts` — delegates `GET` + `PATCH` to the factory.
  - Create: `apps/demo/src/app/api/v1/agent/feedback/[id]/replies/route.ts` — delegates `POST` to `addReply`; tags `source:"agent"`.
  - Create: `apps/demo/src/app/api/feedback/[id]/replies/route.ts` — widget-side, no token, reads identity from the widget session (author/email from request body). Delegates to `PrismaStore.addReply` directly with `source:"user"`.
  - Test: `packages/adapter-prisma/__tests__/agent-handler.test.ts` (new) — auth 401 path, 200 list, 200 get, 200 patch (status + author), 201 addReply with `source:"agent"`, 400 bad body, cross-project 404 (tokens must only see their own project's feedbacks).

  **Approach:**
  - Constant-time token compare: `findByAgentToken` scans non-null rows and `timingSafeEqual`s each. If the project count is small (expected: <100 per deployment), this is O(n) but every compare is timing-safe. An alternative is an index-backed `findFirst({ where:{agentToken:token} })`, but that leaks rough existence via query timing; the scan is the conservative choice.
  - Agent patch accepts an optional `author` so the UI can record "resolved by agent-Alice"; since `FeedbackItem` has no `resolvedBy` column, the `author` currently only appears in the response echo and in the next reply's author field if the agent also posts a reply. Document this in the handler JSDoc — it's intentionally non-persisted outside the reply.
  - Agent handler never issues destructive operations (no DELETE) — mirror the brief's scoped surface.
  - The widget-side `/api/feedback/[id]/replies` route is *not* token-authed: the widget already has a session identity and submits author/email. Rate limiting is an edge-layer concern.
  - Tag every `source` field explicitly at the handler, not at the store. The store's `addReply` takes `source` as part of its input — the handler decides.

  **Execution note:** Write the handler tests first (factory pattern makes this easy: inject a fake `projectStore` + fake `store`).

  **Patterns to follow:**
  - `createCcmFeedbackHandler` factory shape and `safeCompare` helper.
  - `createReviewsHandler` in `review-handler.ts` for the "extra factory" pattern.

  **Test scenarios:**
  - Happy path (list): GET `?projectName=Demo&token=…` returns `{feedbacks, total}`; replies hydrated on each item.
  - Happy path (list filter): GET `?projectName=Demo&status=open&token=…` filters.
  - Happy path (get): GET `/[id]?token=…` returns single feedback with replies.
  - Happy path (patch): PATCH `/[id]` with `{status:"resolved"}` → 200, resolvedAt set.
  - Happy path (patch + author): PATCH `/[id]` with `{status:"resolved", author:"agent-alice"}` → 200, author echoed in response but not persisted (document non-persistence).
  - Happy path (reply): POST `/[id]/replies` with `{body:"done", author:"agent-alice"}` → 201, `source:"agent"`.
  - Auth: missing `?token=` → 401.
  - Auth: wrong token → 401.
  - Auth: token for Project A requests feedback from Project B → 404 (never leak existence).
  - Edge case: feedback id not found → 404.
  - Edge case: reply body empty → 400 via `replyCreateSchema`.
  - Edge case: `projectName` missing from list → 400.
  - Security: timing-safe compare (unit test confirms `timingSafeEqual` path is used; implementation-level not behavior-level assertion).
  - Widget route: POST `/api/feedback/[id]/replies` with `{author, body}` → 201, `source:"user"`. No token required.

  **Verification:**
  - `bun run check` + `bun run lint` + `bun run test:run` green.
  - Manual curl of the three agent routes against `apps/demo` running locally with `DATABASE_URL` set returns the expected shapes.

- [ ] **Unit 4 (PHASE 4): Widget composer refactor + Comment chip**

  **Goal:** Replace the 2x2 button grid in the popup with a single styled `<select>` (Comment first, default), update submit-enabled logic, add i18n for `type.comment`, add the `"comment"` panel filter chip.

  **Requirements:** R1, R7.

  **Dependencies:** Unit 2 (theme tokens, panel-sort).

  **Files:**
  - Modify: `packages/widget/src/popup.ts` (~L97–147) — replace the `typeOptions` array + button-loop block with a `<select>` that has five `<option>`s in order: Comment (default), Question, Change, Bug, Other. Set `this.selectedType = "comment"` at construction (was `null`). Wire `select.addEventListener("change", …)`. Remove the now-unused hover/selection logic on per-button elements. Style the `<select>` inline to match the textarea's border/background tokens.
  - Modify: `packages/widget/src/popup.ts` — `updateSubmitState` simplifies to `enabled = this.textarea.value.trim().length > 0`.
  - Modify: `packages/widget/src/panel.ts` (~L135) — add `{ value: "comment", label: this.t("type.comment") }` to `chipOptions` (first position after "All", per brief's ordering).
  - Modify: `packages/widget/src/panel-sort.ts` — already touched in P2; confirm no regressions for the new type's sort position.
  - Modify: `packages/widget/src/i18n/types.ts` — add `"type.comment": string`, `"panel.apiLink": string`, `"panel.apiLinkCopied": string` keys.
  - Modify: `packages/widget/src/i18n/en.ts` — `"type.comment": "Comment"`, `"panel.apiLink": "API link"`, `"panel.apiLinkCopied": "Copied"`.
  - Modify: `packages/widget/src/i18n/fr.ts` — `"type.comment": "Commentaire"`, `"panel.apiLink": "Lien API"`, `"panel.apiLinkCopied": "Copié"`.
  - Test: `packages/widget/__tests__/popup.test.ts` (new or modify) — initial `selectedType === "comment"`; submit enabled as soon as textarea has non-whitespace; changing the `<select>` updates `selectedType`.
  - Test: `packages/widget/__tests__/panel.filter.test.ts` (modify) — Comment chip present and filters.

  **Approach:**
  - The existing `selectType(type, typeRow)` method mutated per-button styling — it becomes a simple `this.selectedType = type`. Delete the dead code paths once the `<select>` is in.
  - Preserve the existing data attribute on the `<select>` (`data-ccm-feedback="popup-type"`) for e2e selectors. Tests that previously queried the button grid by `data-type` attributes need to switch to `<option value="…">` lookup.
  - The `typeComment` color from theme flows into the panel chip border, matching the existing per-type chip styling.

  **Patterns to follow:**
  - Existing `<textarea>` inline CSS in `popup.ts`.
  - Existing chip options array shape in `panel.ts`.
  - CCM-282's i18n fan-out (three files, always together).

  **Test scenarios:**
  - Happy path: Constructing the popup selects `"comment"` by default (verified via `this.selectedType`).
  - Happy path: Typing into the textarea immediately enables submit.
  - Happy path: Changing the `<select>` to `"bug"` sets `selectedType = "bug"` and does not re-disable submit.
  - Edge case: Submitting with whitespace-only textarea stays disabled.
  - Edge case: French locale renders "Commentaire" in the `<select>` first option.
  - Panel filter: Clicking the Comment chip filters feedbacks to the `"comment"` type; clicking again with a status chip composes correctly.
  - Accessibility: `<select>` has `aria-label` (= `t("popup.typeLabel")` — add key if missing, or reuse a generic aria label already present; default `aria-label="Feedback type"`).
  - Regression: existing Question/Change/Bug/Other submissions still round-trip.

  **Verification:**
  - `bun run check` + `bun run lint` + `bun run test:run` green.
  - Manual smoke in `apps/demo`: open widget, land on Comment, type, send, see `"comment"` feedback in the panel.

- [ ] **Unit 5 (PHASE 5): API-link button + replies in detail view**

  **Goal:** Add `agentApiUrl` config, render the "API link" pill in the panel header with clipboard-copy + toast, render replies + composer inside `panel-detail.ts`, add `listReplies`/`addReply` to both `ApiClient` and `StoreClient` (and the shared `WidgetClient` interface).

  **Requirements:** R4, R5, R7.

  **Dependencies:** Units 2 + 3 (replies end-to-end).

  **Files:**
  - Modify: `packages/core/src/types.ts` — add `agentApiUrl?: string` to `CcmFeedbackConfig`.
  - Modify: `packages/widget/src/api-client.ts` — add `listReplies(id: string): Promise<ReplyResponse[]>` and `addReply(id: string, input: { author: string; body: string }): Promise<ReplyResponse>` to the `WidgetClient` interface; implement on `ApiClient` (routes to `${base}/api/feedback/${id}/replies` — GET for list, POST for add).
  - Modify: `packages/widget/src/store-client.ts` — implement `listReplies` (delegates to `store.listReplies`) and `addReply` (delegates to `store.addReply` with `source:"user"`); serialize `ReplyRecord` → `ReplyResponse` like the existing `toResponse` helper.
  - Modify: `packages/widget/src/panel.ts` — in the header-right block (near `deleteAllBtn` / `exportBtn`), when `this.config.agentApiUrl` is present, render a pill button. `onclick` → `navigator.clipboard.writeText(this.config.agentApiUrl!)`; on success show a transient toast using existing toast helper or a minimal inline one; fallback to `document.execCommand("copy")` on clipboard-unavailable.
  - Modify: `packages/widget/src/panel-detail.ts` — under the feedback body, render a `replies` section: for each reply a row showing `author`, a pill badge (`"user"` or `"agent"`, styled with theme colors), `createdAt` relative (reuse existing relative-time helper if present; else inline with `Intl.RelativeTimeFormat`), and the body. Below the list, a `<textarea>` + Send button that calls `client.addReply(feedbackId, { author: currentIdentity.name, body })`. On success, append the new reply to the local list and clear the textarea.
  - Modify: `packages/widget/src/i18n/en.ts` + `fr.ts` + `types.ts` — add `panel-detail` reply keys: `"detail.replies": "Replies"` / `"Réponses"`, `"detail.replyPlaceholder": "Write a reply…"` / `"Écrire une réponse…"`, `"detail.send": "Send"` / `"Envoyer"`, `"detail.source.user": "user"`, `"detail.source.agent": "agent"` (same tokens in both locales — they're identifiers).
  - Test: `packages/widget/__tests__/api-client.replies.test.ts` (new) — GET/POST to `/api/feedback/[id]/replies`.
  - Test: `packages/widget/__tests__/store-client.replies.test.ts` (new).
  - Test: `packages/widget/__tests__/panel-detail.replies.test.ts` (new) — renders reply rows with correct badge; composer `addReply` succeeds and appends.
  - Test: `packages/widget/__tests__/panel.apiLink.test.ts` (new) — button rendered only when `agentApiUrl` set; click writes to `navigator.clipboard` (mocked); toast text matches locale.

  **Approach:**
  - `agentApiUrl` is *just a URL the user configured to hand to an agent* — the widget does not introspect it, does not derive it, does not validate it; it just copies it.
  - Reply row badge: `"user"` uses `typeComment`/`typeCommentBg`, `"agent"` uses `accent`/`accentLight` — agent replies visually stand out without redefining theme tokens.
  - Toast: a `<div>` appended to the panel root, `aria-live="polite"`, fades in+out over ~1500ms. Reuse any existing toast utility in `packages/widget/src/dom/` before adding a new one.
  - `ApiClient.addReply` routes through `resilientFetch` so the replies POST inherits retry+backoff semantics already used by `sendFeedback`.
  - `panel-detail.ts` loads replies lazily on open (or uses the already-hydrated `replies` from the feedback record if present). Prefer the already-hydrated path — the server always includes `replies` in P2.
  - The composer's author defaults to the widget's current identity (name). If identity is not yet set, the identity modal opens first (mirror the send-feedback flow). Do not accept anonymous replies.

  **Patterns to follow:**
  - Existing `exportBtn` + `deleteAllBtn` pill styling in `panel.ts`.
  - Existing `resolveFeedback` shape in `ApiClient` for `addReply`.
  - CCM-284's inline mic-error toast pattern in `popup.ts` for the clipboard toast.

  **Test scenarios:**
  - Happy path (ApiClient): `listReplies("f_1")` GETs `${endpoint%feedback}/feedback/f_1/replies`, returns array.
  - Happy path (ApiClient): `addReply("f_1", {author:"Alice", body:"Hi"})` POSTs body, returns 201 response.
  - Happy path (StoreClient): `addReply` hits `store.addReply` with `source:"user"`; returned shape serialized to `ReplyResponse`.
  - Happy path (panel-detail): Rendering a feedback with two replies shows two rows with correct badges; dates formatted relatively.
  - Happy path (panel-detail): Typing "thanks" + Send clears textarea, appends the new reply row locally, and the list reflects the new count.
  - Happy path (panel apiLink): `agentApiUrl` set → button rendered; click writes URL to mocked clipboard; toast text = `"Copied"` (en) / `"Copié"` (fr).
  - Edge case (apiLink): `agentApiUrl` absent → button not rendered.
  - Edge case (apiLink): clipboard API throws → fallback `execCommand("copy")` path runs; toast still shown. If both fail, show `"panel.apiLinkCopied"` toast in error variant or swallow silently.
  - Edge case (panel-detail): Empty body → send button disabled.
  - Edge case (panel-detail): addReply HTTP 500 → error surfaced inline; textarea content preserved.
  - Accessibility: reply badge pills have `aria-label` in English of `"user reply"` / `"agent reply"`.

  **Verification:**
  - `bun run check` + `bun run lint` + `bun run test:run` green.
  - Manual smoke in `apps/demo`: panel header shows API link button; clicking copies; opening a feedback detail shows existing replies + composer; sending a user reply renders; separately POSTing an agent reply via curl and refreshing the panel shows it with the agent badge.

## System-Wide Impact

- **Interaction graph:** three layers change at once — core types, every adapter, widget UI, and two demo API route trees. Mitigated by phase-level commits and green gates.
- **Error propagation:** adapter `addReply` errors (foreign-key miss, DB down) propagate as `StoreNotFoundError` or generic errors; the agent handler translates to 404/500; the widget composer surfaces inline errors without clearing the textarea.
- **State lifecycle risks:** feedback-delete cascade removes replies automatically (Prisma FK). Memory/localstorage adapters must mirror this explicitly. Panel views stale on remote agent replies until next refresh — documented as deferred (no live push).
- **API surface parity:** two new routes under `/api/v1/agent/feedback` + one new route under `/api/feedback/[id]/replies`. None of the existing endpoints change contract.
- **Integration coverage:** the cross-layer "agent posts reply → widget detail renders it on refresh" path is covered by manual smoke in P5's verification step. Dedicated e2e can be added in a follow-up if the team wants automated coverage.
- **Unchanged invariants:** `feedbackCreateSchema`, `feedbackPatchSchema`, `feedbackDeleteSchema` signatures; annotation intent model; review-batch model; admin APIs; signed-upload + mirror flows. Agent token compare uses the same `timingSafeEqual` primitive as `safeCompare` in the existing handler.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| Plaintext `agentToken` leaking via logs / error payloads | Never log `agentToken`; 401 response body carries only `{error:"Unauthorized"}`; `ProjectStore.rotateAgentToken` return value is the only exposure and it's rotate-time only. Add a lint-style check (comment) reminding future maintainers. |
| Prisma schema regeneration overwriting unrelated manual edits | Convention already in place (CCM-282): never hand-edit `prisma/schema.prisma`. P1 verification step includes a git diff inspection before commit. |
| Adapter drift (memory/localstorage lag behind prisma) | `CcmFeedbackStore` interface widened in P1 — TypeScript enforces parity at `bun run check`. P2 lands all three together. |
| Widget tests relying on the old 2x2 button grid | Enumerated explicitly in P4 test scenarios — switch selectors to the new `<select>` + `<option>` shape. |
| `"comment"` type breaking existing panel sort or chart aggregations | P2 includes `panel-sort.ts` update; no chart aggregations touch `type` today. If one is added later, the widened enum is the right default. |
| Timing-attack linear scan in `findByAgentToken` degrading as projects scale | Acceptable today (<100 projects per deployment). If it becomes hot, swap to an indexed `findFirst` + a dummy `timingSafeEqual` to equalize compare time; document the trade-off then. |
| Clipboard API unavailable in insecure context | P5 implements the `execCommand("copy")` fallback. |

## Documentation / Operational Notes

- Update the `apps/demo` admin runbook (`docs/admin-runbook.md`) to mention `agentToken` rotation (command-line hint only until a UI lands).
- Add a short README section in `packages/adapter-prisma/README.md` documenting `createCcmAgentFeedbackHandler` usage (copy the JSDoc example).
- No monitoring changes. No feature flag — the new type and reply thread ship unconditionally once the migration runs.

## Sources & References

- Linear: CCM-290.
- Related code:
  - `packages/core/src/types.ts`
  - `packages/core/src/schema.ts`
  - `packages/adapter-prisma/src/index.ts`
  - `packages/adapter-prisma/src/project-store.ts`
  - `packages/adapter-prisma/src/validation.ts`
  - `packages/adapter-memory/src/index.ts`
  - `packages/adapter-localstorage/src/index.ts`
  - `packages/widget/src/popup.ts`
  - `packages/widget/src/panel.ts`
  - `packages/widget/src/panel-detail.ts`
  - `packages/widget/src/panel-sort.ts`
  - `packages/widget/src/api-client.ts`
  - `packages/widget/src/store-client.ts`
  - `packages/widget/src/styles/theme.ts`
  - `packages/widget/src/i18n/{en,fr,types}.ts`
  - `apps/demo/src/app/api/feedback/route.ts`
  - `apps/demo/src/lib/store.ts`
- Prior-art plans:
  - `docs/plans/2026-04-20-003-feat-ccm-282-annotation-intents-plan.md` — pattern for "widen `FEEDBACK_TYPES`/`ANNOTATION_TYPES`, regenerate schema, fan out to adapters."
  - `docs/plans/2026-04-20-002-feat-ccm-279-contract-layer-webhook-plan.md` — pattern for a secondary handler factory (`createReviewsHandler`) alongside `createCcmFeedbackHandler`.
