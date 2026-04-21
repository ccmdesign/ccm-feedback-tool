---
title: "CCM-282 Annotation intents: text_change + image_swap"
type: feat
status: active
date: 2026-04-20
linear: CCM-282
depends_on: CCM-279
spec: docs/spec.md
---

# CCM-282 Annotation intents: text_change + image_swap

## Overview

This plan lands the P2 + P3 annotation intents on the CCM Feedback stack: reviewers can now edit text inline and swap images (via pasted URL or local upload) in addition to the existing rectangle pin. Each new intent becomes a typed object — `text_change` with `original_text` + `proposed_text`, or `image_swap` with `original_asset_url` + CCM-hosted `proposed_asset_url` + `asset_meta` — that travels through the widget, the Prisma store, the webhook builder, and the outbound webhook payload per spec §6.1. The `assets` Supabase Storage bucket (provisioned in CCM-277 but not yet wired) becomes the stable mirror for every externally-linked image so downstream consumers see only CCM-hosted URLs.

The work adds a type discriminator column on `FeedbackAnnotation`, two new server endpoints (`POST /api/v1/assets/mirror`, `POST /api/v1/assets/sign-upload`), two new widget modes plumbed through the existing FAB radial menu, and extends the webhook payload builder + panel detail view to render both new intents. It does not implement voice comments, rich-text formatting in text edits, AI-assisted rewrite suggestions, or image editing tools — those stay out of scope.

## Problem Frame

CCM-279 closed the webhook round-trip for rectangle/pin annotations, but the single feature that makes CCM Feedback interesting relative to markup.io / BugHerd is the typed intent model (spec §1): *"every reviewer action becomes a typed object with selectors, coords, and proposed values"*. Today, a reviewer who wants to change a tagline or swap a hero image still writes free-form prose in a rectangle comment, forcing the downstream implementation agent to parse natural language — exactly the failure mode the service was built to eliminate. CCM-282 is the ticket where the typed-intent promise becomes real for the two highest-volume edit categories: text and images.

Three non-mechanical decisions shape the design:

1. **Schema shape.** One `FeedbackAnnotation` table with nullable type-specific columns vs. polymorphic child tables. The plan picks union-on-one-table — keeps existing indexes and queries simple, aligns with the `CCM_FEEDBACK_MODELS` TS source of truth, and avoids a schema-level branch in the webhook builder. The ticket explicitly asked for the tradeoff to be justified; see Key Technical Decisions.
2. **Asset mirroring runtime.** Netlify functions cap body size at ~6 MB, but the spec limit is 10 MB. Proxy-through-function for uploads is not viable; direct-to-Storage via signed upload URL is. Pasted external URLs use a separate mirror endpoint that streams server-side (no client body at all).
3. **Shadow DOM + contenteditable.** The widget runs in a closed Shadow DOM for CSS isolation (CCM-277 baseline). Making host-page text nodes contenteditable from inside a closed shadow root has known selection-API edge cases. Plan: only toggle `contenteditable="true"` on the host-page element, never inside the shadow tree, so `document.getSelection()` and copy/paste behave normally. Explicit mitigation + acceptance test in Unit 7.

## Requirements Trace

Every requirement maps to at least one implementation unit and at least one acceptance check.

- **R1.** `FeedbackAnnotation` gains a `type` discriminator field (default `"rectangle"`, values `"rectangle" | "text_change" | "image_swap"`), plus nullable type-specific columns: `originalText`, `proposedText`, `originalAssetUrl`, `proposedAssetUrl`, `proposedAssetSource` (`"link" | "upload"`), `proposedAltText`, `assetMeta` JSONB.
- **R2.** Existing CCM-279-era annotations backfill to `type = "rectangle"` with all type-specific columns NULL; no payload or API shape regressions for existing rectangle pins.
- **R3.** The widget exposes three annotation modes via the existing FAB radial menu — `Annotate` (rectangle, existing), `Edit text` (new), `Swap image` (new) — plus keyboard shortcuts `R` / `E` / `I` when the FAB is expanded.
- **R4.** `Edit text` mode: hover outline + pencil badge on text elements; click a text node → the host-page element becomes `contenteditable="true"` inside an overlay capture frame; blur submits `{ originalText, proposedText, anchor }`; the affected element retains a persistent "proposed change" badge until dispatched.
- **R5.** `Swap image` mode: hover outline + swap icon on `<img>` / `<picture>` / CSS-background-image elements; click opens a swap panel with (a) URL paste field, (b) drag-drop / file picker; the panel shows old → new thumbnail preview and an alt-text input.
- **R6.** Client-side validation: max 10 MB, formats `jpg | jpeg | png | webp | avif | svg | gif`. Oversized or wrong-MIME inputs are rejected before upload starts with a clear in-panel error.
- **R7.** `POST /api/v1/assets/mirror` accepts `{ projectId, url }`, HEADs the URL to verify `content-type: image/*`, streams the body into Supabase Storage at `assets/<projectId>/<uuid>.<ext>`, and returns `{ proposedAssetUrl, assetMeta: { width, height, sizeBytes, mime } }`. Rejects non-image content-types, SVGs containing `<script>` / `on*=` attributes, and oversized bodies.
- **R8.** `POST /api/v1/assets/sign-upload` accepts `{ projectId, filename, contentType, sizeBytes }`, returns a short-lived Supabase Storage signed upload URL for `assets/<projectId>/<uuid>.<ext>` (5 min TTL). The widget PUTs directly to Storage, bypassing the Netlify function body limit. Server-side validates `contentType` and `sizeBytes` against the same allowlist/10 MB cap before signing.
- **R9.** Widget submission: `text_change` and `image_swap` annotations flow through the same existing `POST /api/feedback` surface and the new feedback payload carries `type`, plus type-specific fields. The Prisma store persists all fields including `assetMeta` as JSON.
- **R10.** Webhook payload (spec §6.1): for `text_change`, `original_text` and `proposed_text` appear at the annotation top level alongside `anchor` and `rect` (NOT nested under `target`). For `image_swap`, `original_asset_url`, `proposed_asset_url`, `proposed_asset_source`, `proposed_alt_text`, `asset_meta` appear at the annotation top level. `proposed_asset_url` is ALWAYS the CCM-hosted mirror — never the external URL the reviewer pasted.
- **R11.** Panel detail view renders a diff view (old → new) for `text_change` using the `diff` npm package, and a side-by-side thumbnail preview for `image_swap`, with alt text rendered underneath the new image.
- **R12.** Shadow DOM isolation survives contenteditable: no style leak host → widget or widget → host; selection APIs behave normally; copy-paste into the editing field works; Escape cancels without saving.
- **R13.** Persistent "proposed change" badge overlays the affected element on the host page after submission and persists until the annotation is dispatched (status `submitted`) or acted on (status `applied` / `rejected` / etc.).
- **R14.** Existing acceptance tests (`bun run test:run`, `bun run test:e2e`) continue to pass; new tests cover Zod schemas, Prisma migration idempotency, asset-mirror validation, webhook payload shape for each type, diff rendering, and the Shadow DOM contenteditable round-trip.

## Scope Boundaries

- No voice comments / Whisper integration (spec §4.4).
- No rich-text formatting in `text_change` — plain-text only this PR.
- No AI-assisted rewrite suggestions for text edits.
- No image cropping / editing / in-browser filter tools beyond swap.
- No replacement of the existing rectangle/area annotation flow — it keeps working unchanged.
- No redesign of the existing CCM-279 webhook `target`-vs-`anchor+rect` naming drift from spec §6.1 (flag for follow-up; see Unchanged Invariants). New fields are additive.
- No Supabase Storage RLS tightening beyond public read on the `assets` bucket — a follow-up can add signed-read URLs once the bucket is used by a consumer with tenancy requirements.
- No rate limiting on `/api/v1/assets/*` beyond the shape validation — a follow-up ticket can add a token bucket or middleware-level limit.
- No re-hosting of already-hosted assets. If the reviewer pastes a URL that is already on the CCM Storage origin, return it unchanged without re-streaming.
- No multipart/chunked uploads for files above 10 MB — the limit is hard.
- No image optimization (resize, reformat, WebP conversion) server-side.
- No progress-bar UI for slow uploads beyond a generic spinner.

### Deferred to Separate Tasks

- **Voice comments via Whisper** (spec §4.4): separate ticket, post-CCM-282.
- **Widget bundle analysis for `diff` package impact**: follow-up — the widget bundle budget is tight; if `diff` is heavier than expected in production build, swap for a hand-rolled word diff (~15 LOC).
- **SVG sanitization via DOMPurify server-side**: the current plan uses a regex-scan for `<script>`/`on*=` as a coarse reject. Real sanitization is follow-up once the `assets` bucket sees real SVG traffic.
- **Per-project storage quotas / cost monitoring**: follow-up. Pasted-URL mirroring could balloon storage if abused.
- **Signed-read URLs for private assets**: out of scope. The `assets` bucket stays public-read.
- **Bulk / selection-range text edits**: out of scope — one text node per annotation.
- **Image swap for CSS `background-image`**: the plan covers detection + swap of `<img>` / `<picture>`; CSS background-image is detected (cursor shows swap icon) but swapping it requires injecting an inline style on the host element, which is deferred to a follow-up to keep the PR scope sane. For this PR, a CSS-background element is treated as click-to-swap on the target element, and the proposed swap records the CSS-background URL as `original_asset_url` + the new URL as `proposed_asset_url` without attempting to restyle the host page.

## Context & Research

### Relevant Code and Patterns

- **Source of truth for DB models**: `packages/core/src/schema.ts` — `CCM_FEEDBACK_MODELS.FeedbackAnnotation` currently has anchor + rect + viewport + CCM-279 status fields (but no `type`). Follow the pattern from CCM-279: hand-edit both `schema.ts` and `prisma/schema.prisma` in the same commit; the drift guard is still a follow-up.
- **Existing annotation pipeline**: `packages/widget/src/annotator.ts` → `Annotator` class creates a full-page overlay with rectangle drawing and routes completion through `bus.emit("annotation:complete", ...)` → `launcher.ts` listener constructs a `FeedbackPayload` → `api-client.sendFeedback()` → adapter-prisma `createFeedback()`. New modes plug into the same event + payload pipeline so there's no new submit codepath.
- **DOM anchoring**: `packages/widget/src/dom/anchor.ts` exposes `generateAnchor(element)` → `AnchorData` with CSS selector + xpath + text snippet + fingerprint. Reuse verbatim for text and image elements — the anchor logic is type-agnostic.
- **Panel detail rendering**: `packages/widget/src/panel-detail.ts` (1106 lines) is the existing detail view. New rendering branches live inside it, gated by `annotation.type`.
- **FAB radial menu**: `packages/widget/src/fab.ts` items list is defined in-constructor (line 41-45) — adding two new items (`edit-text`, `swap-image`) plus routing them through `handleItemClick` (line 215-235) keeps the UX consistent.
- **Event bus**: `packages/widget/src/events.ts` defines `WidgetEvents` — add `"text-edit:start"`, `"text-edit:complete"`, `"image-swap:start"`, `"image-swap:complete"` events alongside the existing `annotation:*` events. Concurrency guard in `launcher.ts` extends to all three modes so two modes can't run simultaneously.
- **Prisma store createFeedback**: `packages/adapter-prisma/src/index.ts` lines 90-128 construct the `feedbackItem.create({ annotations: { create: [...] } })` call — extend to map new fields. `flattenAnnotation` in `packages/core/src/types.ts` becomes type-aware.
- **Webhook builder**: `packages/core/src/webhook/payload.ts` `buildWebhookPayload()` is the single function that constructs the §6.1 payload; all type-specific serialization belongs here.
- **Zod validation**: `packages/adapter-prisma/src/validation.ts` `feedbackCreateSchema` currently flattens anchor+rect under `annotations`. Extension is additive — new optional fields per type, with a Zod `superRefine` or `discriminatedUnion` to enforce "text_change must have proposedText" / "image_swap must have proposedAssetUrl".
- **API route pattern**: `apps/demo/src/app/api/v1/*/route.ts` files are small wrappers that call `createXxxHandler()` factories from `@ccm-feedback/adapter-prisma` — follow that for `/api/v1/assets/mirror` and `/api/v1/assets/sign-upload`.
- **Supabase client wiring**: `apps/demo/src/lib/supabase/admin.ts` already exports `createSupabaseAdminClient()` (service-role, persist: false) — reuse for Storage calls via `.storage.from("assets")`.
- **Migration style**: `prisma/migrations/ccm-279-projects-and-annotations/migration.sql` uses `IF NOT EXISTS` everywhere + `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` for `ADD CONSTRAINT`. Same idempotency pattern applies.
- **Tests layout**: `packages/core/__tests__/webhook-payload.test.ts` + `packages/adapter-prisma/__tests__/validation.test.ts` are the closest analogs for contract tests. Widget UX tests go in `packages/widget/__tests__/widget/annotator.test.ts` (extend) and a new `packages/widget/__tests__/widget/text-edit.test.ts` + `image-swap.test.ts`.
- **E2E harness**: `e2e/widget.spec.ts` + `e2e/server.mjs` — extend for text edit + image swap by URL paste. Local-file upload E2E is omitted (Playwright file-input fixtures are acceptable but the signed-upload round-trip is integration-tested at the handler level instead).
- **Supabase bucket provisioning note**: `todos/CCM-277-residuals.md` confirms the `assets` bucket was provisioned in CCM-277 via the Supabase MCP but not wired in code. This PR wires it.

### Institutional Learnings

- `docs/solutions/` still does not exist. The two existing plans (`2026-04-20-001-refactor-ccm-277-baseline-rebrand-plan.md` and `2026-04-20-002-feat-ccm-279-contract-layer-webhook-plan.md`) are the convention reference. Confirmed patterns: hand-edit both `schema.ts` and `schema.prisma` in the same commit; keep Supabase/Netlify provisioning as orchestrator handoff; keep the last unit dedicated to end-to-end acceptance verification.
- CCM-279 established that the webhook builder `buildWebhookPayload()` is the single source of outbound payload shape. Do not duplicate the shape in the handler, the store, or the widget.
- CCM-277 established that the Prisma client singleton lives at `apps/demo/src/lib/prisma.ts`. New server endpoints reuse it via `resolveStore()` / `resolveProjectStores()` in `apps/demo/src/lib/ccm-stores.ts`.

### External References

- **Supabase Storage API (signed upload URLs)**: `supabase.storage.from(bucket).createSignedUploadUrl(path, { upsert: false })` returns `{ signedUrl, token, path }`. Client PUTs the file body to `signedUrl` with `Content-Type` header matching the declared MIME. TTL is not configurable at the call site — it defaults to 2 hours (server-side), but the signed token ties to the specific path so stale tokens are self-limiting. (https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)
- **Supabase Storage server-side upload**: `supabase.storage.from(bucket).upload(path, Buffer, { contentType, upsert: false })` is the API used by the mirror endpoint. Stream-friendly via `ReadableStream`/`ArrayBuffer`. Response: `{ data: { path, id, fullPath }, error }`.
- **`diff` npm package**: ~20KB minified, exports `diffWords(old, new)` returning `{ value, added, removed }[]`. Simpler than `diff-match-patch` (55KB, character-level) — word diff is what the panel detail view wants.
- **`image-size` npm package**: tiny pure-JS image dimension detector supporting JPEG, PNG, WebP, AVIF, SVG, GIF headers. No native bindings (unlike `sharp`), so it survives Netlify function cold starts.
- **Shadow DOM + contenteditable gotchas**: Chromium/WebKit/Firefox all support `contenteditable` on host-page elements regardless of the page hosting a closed shadow root. `document.getSelection()` returns the correct Range for host-page editable regions because the shadow root doesn't own the text nodes. Firefox gained `ShadowRoot.getSelection()` in 126 (Apr 2024) — relevant only if editing happens inside the shadow tree, which this plan explicitly avoids.
- **MIME sniffing for SVG uploads**: `<script>` and `on*=` attribute regex is a coarse reject that catches most naïve XSS payloads but NOT well-crafted ones (entity-encoded `<script>`, `<use href="data:...">`, `<foreignObject>` with HTML/JS). The plan accepts this as first-pass; follow-up switches to a server-side DOMPurify pass.
- **Netlify function body size**: https://docs.netlify.com/functions/overview/#synchronous-function-request-payload-size — 6 MB cap confirms the signed-upload-bypass approach is required.

## Key Technical Decisions

- **Schema shape: union-on-one-table with a `type` discriminator.**
  - `FeedbackAnnotation` gains `type String @default("rectangle")` plus 7 nullable columns (`originalText`, `proposedText`, `originalAssetUrl`, `proposedAssetUrl`, `proposedAssetSource`, `proposedAltText`, `assetMeta Json?`).
  - **Why not polymorphic child tables** (e.g. `FeedbackAnnotationTextChange` + `FeedbackAnnotationImageSwap`): the three types share 70% of the schema (anchor, rect, viewport, scroll, device pixel ratio, status, implementation result) — a polymorphic split would either duplicate 11 columns across each child or require a parent-pointer + join per read. Neither reads well in the webhook builder, which must join all three types into a single flat `WebhookAnnotationPayload` array. Union-on-one-table lets `buildWebhookPayload()` stay a single `.map()` and keeps the index on `(status)` useful for the admin filter.
  - **Why not a `data Json` blob**: loses static types at the store boundary, and the Zod + TS assertion pattern (`_AssertCreate`) breaks. Typed columns + Zod `discriminatedUnion` at the validation layer preserves the compile-time safety net.
  - **Migration risk — tiny**: default `"rectangle"` preserves all existing data; type-specific columns are added nullable. No data migration script required beyond the `ALTER TABLE` statements.

- **Asset mirroring runtime: direct-to-Storage signed upload for files, stream-through-function for URLs.**
  - **File upload path**: `POST /api/v1/assets/sign-upload` → signed URL → client PUTs directly to Supabase. Body never crosses a Netlify function. 10 MB cap enforced client-side (`File.size`) + server-side (signed URL rejects oversized writes? Supabase doesn't enforce — we enforce by rejecting signing for oversized declarations, and the signed URL is only valid for the declared path so a larger body written to the same path is still limited by Supabase's global file-size cap, which we keep ≤50 MB on the bucket so abuse is bounded).
  - **URL paste path**: `POST /api/v1/assets/mirror` → server `HEAD` validates → server `GET` streams into `.storage.from("assets").upload(path, body)`. The function body is the small `{ projectId, url }` JSON request, not the asset bytes — so the 6 MB function cap does not apply. The streamed asset flows Netlify → Supabase without buffering the full body in memory (use `ReadableStream` all the way through).
  - **Both paths**: return `{ proposedAssetUrl, assetMeta }` with the CCM-hosted URL. Widget never stores the external URL in `proposedAssetUrl` — only the mirrored one. `originalAssetUrl` stores the pre-swap `<img src>` as the "before" snapshot (external URLs are preserved for reference only, not for downstream consumption).
  - **Why not a single endpoint that branches**: mirror is server-initiated GET, sign-upload is client-initiated PUT. They have different auth surfaces, different body shapes, different failure modes. One endpoint each keeps each function small and testable.

- **Asset endpoint auth: no auth in v1, gated by project existence + payload shape validation.**
  - Both `/api/v1/assets/mirror` and `/api/v1/assets/sign-upload` require a valid `projectId` and reject requests for unknown projects. This matches the §6.2 callback-endpoint pattern.
  - Rate limiting is deferred. Abuse risk: a malicious caller could (a) fill Storage with pasted URLs or (b) enumerate signed upload paths. Mitigations in this PR: reject any request whose `projectId` doesn't resolve to a `Project` row, cap upload size at 10 MB, cap mirror source at 10 MB, and reject non-image content types.
  - Follow-up: add a per-project rate limiter (in-memory or Redis-backed) once real usage patterns emerge.

- **Diff library: `diff` (not `diff-match-patch`).**
  - `diffWords(old, new)` is the exact API the panel detail view needs.
  - 20 KB vs 55 KB — meaningful in the widget bundle.
  - Word-level granularity is more human-readable than character-level for prose diffs.
  - **Only used in the panel detail view** — the mode overlays and submission payload do not need diff rendering. This scopes the bundle cost to "panel detail was opened" which is pay-on-demand for widget users.

- **Supabase Storage client: reuse the existing service-role admin client.**
  - `apps/demo/src/lib/supabase/admin.ts` already exists as a placeholder. This PR makes it real by importing it in the two new asset handlers.
  - The service-role key bypasses RLS (we need this to write into `assets/<projectId>/` without per-reviewer auth). Security posture: the service-role key is only present in server-side env, never shipped to the widget.
  - **Why not install a separate Storage SDK**: `@supabase/supabase-js@^2.49.0` (already in `apps/demo/package.json`) exposes `.storage` natively.

- **Widget mode switcher UX: extend the FAB radial menu.**
  - Existing FAB already has 3 items (chat, annotate, toggle-annotations). Add `edit-text` + `swap-image` → 5 items total.
  - Keyboard shortcuts: `R` (rectangle), `E` (edit text), `I` (image swap) when FAB is expanded. Escape closes any active mode.
  - **Why not a separate toolbar**: consistency with existing UX; two more radial items is still legible in a vertical stack at 54 px gap.
  - **Why not click-to-activate** on arbitrary elements: needs a mode to know whether click = pin = edit = swap. The FAB mode selector is the explicit switch.

- **Image meta extraction: dual path (client for UX, server for source-of-truth).**
  - Client-side: `new Image()` + `onload` reads `.naturalWidth` / `.naturalHeight` for pasted URLs (to render the thumbnail preview immediately, before server mirror completes). `File.size` / `File.type` for local uploads.
  - Server-side: on mirror, after streaming into Storage, re-open the stored object's first-chunk header via `image-size` to canonicalize dimensions. This is the value stored in `asset_meta` — client-derived values are UX only and discarded before submission.
  - **Why canonicalize server-side**: the client can lie or be buggy; the implementation agent downstream needs trustworthy dimensions for alt-text validation or responsive srcset generation.

- **Shadow DOM + contenteditable strategy: edit host-page nodes, not shadow-tree nodes.**
  - When the reviewer clicks a text element in `edit-text` mode, the widget overlay captures the click, identifies the host-page text node, and sets `contenteditable="true"` directly on that host-page element. A dashed outline is applied via an inline `style.outline` attribute on the host element (not via a CSS class, so host stylesheets can't override it).
  - On blur, the widget reads `element.innerText`, strips `contenteditable`, strips the inline outline, and submits.
  - **Why edit the host element, not a shadow overlay**: selection APIs, IME input, undo stack, copy/paste all work unchanged. The shadow DOM hosts only the mode indicator badge + the overlay click-interception surface, not the editor itself.
  - **Style leak risk**: inline `style.outline` is scoped to that one element; when the edit ends, the attribute is removed. Any residual visual change survives only until submission.
  - **Gotcha mitigation**: some host pages set `user-select: none` on text via CSS. The widget briefly sets `element.style.userSelect = "text"` while editing; restored on blur.

- **Badge persistence across reloads: anchor-resolve + render.**
  - After submission, the annotation row carries its `anchor` and new type-specific fields. On widget reload, the existing `markers.render()` path (used for rectangle pins) is extended to also render a type-specific badge at the anchored element's position.
  - For `text_change`: a small orange dot in the top-right corner of the anchored element's bounding box.
  - For `image_swap`: a "proposed swap" icon badge overlayed on the top-right of the image.
  - Both persist until the status moves out of `submitted` — the CCM-279 status chip already handles that on the detail view; the on-page badge consults the same status.

- **Webhook payload shape: additive, type-specific fields at annotation top level.**
  - `buildWebhookPayload()` in `packages/core/src/webhook/payload.ts` gains a per-type branch that adds optional fields to each emitted annotation:
    - `text_change`: `original_text`, `proposed_text`
    - `image_swap`: `original_asset_url`, `proposed_asset_url`, `proposed_asset_source`, `proposed_alt_text`, `asset_meta: { width, height, size_bytes, mime }`
  - The existing `anchor` and `rect` objects stay as-is for all types. `message` stays as the optional accompanying comment.
  - **Canonical JSON stability**: the new fields participate in the sorted-keys canonicalizer automatically — no change needed to `canonicalize()`. Verifier script reproduces the exact same bytes.
  - **Why not nest under `target`**: the ticket is explicit ("NOT nested under `target`"). Spec §6.1 uses `target`, current implementation uses `anchor`+`rect` (CCM-279 existing drift); keeping the existing shape preserves compatibility with anything an implementation agent already implemented against the CCM-279 payload.

- **Test strategy: unit-heavy contract, integration for handlers, E2E for the three acceptance paths.**
  - **Unit (vitest)**:
    - `packages/core/__tests__/schema-annotation-types.test.ts`: model includes `type` + type-specific columns.
    - `packages/core/__tests__/webhook-payload.test.ts` (extend): `text_change` emits `original_text`/`proposed_text` at top level; `image_swap` emits `original_asset_url` / `proposed_asset_url` / `asset_meta`; canonicalization output differs only in the expected places.
    - `packages/adapter-prisma/__tests__/validation.test.ts` (extend): discriminated-union Zod schema rejects mismatched shapes (text_change without `proposedText`, image_swap with external `proposedAssetUrl`).
    - `packages/adapter-prisma/__tests__/asset-mirror.test.ts` (new): valid image URL mirrors → Storage; non-image content-type rejected; oversized source rejected; SVG with `<script>` rejected; identical-origin URL returned unchanged.
    - `packages/adapter-prisma/__tests__/asset-sign-upload.test.ts` (new): oversized declared size rejected; wrong MIME rejected; valid request returns signed URL.
  - **Integration**:
    - `apps/demo/src/app/api/v1/assets/__tests__/mirror.test.ts`: handler wiring with a mocked Storage client.
    - `apps/demo/src/app/api/v1/assets/__tests__/sign-upload.test.ts`: handler wiring.
  - **E2E (Playwright)**: extend `e2e/widget.spec.ts` with three scenarios — edit a heading, swap an image via pasted URL, swap an image via local file picker (file fixture). Assert widget panel detail view renders the diff / thumbnails correctly.
  - **Characterization** (lightweight): `packages/widget/__tests__/widget/text-edit.test.ts` and `image-swap.test.ts` exercise the DOM event pipeline without a real server (MemoryStore + the StoreClient).

## Open Questions

### Resolved During Planning

- **Is `type` already on `FeedbackAnnotation`?** No. `packages/core/src/schema.ts` and `prisma/schema.prisma` both omit it. Added in Unit 1. Default `"rectangle"` backfills existing rows.
- **Prisma column strategy: union-on-one-table vs. polymorphic?** Union-on-one-table. See Key Technical Decisions.
- **Asset mirroring auth?** No auth in v1; gated by project existence. Defer rate limiting to follow-up. Matches §6.2.
- **Diff library?** `diff` (word-level). See Key Technical Decisions.
- **Supabase Storage client wiring?** Reuse `createSupabaseAdminClient()` from `apps/demo/src/lib/supabase/admin.ts`. No new packages.
- **Widget mode switcher UX?** Extended FAB radial menu + R/E/I keyboard shortcuts.
- **Image meta extraction?** Client + server, server wins on `asset_meta`.
- **Netlify function body size mitigation?** Signed upload URL bypass for uploads; stream-through for URL mirror.
- **Shadow DOM + contenteditable approach?** Edit host-page element directly; never inside the shadow tree. Mitigation + explicit test in Unit 7.
- **Where does `message` come from for typed intents?** Widget text/image panels include an optional "Accompanying comment" field. When empty, the widget fills `message` with `"[text edit]"` or `"[image swap]"` to satisfy the `min(1)` schema constraint.

### Deferred to Implementation

- **Exact Zod union shape**: `z.discriminatedUnion("type", [...])` vs. `z.union([...]).superRefine(...)`. Both work; pick at implementation time based on Zod's current error messages (Zod's discriminatedUnion gives better error paths but is stricter about overlapping fields).
- **CSS-background-image anchor strategy**: deferred to the implementation — the cursor indicator can show the swap icon over any element with a non-empty `getComputedStyle(el).backgroundImage`, but the Unit 5 scope is `<img>` / `<picture>` only. Extending to CSS backgrounds is a follow-up flagged in Scope Boundaries.
- **`image-size` vs lazy-import alternative**: if the mirror handler bundle exceeds a reasonable Netlify function cold-start budget, use a WHATWG `ReadableStream` header-only read (first 512 bytes) + hand-rolled magic-number sniffer instead. Decide at implementation.
- **Thumbnail aspect ratio in panel**: implementer picks — 16:9, 1:1, or intrinsic. Preference: intrinsic with `max-height: 200px` and `object-fit: contain`.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### End-to-end flow (text_change + image_swap)

```
Reviewer clicks FAB → picks mode      ┌──────────────────────────────┐
   (R | E | I)                         │  annotator.ts (existing, mode="rectangle")
                                       │  text-edit-mode.ts   (new)
                                       │  image-swap-mode.ts  (new)
                                       └──────────────┬───────────────┘
                                                       │ emits
                                                       │   bus.emit("annotation:complete", { type, ...payload })
                                                       ▼
                          ┌──────────────────────────────────────────┐
                          │ launcher.ts (existing handler, widened)  │
                          │   • builds FeedbackPayload with new fields│
                          │   • calls api-client.sendFeedback(payload)│
                          └──────────────┬───────────────────────────┘
                                         │
          ┌──────────────────────────────┴─────────────────────────────┐
          ▼                                                             ▼
POST /api/feedback                         (image_swap ONLY)
  (existing route, widened validation)     POST /api/v1/assets/mirror  (URL paste)
                                          POST /api/v1/assets/sign-upload (file upload)
          │                                       │
          ▼                                       ▼
PrismaStore.createFeedback                 Supabase Storage
  (widened: persists type-specific         assets/<projectId>/<uuid>.<ext>
   columns + assetMeta JSON)
          │
          │   (later: reviewer clicks "Submit review")
          ▼
POST /api/v1/reviews → dispatchReviewBatch
          │
          ▼
buildWebhookPayload (widened: emits       ─────►  implementation agent webhook
type-specific fields at annotation                  (CCM-hosted proposed_asset_url
top level per spec §6.1)                             + typed fields per §6.1)
```

### FeedbackAnnotation schema shape (union-on-one-table)

```
FeedbackAnnotation {
  -- common (existing)
  id, feedbackId, cssSelector, xpath, textSnippet, elementTag, elementId,
  textPrefix, textSuffix, fingerprint, neighborText,
  xPct, yPct, wPct, hPct, scrollX, scrollY, viewportW, viewportH,
  devicePixelRatio, createdAt, status, implementationResult, implementationUpdatedAt,

  -- new: discriminator
  type  String @default("rectangle")   // "rectangle" | "text_change" | "image_swap"

  -- new: text_change fields (nullable)
  originalText        String?  @db.Text
  proposedText        String?  @db.Text

  -- new: image_swap fields (nullable)
  originalAssetUrl    String?  @db.Text
  proposedAssetUrl    String?  @db.Text
  proposedAssetSource String?   // "link" | "upload"
  proposedAltText     String?  @db.Text
  assetMeta           Json?     // { width, height, sizeBytes, mime }
}
```

### Discriminated-union validation shape (Zod)

```
annotationSchema = z.discriminatedUnion("type", [
  // rectangle (existing shape, type defaults to "rectangle")
  z.object({ type: z.literal("rectangle"), anchor, rect, scroll, viewport, dpr }),

  // text_change
  z.object({ type: z.literal("text_change"), anchor, rect, scroll, viewport, dpr,
             originalText: z.string().min(1).max(5000),
             proposedText: z.string().min(1).max(5000) }),

  // image_swap
  z.object({ type: z.literal("image_swap"), anchor, rect, scroll, viewport, dpr,
             originalAssetUrl: z.string().url().max(2000),
             proposedAssetUrl: z.string().url().max(2000)
                .refine(u => u.startsWith(CCM_STORAGE_ORIGIN), "must be CCM-hosted"),
             proposedAssetSource: z.enum(["link", "upload"]),
             proposedAltText: z.string().max(500).optional(),
             assetMeta: z.object({
               width: z.number().int().positive(),
               height: z.number().int().positive(),
               sizeBytes: z.number().int().positive().max(10_485_760),  // 10 MB
               mime: z.enum(["image/jpeg","image/png","image/webp","image/avif","image/svg+xml","image/gif"])
             }) }),
])
```

### Asset mirror endpoint control flow

```
POST /api/v1/assets/mirror
body: { projectId, url }
│
├─ validate projectId exists        ──► 400 unknown project
├─ validate url is well-formed      ──► 400 bad url
├─ HEAD url                         ──► 400 non-image MIME | > 10 MB
├─ (origin already CCM-hosted?)     ──► 200 return url unchanged
├─ GET url as ReadableStream
├─ (if svg) scan for <script>/on*=  ──► 400 unsafe svg
├─ sniff dimensions via image-size  ──► 400 unreadable image
├─ upload stream → assets/<project>/<uuid>.<ext>
└─ 200 { proposedAssetUrl, assetMeta }
```

## Implementation Units

- [ ] **Unit 1: Schema — add `type` discriminator and type-specific columns to `FeedbackAnnotation`**

**Goal:** Extend the `FeedbackAnnotation` TS source of truth and Prisma schema with a `type` column plus 7 nullable type-specific columns, and ship the idempotent migration SQL. Default `"rectangle"` preserves all existing data.

**Requirements:** R1, R2

**Dependencies:** None (first unit).

**Files:**
- Modify: `packages/core/src/schema.ts` — add `type`, `originalText`, `proposedText`, `originalAssetUrl`, `proposedAssetUrl`, `proposedAssetSource`, `proposedAltText`, `assetMeta` to `CCM_FEEDBACK_MODELS.FeedbackAnnotation`. Also add a new `[{ fields: ["type"] }]` index.
- Modify: `prisma/schema.prisma` — mirror the same additions with `@db.Text` annotations where appropriate and `Json?` for `assetMeta`.
- Create: `prisma/migrations/ccm-282-annotation-intents/migration.sql` — `ALTER TABLE FeedbackAnnotation ADD COLUMN IF NOT EXISTS ...` for each new column; `CREATE INDEX IF NOT EXISTS` for the type index.
- Create: `docs/migrations/CCM-282-annotation-intents.md` — short runbook describing the migration, the default backfill semantics, and rollback.
- Test: `packages/core/__tests__/schema-annotation-types.test.ts` — assert all new fields are present on the frozen `CCM_FEEDBACK_MODELS.FeedbackAnnotation` definition and that the `type` field has the expected default.

**Execution note:** Test-first — the schema-model assertion is a one-line Object.keys check; write it first, watch it fail, then land the schema edit.

**Approach:**
- Use the same nullable-column + idempotent-migration pattern that CCM-279 used. `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` wrapping is not needed for plain `ADD COLUMN IF NOT EXISTS` but is needed for any future `ADD CONSTRAINT` (none in this unit).
- Index on `type` to let the admin dashboard filter by annotation intent efficiently once more intents exist.
- JSON column (`assetMeta`) uses Prisma's `Json?` — no shape enforcement at the DB level; Zod owns that in Unit 3.

**Patterns to follow:**
- `prisma/migrations/ccm-279-projects-and-annotations/migration.sql` — idempotent `ADD COLUMN IF NOT EXISTS`.
- `packages/core/src/schema.ts` existing field definitions with `nativeType: "Text"`.

**Test scenarios:**
- Happy path — `CCM_FEEDBACK_MODELS.FeedbackAnnotation.fields.type` exists with default `"rectangle"`.
- Happy path — all 7 new columns exist with `optional: true` and appropriate `nativeType`.
- Happy path — migration SQL applies cleanly to a fresh db matching the CCM-279 schema.
- Edge case — migration re-run is a no-op (asserts `IF NOT EXISTS` behavior via an integration-level test that runs the SQL twice).

**Verification:**
- `bun run check` passes; `bunx prisma generate --schema=prisma/schema.prisma` succeeds.
- The existing `packages/core/__tests__/schema-ccm279.test.ts` still passes; the new test file passes.
- `bunx prisma db push` against a local Postgres test DB succeeds, and re-running it produces "already in sync".

- [ ] **Unit 2: Types + helpers — widen `AnnotationCreateInput` / `AnnotationRecord` / `flattenAnnotation` for typed intents**

**Goal:** Extend the public TS types in `packages/core/src/types.ts` and the `flattenAnnotation` helper to carry `type` + type-specific fields end-to-end. No runtime behavior changes yet — this unit is purely types and the flat-to-nested transformer.

**Requirements:** R1, R9

**Dependencies:** Unit 1 (schema fields exist to mirror in types).

**Files:**
- Modify: `packages/core/src/types.ts` — widen `AnnotationCreateInput` with `type`, `originalText?`, `proposedText?`, `originalAssetUrl?`, `proposedAssetUrl?`, `proposedAssetSource?`, `proposedAltText?`, `assetMeta?`. Widen `AnnotationRecord` and `AnnotationResponse` the same way. Widen `AnnotationPayload` (the widget-facing shape) with a `type` field + optional type-specific fields. Widen `flattenAnnotation` to pass all new fields through.
- Test: `packages/core/__tests__/flatten-annotation.test.ts` — new test that exercises all three type shapes through `flattenAnnotation`.

**Approach:**
- New fields are all `?` optional on `AnnotationCreateInput` / `AnnotationRecord` so rectangle payloads from existing callers compile unchanged.
- `AnnotationPayload` (the nested widget shape) gains a `type: "rectangle" | "text_change" | "image_swap"` literal plus the flat type-specific fields. The widget constructs this object; `flattenAnnotation` is the bridge to `AnnotationCreateInput`.
- `AssetMeta` interface defined alongside in `types.ts` — shared between widget, validation, and webhook payload.

**Execution note:** Test-first. The flattener is pure; the tests describe the input/output table for each type.

**Patterns to follow:**
- Existing `AnnotationPayload` → `AnnotationCreateInput` shape in `packages/core/src/types.ts` lines 241-263.
- Existing `AnnotationResponse` dates-as-strings serialization.

**Test scenarios:**
- Happy path (rectangle) — passing an `AnnotationPayload` with `type: "rectangle"` through `flattenAnnotation` yields existing shape + `type: "rectangle"`, no text / asset fields set.
- Happy path (text_change) — `originalText` + `proposedText` pass through.
- Happy path (image_swap) — all 5 asset fields pass through, `assetMeta` keeps JSON shape.
- Edge case — omitting optional fields does not cause `undefined` to leak into the returned object in a way that breaks `exactOptionalPropertyTypes`.

**Verification:**
- `bun run check` passes.
- New test file passes.
- Existing `packages/core/__tests__/` tests continue to pass (regression gate).

- [ ] **Unit 3: Validation — discriminated-union Zod schema for annotations**

**Goal:** Replace the single `annotationSchema` in `packages/adapter-prisma/src/validation.ts` with a `z.discriminatedUnion("type", [...])` that enforces type-specific constraints (text_change must have `proposedText`; image_swap must have a CCM-hosted `proposedAssetUrl` + complete `assetMeta`).

**Requirements:** R9, R10, R14

**Dependencies:** Unit 2 (types are widened).

**Files:**
- Modify: `packages/adapter-prisma/src/validation.ts` — replace `annotationSchema` with a discriminated union. Add `ccmStorageOriginRefine()` helper that reads `CCM_STORAGE_ORIGIN` env (or a default derived from `NEXT_PUBLIC_SUPABASE_URL + /storage/v1/object/public/assets/`) and rejects `proposedAssetUrl` values that don't start with it. Update the type-level assertions (`_AssertCreate` etc.) to match.
- Create: `packages/adapter-prisma/src/validation/asset.ts` — `assetMirrorRequestSchema`, `signUploadRequestSchema` Zod schemas used by the two new endpoints (Unit 8, Unit 9).
- Test: `packages/adapter-prisma/__tests__/validation.test.ts` (extend) — add test cases per type, mismatched-shape rejection, CCM-origin check, oversized `assetMeta.sizeBytes`, unsupported MIME.

**Execution note:** Test-first. This is the contract gate for the widget → server boundary.

**Approach:**
- `z.discriminatedUnion("type", [rectSchema, textSchema, imageSchema])` where each branch extends a shared `baseAnchorSchema`.
- The `proposedAssetUrl` refinement reads the CCM origin from env at schema construction — module-level `const` with a sensible dev default (`http://localhost:54321/storage/v1/object/public/assets/` for local Supabase).
- `assetMeta.mime` enum mirrors the client-side allowlist; keep the two lists in a shared `ALLOWED_IMAGE_MIMES` constant exported from `packages/core/src/types.ts`.
- The TS interface assertions (`_AssertCreate`) require the discriminated-union inference to align; if Zod inference is awkward, use `z.infer<typeof annotationSchema>` directly as the canonical TS type and remove the manual interface for annotations (keep it for other schemas).

**Patterns to follow:**
- `packages/adapter-prisma/src/validation.ts` — existing `_AssertCreate` compile-time check.
- `packages/adapter-prisma/src/validation/review.ts` — existing Zod schema pattern.

**Test scenarios:**
- Happy path (rectangle) — existing payload shape parses unchanged.
- Happy path (text_change) — valid `originalText` + `proposedText` parse.
- Happy path (image_swap) — valid payload with CCM-hosted URL + complete meta parses.
- Error path — `type: "text_change"` without `proposedText` returns a Zod error with path `proposedText`.
- Error path — `type: "image_swap"` with external (non-CCM) `proposedAssetUrl` rejected with refinement message.
- Error path — `assetMeta.sizeBytes = 11_000_000` rejected (>10 MB).
- Error path — `assetMeta.mime = "image/tiff"` rejected (not in allowlist).
- Edge case — `assetMeta` with extra keys passes through (Zod strips by default).

**Verification:**
- `bun run check` passes.
- Existing validation tests + new test cases pass.

- [ ] **Unit 4: Prisma store + `createFeedback` widening**

**Goal:** Update `PrismaStore.createFeedback()` to persist new annotation fields, update `ReviewBatchStore.getAnnotationsForDispatch()` to hydrate them on reads.

**Requirements:** R1, R9

**Dependencies:** Unit 1 (DB columns), Unit 2 (types).

**Files:**
- Modify: `packages/adapter-prisma/src/index.ts` — extend the `annotations.create` mapping in `createFeedback` to include the 8 new fields (with `?? null` coercion for optionals).
- Modify: `packages/adapter-prisma/src/review-batch-store.ts` — extend `getAnnotationsForDispatch` select/return shape with the new fields, update `RawAnnotationJoin` interface accordingly.
- Test: `packages/adapter-prisma/__tests__/handler.test.ts` (extend) — round-trip create + read for text_change and image_swap payloads (MemoryStore not suitable; use an in-memory mock Prisma client).
- Test: `packages/adapter-prisma/__tests__/review-dispatch.test.ts` (extend) — `getAnnotationsForDispatch` returns the new fields.

**Execution note:** Test-first — write the round-trip test with a mocked Prisma client that captures the `create` args; assert the new fields are in the args.

**Approach:**
- Narrow mapping: wherever the existing code maps `ann.xPct`, add `ann.type`, `ann.originalText ?? null`, etc.
- `assetMeta` passes through as-is (Prisma `Json` accepts `any` object).

**Patterns to follow:**
- `packages/adapter-prisma/src/index.ts` `createFeedback` lines 90-128.
- `packages/adapter-prisma/src/review-batch-store.ts` `getAnnotationsForDispatch` select shape.

**Test scenarios:**
- Happy path (text_change) — create with `originalText` + `proposedText` persists both.
- Happy path (image_swap) — create with `assetMeta` JSON persists intact.
- Happy path (rectangle) — existing test still passes; `type` defaults to `"rectangle"` if omitted.
- Integration — `getAnnotationsForDispatch` returns the new fields for annotations of each type.

**Verification:**
- `bun run check` passes.
- All adapter-prisma tests pass.

- [ ] **Unit 5: Widget mode switcher — extend FAB radial menu and event bus for `edit-text` + `swap-image` modes**

**Goal:** Add two new radial items to the FAB, wire them to new event bus events, implement keyboard shortcuts `R` / `E` / `I`, and add a mode-dispatch concurrency guard so only one mode is active at a time.

**Requirements:** R3

**Dependencies:** None structural — can run in parallel with the adapter work.

**Files:**
- Modify: `packages/widget/src/events.ts` — add `"text-edit:start"`, `"text-edit:complete"`, `"image-swap:start"`, `"image-swap:complete"` event keys to `WidgetEvents`. The `"-complete"` events carry a typed payload similar to `AnnotationComplete`.
- Modify: `packages/widget/src/fab.ts` — add two `RadialItem` entries (`edit-text`, `swap-image`) with icons, route `handleItemClick` through the new events. Include a new icon export in `icons.ts` for the two items.
- Modify: `packages/widget/src/icons.ts` — add `ICON_EDIT_TEXT` (pencil) + `ICON_IMAGE_SWAP` (arrows-swap-over-image) SVG constants. Reuse Heroicons-style paths for consistency.
- Modify: `packages/widget/src/launcher.ts` — extend the `annotation:complete` concurrency guard to also guard `text-edit:complete` / `image-swap:complete`. Subscribe to all three.
- Modify: `packages/widget/src/i18n/en.json`, `packages/widget/src/i18n/fr.json` — new strings `"fab.editText"`, `"fab.swapImage"`, `"textEdit.ariaLabel"`, `"imageSwap.ariaLabel"`, errors, etc.
- Test: `packages/widget/__tests__/widget/fab.test.ts` (extend) — click edit-text item emits `"text-edit:start"`; click swap-image emits `"image-swap:start"`; keyboard shortcuts work.

**Approach:**
- The `submitting` guard in `launcher.ts` line 184 becomes a shared `activeMode` state that rejects new mode starts while one is active.
- Keyboard shortcuts registered on the shadow root (not window) so they don't hijack the host page's key handlers when the widget FAB is closed.
- Icons: 24×24 SVG strings inlined, same style as `ICON_CHAT` / `ICON_ANNOTATE`.

**Patterns to follow:**
- `packages/widget/src/fab.ts` lines 41-45 (items list) + lines 215-235 (handleItemClick).
- `packages/widget/src/icons.ts` existing SVG strings.
- `packages/widget/src/events.ts` existing event key definitions.

**Test scenarios:**
- Happy path — click "Edit text" radial item → `bus` receives `"text-edit:start"`; FAB closes.
- Happy path — click "Swap image" radial item → `bus` receives `"image-swap:start"`; FAB closes.
- Happy path — press `E` while FAB is open → same as clicking edit-text.
- Happy path — press `R` → `"annotation:start"` emitted.
- Edge case — press `E` while a rectangle annotation is in progress → ignored (mode guard).
- Edge case — Escape during any mode aborts and restores the shadow root's focus.
- Happy path — FR locale: radial labels render in French.

**Verification:**
- `bun run check` passes.
- Widget tests pass.

- [ ] **Unit 6: Text edit mode — overlay + hover outline + contenteditable**

**Goal:** Implement the `edit-text` mode: a transparent overlay that detects text elements on hover, shows a hover outline + pencil badge, and on click promotes the clicked host-page element to `contenteditable`. On blur/Enter, capture `{ originalText, proposedText, anchor }` and emit `"text-edit:complete"`.

**Requirements:** R4, R12

**Dependencies:** Unit 5 (mode switcher event).

**Files:**
- Create: `packages/widget/src/text-edit-mode.ts` — `TextEditMode` class analogous to `Annotator` but for text-node editing. Manages overlay lifecycle, hover detection, host-page element mutation, and submission.
- Create: `packages/widget/src/text-edit-popup.ts` — small popup (reuses `Popup` glass style) with an optional "Accompanying comment" field shown after blur. `Enter` without a comment submits immediately; `Esc` aborts.
- Modify: `packages/widget/src/launcher.ts` — instantiate `TextEditMode` alongside `Annotator`, subscribe it to `"text-edit:start"`, route `"text-edit:complete"` into the same `FeedbackPayload` builder used by rectangle.
- Modify: `packages/widget/src/annotator.ts` — (nothing changes; but the concurrency guard in launcher is shared).
- Test: `packages/widget/__tests__/widget/text-edit.test.ts` (new) — mode activation, hover detection, click promotes element to contenteditable, blur captures values, original element restored.

**Approach:**
- Hover detection: install a capturing-phase `mousemove` listener at `document` level; `document.elementFromPoint` to find the text-bearing element. Filter for elements whose `innerText.trim().length > 0` and that are NOT inside the widget's own host element (skip the FAB/panel/overlay).
- Hover outline: inline `style.outline` + `style.outlineOffset` on the hovered element; removed on mouseleave.
- Click-to-edit: `event.preventDefault()` + `event.stopPropagation()` to neutralize host-page click handlers, then set `element.contentEditable = "true"`, save the original `innerText`, apply dashed outline, focus, select-all.
- On blur: read `innerText` → compare against saved original. If unchanged, abort silently. If changed, open `text-edit-popup` for optional accompanying comment; on submit, build `AnnotationPayload` with `type: "text_change"`, `originalText: saved`, `proposedText: newValue`, `anchor: generateAnchor(element)`, then restore the host element (`contentEditable = "false"`, `innerText = savedOriginal`, remove outline).
- **Important:** after submission we revert the host DOM to its original state — the change is a _proposed_ change, not an applied one. The persistent badge (Unit 11) is overlayed on top of the element, not a text change.
- Escape anywhere cancels, reverting the host element to its pre-click state.

**Execution note:** Test-first for the pure functions (hover filter predicate, `AnnotationPayload` assembly). Manual browser QA + a Playwright scenario for the contenteditable round-trip.

**Patterns to follow:**
- `packages/widget/src/annotator.ts` overlay lifecycle (activate, deactivate, escape-cancels).
- `packages/widget/src/popup.ts` for the accompanying-comment popup.
- `packages/widget/src/dom/anchor.ts` for `generateAnchor()`.

**Test scenarios:**
- Happy path — hover over a `<p>` shows outline; mousing off removes it.
- Happy path — click `<h1>`, edit the text, press Enter → `"text-edit:complete"` emitted with `originalText` + `proposedText`.
- Happy path — click `<h1>`, edit, press Escape → no event emitted, host element restored.
- Edge case — click an element with text that's only whitespace → hover filter skips it.
- Edge case — click an element inside the widget's shadow host → no-op (self-exclude).
- Edge case — user types then un-types back to original → submit aborts silently.
- Edge case — host page has a click handler on the element that `preventDefault()`s on capture → mode still captures because we use capturing-phase listener at document level.
- Integration — the host page's `user-select: none` CSS rule does not prevent editing (the mode sets `userSelect: "text"`).
- Integration — copy/paste via Cmd+C / Cmd+V inside the editable region works normally (relies on standard browser behavior, asserted via Playwright).

**Verification:**
- `bun run check` passes.
- New test file passes; extended launcher integration tests pass.
- Manual QA in Chrome + Safari + Firefox on the demo site.

- [ ] **Unit 7: Image swap mode — overlay + swap panel (URL paste, file picker, alt text)**

**Goal:** Implement the `swap-image` mode: detect `<img>` / `<picture>` elements on hover, show a hover outline + swap icon badge, and on click open a swap panel with URL paste + drag-drop/file picker + alt-text field. The panel previews old → new thumbnail; submission calls `/api/v1/assets/mirror` (URL paste) or `/api/v1/assets/sign-upload` + direct PUT (file). Emits `"image-swap:complete"` with the resolved CCM-hosted URL + `assetMeta`.

**Requirements:** R5, R6, R11, R13

**Dependencies:** Unit 5 (mode switcher event); Unit 8 (mirror endpoint); Unit 9 (sign-upload endpoint).

**Files:**
- Create: `packages/widget/src/image-swap-mode.ts` — `ImageSwapMode` class: hover detection, click → swap panel, validation, submission.
- Create: `packages/widget/src/image-swap-panel.ts` — the swap panel component (glass style, mounts inside shadow DOM). Includes URL input, drag-drop surface, file `<input type="file">`, alt-text input, thumbnail preview container, submit/cancel buttons, and inline error area.
- Create: `packages/widget/src/image-validation.ts` — shared client-side validators: `validateFileBeforeUpload(file)` (size + MIME), `validateUrlBeforePaste(url)` (well-formed, not a data: URI), `readImageDimensions(fileOrUrl)` (returns `{ width, height }` via `new Image()` or `FileReader` + Image).
- Modify: `packages/widget/src/launcher.ts` — instantiate `ImageSwapMode`, pass through `config.endpoint` so the mode can call the asset endpoints.
- Modify: `packages/widget/src/api-client.ts` — add `mirrorAsset({ projectId, url })` and `signUpload({ projectId, filename, contentType, sizeBytes })` methods on `WidgetClient`; HTTP implementations added, `StoreClient` throws (not applicable in client-only mode).
- Modify: `packages/widget/src/i18n/en.json` + `fr.json` — new strings for swap panel copy and error messages.
- Test: `packages/widget/__tests__/widget/image-swap.test.ts` (new) — mode activation, hover detection, URL paste → mirror call, file select → sign-upload call, validation errors surface in the panel.
- Test: `packages/widget/__tests__/widget/image-validation.test.ts` (new) — pure-function validator tests for size / MIME / URL well-formedness.

**Approach:**
- Hover filter: `element.matches("img, picture, picture img, source")` OR `getComputedStyle(el).backgroundImage !== "none"`. For CSS-background hits, show the swap icon but record only that this is the anchor — the proposed swap still records an `originalAssetUrl` derived from the computed style (regex out the URL) and a mirrored `proposedAssetUrl`. Note the CSS-background constraint in Scope Boundaries.
- Swap panel mount: inside the shadow DOM (matches `Popup`), positioned center of viewport with a frosted backdrop.
- File validation order (client side, short-circuits): (1) check `file.size <= 10 * 1024 * 1024`, (2) check `file.type` is in `ALLOWED_IMAGE_MIMES`, (3) read dimensions via FileReader+Image. Surface errors in an inline `<div role="alert">` inside the panel.
- URL validation order: (1) `new URL(input)` succeeds, (2) protocol is `https:` (reject `http:` except on localhost), (3) not a `data:` URI.
- Thumbnail preview: render old `<img>` at 200×200 max, proposed either via the pasted URL (pre-mirror) or a local `URL.createObjectURL(file)`. After mirror/upload success, swap the preview src to the CCM-hosted URL.
- Submission contract: `ImageSwapMode` assembles an `AnnotationPayload` with `type: "image_swap"`, `anchor: generateAnchor(element)`, `originalAssetUrl: element.src` (for `<img>`) or extracted from `backgroundImage`, `proposedAssetUrl`, `proposedAssetSource`, `proposedAltText`, `assetMeta`. Emit `"image-swap:complete"`.
- Persistent "proposed swap" badge (Unit 11) is applied after submission.
- **Drag-drop** handlers: prevent default at the document level while panel is open so host-page drop handlers don't steal the file.

**Execution note:** Test-first for validators; MemoryStore + StoreClient cannot simulate HTTP mirror, so tests for the HTTP flow mock `fetch`.

**Patterns to follow:**
- `packages/widget/src/popup.ts` (glass panel, focus trap, escape-to-close).
- `packages/widget/src/dom/anchor.ts` (anchor generation).
- `packages/widget/src/api-client.ts` `sendFeedback` retry + timeout behavior (reuse for mirror + upload).

**Test scenarios:**
- Happy path (URL paste) — valid HTTPS image URL → `api-client.mirrorAsset` called → panel shows mirrored preview → submit emits event with CCM-hosted URL.
- Happy path (file upload) — valid JPEG 200 KB → `signUpload` returns signed URL → client PUTs file → submit emits event with CCM-hosted URL.
- Error path (file too big) — select 11 MB file → inline error "File exceeds 10 MB limit"; submit button disabled.
- Error path (wrong MIME) — select .tiff file → inline error "Format not supported (jpg, png, webp, avif, svg, gif)".
- Error path (malformed URL) — paste "not a url" → inline error "Invalid URL".
- Error path (mirror server error) — fetch rejects → inline error "Could not fetch image, try again" + allow retry.
- Error path (signed upload 403) — signed URL PUT returns 403 → inline error + retry path.
- Edge case — URL already on CCM origin → mirror endpoint returns unchanged; widget skips re-mirror.
- Edge case — reviewer adds alt text then clears it → submitted with empty `proposedAltText` (treated as optional).
- Edge case — drag-drop a non-image file → inline error, file rejected before upload.
- Happy path (CSS-background element) — swap icon shows; click opens panel; submission records background URL as `originalAssetUrl`; the host DOM is NOT modified (per scope).

**Verification:**
- `bun run check` passes.
- New test files pass.
- Existing widget + launcher tests pass.

- [ ] **Unit 8: `POST /api/v1/assets/mirror` — HEAD-validate + stream external URL into Supabase Storage**

**Goal:** Ship the server endpoint that takes `{ projectId, url }`, validates it's a CCM-owned project, HEADs the URL, rejects oversized / non-image / script-containing SVG sources, streams the body into `assets/<projectId>/<uuid>.<ext>`, and returns `{ proposedAssetUrl, assetMeta }`.

**Requirements:** R7, R14

**Dependencies:** Unit 3 (Zod schema for request body); project existence check via `ProjectStore`.

**Files:**
- Create: `packages/adapter-prisma/src/asset-mirror-handler.ts` — `createAssetMirrorHandler({ projectStore, storageClient, fetch? })` factory. Returns an async `(request) => Response` handler.
- Create: `packages/adapter-prisma/src/asset-mirror.ts` — pure helpers: `sniffImage(buffer)` (uses `image-size`), `isSafeSvg(svgText)`, `extensionForMime(mime)`. Kept separate so they can be tested in isolation.
- Modify: `packages/adapter-prisma/src/index.ts` — export the factory.
- Modify: `packages/adapter-prisma/package.json` — add `image-size` as a dep (peer-free, ~15 KB).
- Create: `apps/demo/src/app/api/v1/assets/mirror/route.ts` — Next.js route wrapper that resolves `projectStore` + `createSupabaseAdminClient` and calls the factory.
- Create: `apps/demo/src/lib/storage.ts` — small helper `getStorageClient()` that returns a typed `SupabaseClient["storage"]["from"]("assets")` handle, consolidating the bucket name.
- Test: `packages/adapter-prisma/__tests__/asset-mirror.test.ts` (new) — handler unit tests with mocked `projectStore`, `fetch`, and `storageClient`.
- Test: `apps/demo/src/app/api/v1/assets/__tests__/mirror.test.ts` (new) — integration through the route wrapper.

**Approach:**
- Endpoint accepts `POST` with `application/json` body. 400 on bad JSON / bad shape.
- Project existence check: `projectStore.getProject(projectId)` → 404 if null.
- `fetch(url, { method: "HEAD" })` with 5 s timeout → inspect `Content-Type` (must start with `image/`) + `Content-Length` (reject > 10 MB). 400 on either.
- Same-origin short-circuit: if `url.origin === CCM_STORAGE_ORIGIN`, return `{ proposedAssetUrl: url, assetMeta: <head-derived> }` immediately.
- Full fetch: `fetch(url).body` → read as `ArrayBuffer` (for `image-size` + Storage upload, one-shot buffering is acceptable at 10 MB cap). Re-check size after full read (some servers return wrong `Content-Length`).
- SVG special case: decode buffer as UTF-8 text, scan for `<script` (case-insensitive) or `\bon\w+\s*=`. Reject 400 on match.
- `image-size` sniff → `{ width, height, type }`. Reject 400 on unreadable.
- Upload: `storageClient.from("assets").upload("<projectId>/<uuid>.<ext>", buffer, { contentType: mime, upsert: false })`. 500 on storage error (surface `storageError.message` in response body for admin visibility, omit in prod).
- Response: `{ proposedAssetUrl: <storage public URL>, assetMeta: { width, height, sizeBytes, mime } }`. 200.

**Execution note:** Test-first for `sniffImage`, `isSafeSvg`, `extensionForMime`. Handler test first with mocked fetch + storage; then wire the Next route.

**Patterns to follow:**
- `packages/adapter-prisma/src/review-handler.ts` factory pattern + Zod validate + `Response.json` style.
- `apps/demo/src/app/api/v1/reviews/route.ts` route wrapper shape.

**Test scenarios:**
- Happy path — valid public JPEG URL → HEAD ok → GET ok → uploaded → 200 with `proposedAssetUrl` on the `assets/<project>/` path.
- Happy path — URL already on CCM origin → 200 with the input URL unchanged, no upload.
- Error path — unknown `projectId` → 404.
- Error path — malformed body → 400 with Zod errors.
- Error path — HEAD returns `Content-Type: text/html` → 400.
- Error path — HEAD returns `Content-Length: 12000000` → 400.
- Error path — GET body exceeds 10 MB despite HEAD → 400 (defense in depth).
- Error path — SVG source containing `<script>` → 400 "unsafe svg".
- Error path — SVG with `onerror=` → 400.
- Error path — Storage upload fails (503) → 502 bad gateway.
- Error path — fetch times out → 504.
- Integration — end-to-end via the Next route with a mocked Storage layer writes to the correct path.

**Verification:**
- `bun run check` passes.
- New tests pass.
- `bun run lint` passes.

- [ ] **Unit 9: `POST /api/v1/assets/sign-upload` — generate signed upload URL for direct client upload**

**Goal:** Ship the server endpoint that takes `{ projectId, filename, contentType, sizeBytes }`, validates the project exists and the declared size/MIME are in-bounds, and returns a Supabase Storage signed upload URL for `assets/<projectId>/<uuid>.<ext>`. The widget PUTs the file directly, bypassing the Netlify 6 MB function body cap.

**Requirements:** R8, R14

**Dependencies:** Unit 3 (Zod schema for request body).

**Files:**
- Create: `packages/adapter-prisma/src/asset-sign-upload-handler.ts` — `createAssetSignUploadHandler({ projectStore, storageClient })` factory.
- Modify: `packages/adapter-prisma/src/index.ts` — export the factory.
- Create: `apps/demo/src/app/api/v1/assets/sign-upload/route.ts` — Next.js route wrapper.
- Test: `packages/adapter-prisma/__tests__/asset-sign-upload.test.ts` (new) — handler unit tests with mocked Storage.
- Test: `apps/demo/src/app/api/v1/assets/__tests__/sign-upload.test.ts` (new) — integration through the route.

**Approach:**
- Accept `POST` with `{ projectId, filename, contentType, sizeBytes }`.
- Validate via `signUploadRequestSchema`: `contentType` ∈ `ALLOWED_IMAGE_MIMES`, `sizeBytes` ≤ 10 MB, `filename` non-empty + sanitized (no path separators).
- Project existence check (same as Unit 8).
- Generate `<uuid>.<ext>` where `<ext>` is derived from `contentType` (shared `extensionForMime()` helper).
- Call `storageClient.from("assets").createSignedUploadUrl("<projectId>/<uuid>.<ext>")` → returns `{ signedUrl, token, path }`.
- Response: `{ signedUrl, path, proposedAssetUrl: <public-url-of-path>, expiresInSeconds: 120 }`. 200.
- The widget will PUT the file body to `signedUrl` (via plain `fetch`, `Content-Type: <contentType>`). Supabase enforces that the PUT body matches the declared path.

**Execution note:** Test-first for shape + error paths.

**Patterns to follow:**
- `packages/adapter-prisma/src/review-handler.ts` factory pattern.
- Unit 8 handler structure.

**Test scenarios:**
- Happy path — valid JPEG request returns `signedUrl` + `path` + `proposedAssetUrl`.
- Error path — `sizeBytes = 11_000_000` → 400.
- Error path — `contentType = "image/tiff"` → 400.
- Error path — unknown project → 404.
- Error path — `filename = "../../../etc/passwd"` → 400 (path-traversal reject).
- Error path — Storage SDK error → 502.
- Edge case — `filename` is used only to derive an extension fallback; it is NOT included verbatim in the storage path (UUID-based path is the single source).

**Verification:**
- `bun run check` passes.
- New tests pass.

- [ ] **Unit 10: Widget `/api/feedback` flow — include `type` + type-specific fields in `FeedbackPayload`**

**Goal:** Wire the two new modes (Unit 6, Unit 7) into the existing `FeedbackPayload` builder so annotations of all three types round-trip through the unchanged `POST /api/feedback` route. Update the `message` fallback (`"[text edit]"` / `"[image swap]"` when the comment is empty).

**Requirements:** R9

**Dependencies:** Unit 2 (types widened), Unit 3 (validation accepts new shapes), Unit 4 (store persists), Unit 6 + Unit 7 (modes emit events).

**Files:**
- Modify: `packages/widget/src/launcher.ts` — extend the `annotation:complete` + `text-edit:complete` + `image-swap:complete` handlers to share a single `buildFeedbackPayload(data)` function that branches on `data.type` and assembles the appropriate `AnnotationPayload`. Apply the `message` fallback.
- Modify: `packages/adapter-localstorage` / `packages/adapter-memory` — widen their `createFeedback` implementations to persist the new fields (no-op for fields they don't understand, but no error).
- Test: `packages/widget/__tests__/widget/launcher-integration.test.ts` (extend) — text edit completion posts a `FeedbackPayload` with `type: "text_change"` + `proposedText`; image swap completion posts a payload with `type: "image_swap"` + full asset fields.
- Test: `packages/adapter-memory/__tests__/memory-store.test.ts` (extend) — round-trip for new types.
- Test: `packages/adapter-localstorage/__tests__/localstorage-store.test.ts` (extend) — round-trip for new types.

**Approach:**
- The `submitting` concurrency guard in `launcher.ts` becomes a shared state across all three mode completion events.
- Fallback message: `message = input.message?.trim() || (type === "text_change" ? "[text edit]" : type === "image_swap" ? "[image swap]" : "[annotation]")`.
- `AnnotationPayload` assembly is type-discriminated — `type: "rectangle"` only carries anchor+rect+scroll+viewport+dpr; `type: "text_change"` adds `originalText`+`proposedText`; `type: "image_swap"` adds all 5 asset fields.

**Execution note:** Test-first; extend the existing launcher integration tests to cover the three new paths.

**Patterns to follow:**
- `packages/widget/src/launcher.ts` existing `annotation:complete` handler (lines 185-243).

**Test scenarios:**
- Happy path (rectangle) — existing flow still produces the existing payload shape (regression gate).
- Happy path (text_change) — completion event produces a `FeedbackPayload` with `type: "text_change"` and both text fields set.
- Happy path (image_swap) — completion event produces a `FeedbackPayload` with `type: "image_swap"` and all asset fields set.
- Edge case — empty accompanying comment triggers the type-specific fallback message.
- Integration — memory adapter persists all three types through a full round-trip.
- Integration — localStorage adapter persists all three types and survives JSON serialization + restore.

**Verification:**
- `bun run check` + all package tests pass.
- `bun run test:run` at repo root passes.

- [ ] **Unit 11: Panel detail — diff view for text_change, thumbnail preview for image_swap + persistent on-page badges**

**Goal:** Update `panel-detail.ts` to render a diff view for `text_change` annotations (using the `diff` package) and a side-by-side old/new thumbnail preview for `image_swap` (with alt text rendered below). Extend `markers.ts` so each annotation type gets a distinctive on-page badge that persists until the status moves off `submitted`.

**Requirements:** R11, R13

**Dependencies:** Unit 4 (store reads the new fields); Unit 10 (widget receives the new fields from the server in `AnnotationResponse`).

**Files:**
- Modify: `packages/widget/src/panel-detail.ts` — branch on `annotation.type`. For `text_change`, render a word-diff view using `diff.diffWords(originalText, proposedText)`. For `image_swap`, render two thumbnails side-by-side + alt text paragraph.
- Modify: `packages/widget/package.json` — add `diff` as a dep (~20 KB). Confirm it ships without pulling `diff-match-patch`.
- Modify: `packages/widget/src/markers.ts` — add per-type badge rendering. Rectangle keeps its existing marker dot. Text_change gets an orange pencil dot at the top-right of the anchored element's bounding box. Image_swap gets a swap-icon overlay on the top-right of the image. All badges route through the existing `badge` style primitives.
- Modify: `packages/widget/src/i18n/en.json` + `fr.json` — new strings for panel detail section headers ("Before / After", "New image", "Alt text", etc.).
- Test: `packages/widget/__tests__/widget/panel-detail.test.ts` (new or extend) — text_change renders `<ins>` + `<del>`-style diff elements; image_swap renders two `<img>` thumbnails + alt text.
- Test: `packages/widget/__tests__/widget/markers.test.ts` (extend) — all three badge variants render at the expected positions.

**Approach:**
- Diff rendering: `diffWords(originalText, proposedText)` returns `{ value, added, removed }[]`. Render as `<span>` with colours: added → green/underline, removed → red/strikethrough, unchanged → default. Pure DOM construction, no innerHTML (avoids host-CSS / XSS concerns).
- Thumbnail preview: two `<img>` side by side at `max-height: 200px; object-fit: contain;`; captions "Original" / "Proposed" + alt text shown as a paragraph below "Proposed".
- Badge positions: use the `xPct` / `yPct` / `wPct` / `hPct` anchor-relative offsets already on each annotation row — same math as the rectangle marker.
- Badge persistence: `MarkerManager.render()` already iterates the feedback list on load; extend it to pick the right badge style per `annotation.type` and render only when `status === "submitted"`.

**Execution note:** Test-first for the diff helper output shape and the marker branching.

**Patterns to follow:**
- `packages/widget/src/panel-detail.ts` existing section-rendering patterns.
- `packages/widget/src/markers.ts` existing `addFeedback` / render-on-load path.

**Test scenarios:**
- Happy path (text_change) — detail view renders a diff: common prefix, one removed span, one added span.
- Happy path (image_swap) — detail view renders two thumbnails and the alt text underneath.
- Happy path (rectangle) — existing detail shape unchanged (regression gate).
- Edge case (text_change) — identical `originalText === proposedText` → diff shows all-unchanged (shouldn't happen in practice but graceful).
- Edge case (image_swap with empty alt) — alt-text paragraph is omitted.
- Edge case — image `src` fails to load (broken mirror URL) → `onerror` swaps in a placeholder.
- Integration — rendering a list of 20 mixed-type annotations shows the right badge for each.

**Verification:**
- `bun run check` passes.
- All widget tests pass.
- Manual QA in the demo app confirms the visual shape.

- [ ] **Unit 12: Webhook payload builder — emit type-specific fields at annotation top level**

**Goal:** Widen `buildWebhookPayload()` to emit `original_text` + `proposed_text` for `text_change` annotations and `original_asset_url` / `proposed_asset_url` / `proposed_asset_source` / `proposed_alt_text` / `asset_meta` for `image_swap` annotations — all at the annotation top level alongside the existing `anchor` / `rect` / `message` fields per spec §6.1.

**Requirements:** R10, R14

**Dependencies:** Unit 4 (`getAnnotationsForDispatch` returns the new fields); Unit 2 (types widened).

**Files:**
- Modify: `packages/core/src/webhook/payload.ts` — extend `WebhookAnnotationPayload` with optional `original_text`, `proposed_text`, `original_asset_url`, `proposed_asset_url`, `proposed_asset_source`, `proposed_alt_text`, `asset_meta`. Extend `WebhookPayloadBuilderInput['annotations'][number]` with the same fields. Extend `buildWebhookPayload()` to map them (only emit when the corresponding input field is present and truthy).
- Modify: `packages/adapter-prisma/src/review-dispatch.ts` — pass the new fields from `getAnnotationsForDispatch` into the builder input.
- Test: `packages/core/__tests__/webhook-payload.test.ts` (extend) — add cases asserting:
  - `rectangle` annotations emit the existing shape unchanged (regression).
  - `text_change` annotations emit `original_text` + `proposed_text` at annotation top level, NOT nested under `target`.
  - `image_swap` annotations emit all 5 asset fields + `asset_meta` as a flat snake_case object with `width / height / size_bytes / mime`.
  - Canonicalized JSON output differs only in the expected fields and the sorted-keys invariant holds.
- Test: `packages/adapter-prisma/__tests__/review-dispatch.test.ts` (extend) — end-to-end canonical body for a mixed-type batch matches the expected shape.

**Execution note:** Test-first. This is the contract surface the implementation agent consumes — snapshot-style assertions on the exact emitted payload are appropriate here.

**Patterns to follow:**
- `packages/core/src/webhook/payload.ts` existing `buildWebhookPayload()` mapping.
- `packages/core/__tests__/webhook-payload.test.ts` existing test structure.

**Test scenarios:**
- Happy path — mixed-type batch (1 rectangle + 1 text_change + 1 image_swap) emits 3 annotation objects with the right fields.
- Happy path — canonicalize → identical bytes across two invocations (sorted keys invariant).
- Edge case — `text_change` with empty `original_text` (shouldn't happen but defensive) emits the empty string, not `null`.
- Edge case — `image_swap` with `proposed_alt_text: null` omits the field entirely (consistent with existing optional-field treatment).
- Integration — verifier script (from CCM-279) reconstructs and verifies the signature over the new payload shape without modification.

**Verification:**
- `bun run check` passes.
- Extended tests pass.
- The CCM-279 `scripts/verify-webhook-signature.mjs` script runs unchanged against a newly-dispatched mixed-type batch and verifies the signature.

- [ ] **Unit 13: Demo acceptance + E2E — three scenarios + oversized-file UI error**

**Goal:** Demonstrate the end-to-end flow on the demo app: edit a heading, swap an image via URL paste, swap an image via local file upload. Verify oversized / wrong-MIME uploads are rejected before upload starts with a clear UI error. Verify the webhook payload matches spec §6.1.

**Requirements:** Ticket acceptance criteria (end-to-end)

**Dependencies:** All prior units.

**Files:**
- Modify: `e2e/widget.spec.ts` — add three new Playwright scenarios:
  1. Edit a heading: activate edit-text mode, click a heading, change text, press Enter, submit — assert the panel shows the diff view.
  2. Swap image via URL paste: activate image-swap mode, click an `<img>`, paste a Picsum URL, submit — assert the panel shows two thumbnails AND a `POST /api/v1/assets/mirror` request was made.
  3. Swap image via file picker: activate image-swap mode, click an `<img>`, `setInputFiles(path/to/fixture.jpg)`, submit — assert two thumbnails AND a `POST /api/v1/assets/sign-upload` + Storage PUT were made.
- Add: `e2e/fixtures/swap-image.jpg` (small valid JPEG), `e2e/fixtures/too-big.jpg` (>10 MB, git-ignored + generated on-demand in CI setup).
- Add: `e2e/widget.spec.ts` — a fourth scenario for oversized upload: attempt to select `too-big.jpg`, assert the panel shows "File exceeds 10 MB limit" inline and no network request is made.
- Add: `e2e/widget.spec.ts` — a fifth scenario for the webhook shape: after a mixed-type batch is submitted, hit the mock webhook endpoint and assert the emitted JSON body matches a JSON snapshot (asserting new field names and top-level placement).
- Modify: `apps/demo/src/app/api/mock-webhook/[project]/route.ts` — log the received body in a structured way that E2E can assert against (currently logs to console).
- Update: `docs/migrations/CCM-282-annotation-intents.md` (from Unit 1) — add a "Verification checklist" section listing the three acceptance scenarios.

**Execution note:** Manual QA in Chrome, Firefox, Safari on the demo site before the final commit. Focus: contenteditable selection, file picker UX, drag-drop, alt-text persistence across submit.

**Patterns to follow:**
- `e2e/widget.spec.ts` existing scenarios + `e2e/server.mjs` fixtures.
- `apps/demo/src/app/api/mock-webhook/[project]/route.ts` pattern for retained-body observation.

**Test scenarios:**
- E2E scenario 1 (text edit) — happy path passes end-to-end; panel diff renders.
- E2E scenario 2 (URL swap) — happy path; network log confirms mirror call; panel thumbnails render.
- E2E scenario 3 (file swap) — happy path; network log confirms sign-upload + Storage PUT; panel thumbnails render.
- E2E scenario 4 (oversized file) — panel shows inline error; no network request made.
- E2E scenario 5 (webhook shape) — mock webhook receives a body matching the expected §6.1 structure with new fields at annotation top level.

**Verification:**
- `bun run test:e2e` passes locally.
- Manual QA in 3 browsers confirms visual + interaction quality.
- The mock webhook log shows a body that the existing CCM-279 verifier script can sign-verify without changes.

## System-Wide Impact

- **Interaction graph:**
  - FAB radial menu gains 2 items → no impact on existing FAB badge / chat mode / toggle-annotations.
  - Event bus gains 4 events → no impact on existing `annotation:*` pipeline; the concurrency guard in `launcher.ts` widens from 1 mode to 3.
  - `POST /api/feedback` body schema widens (additive optional fields) → no impact on existing rectangle payloads (backward compatible).
  - Two new `/api/v1/assets/*` endpoints → no impact on existing endpoints; share `projectStore` only.
  - Webhook payload shape widens (additive) → no impact on existing rectangle payload consumers; new fields are ignored by consumers that don't look for them.
- **Error propagation:**
  - Asset mirror failures (`400` / `502` / `504`) surface in the widget swap panel as inline error text; the reviewer retries. Submission is not made until mirror succeeds.
  - Signed upload PUT failures surface the same way.
  - Storage-layer errors in the handler propagate as `502 Bad Gateway` with a sanitized message body.
  - Widget `contenteditable` errors (e.g. host-page JS throws on blur) are caught in a try/finally that ALWAYS restores the element's original state.
- **State lifecycle risks:**
  - Partial writes: if the client-side file upload succeeds but the subsequent `sendFeedback` call fails, the uploaded asset is orphaned in Storage. Acceptance risk — flagged for a follow-up janitor script that sweeps assets with no referencing annotation row older than 24 hours.
  - Orphan mirror: same risk applies to URL-mirrored assets. Same janitor applies.
  - Shadow DOM contenteditable cleanup: aggressive restoration in a `try/finally` prevents the host page being left in a permanently-editable state. Escape always cancels and restores.
- **API surface parity:**
  - Abstract `CcmFeedbackStore` interface stays unchanged — `createFeedback` already accepts an `AnnotationCreateInput[]`; widening the interior of that type is safe.
  - Memory + localStorage adapters gain pass-through support for new fields; if a downstream (non-demo) adapter doesn't, annotations of the new types will lose fields — acceptance is that rectangle-only adapters continue to work for rectangle-only widgets.
  - Widget `WidgetClient` interface gains two new methods (`mirrorAsset`, `signUpload`); `StoreClient` throws "not supported in client-only mode" consistent with how `submitReview` is handled today.
- **Integration coverage:**
  - Shadow DOM + contenteditable is tested in Playwright (Unit 13) because `jsdom` can't simulate real selection / blur / focus semantics.
  - Supabase Storage round-trip is integration-tested via a stub Storage client that captures `.upload()` args; a real-Supabase smoke test belongs in the acceptance checklist (Unit 13) not automated CI.
  - HMAC signature round-trip for the new payload shape is tested in Unit 12.
- **Unchanged invariants:**
  - Rectangle annotation payload shape (`message`, `anchor`, `rect`, `scroll_*`, `viewport_*`, `device_pixel_ratio`) is byte-identical to the CCM-279 shape.
  - `POST /api/feedback` success / duplicate / validation error semantics unchanged.
  - `POST /api/v1/reviews` and `POST /api/v1/annotations/:id/status` unchanged.
  - HMAC canonicalization + signing unchanged; verifier scripts keep working.
  - Admin UI surface unchanged.
  - `spec §6.1` drift note: the current implementation uses `anchor` + `rect` at the annotation top level where spec §6.1 literally writes `target: { selector, xpath, rect, viewport }`. CCM-279 merged with this drift. This PR preserves the drift to maintain CCM-279 consumer compatibility. A follow-up ticket can align if needed — the stated ticket constraint "NOT nested under `target`" for new text/image fields is explicitly honored.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| **SVG upload XSS via bypass of regex scan** (embedded `<script>` via entity encoding, `<foreignObject>`, `data:` URIs in `<use>`) | Coarse `<script>` / `on*=` regex rejects the most common vectors. Mark SVG uploads as "low-trust" in the follow-up hardening ticket and swap in a real DOMPurify pass server-side. Ensure the `assets` bucket does not serve SVGs with `Content-Disposition: inline` when requested by a non-admin origin — deferred. |
| **Contenteditable edge cases in Safari / Firefox** (selection reset on focus loss, composed events, IME input) | Playwright cross-browser E2E in Unit 13 covers the three scenarios in all three browsers. Escape-cancels + try/finally restore is the last-ditch mitigation. |
| **Orphaned uploaded assets** when `sendFeedback` fails after upload succeeds | Follow-up janitor script sweeps Storage objects lacking a referencing annotation row older than 24 h. Flagged in System-Wide Impact. |
| **Netlify cold-start latency on `/api/v1/assets/mirror`** — streaming a 10 MB image through a fresh function runtime can exceed the 10 s default timeout | Use `export const maxDuration = 30` in the route wrapper (Next.js 15 supports per-route max duration). Confirm on Netlify Functions for Next.js plugin. If unavailable, document the hard timeout and fail gracefully. |
| **`image-size` missing exotic headers** (AVIF variants, animated WebP edge cases) | Acceptance is coarse dimension detection; if sniffing fails, 400 with "unreadable image" and the reviewer re-tries with a different source. Follow-up: switch to `file-type` npm package or `sharp` (native) if accuracy matters more. |
| **Bundle size regression** from `diff` + new widget code paths | Bundle-size snapshot in CI (follow-up if not present today). This PR logs the pre/post `packages/widget/dist` sizes in the PR description. |
| **Prisma migration drift** between `schema.ts` and `schema.prisma` | Continuation of the existing risk from CCM-279. Hand-sync in Unit 1; the drift-guard script is still a deferred follow-up. A test in Unit 1 that diffs the two representations catches obvious divergence. |
| **Shadow DOM open-mode leak during tests** | `launcher.ts` already switches to `open` mode when `NODE_ENV === "test"`. Make the new modes work in both modes; widget unit tests assert both. |
| **Content-Type spoofing** (a server returns `image/jpeg` but body is actually an executable) | `image-size` sniffs magic bytes — this is the defense. If sniffing fails the upload is rejected. |
| **Large number of image paste URLs overrunning Storage quota** | Project-level rate limit deferred; for this PR we rely on the 10 MB cap + the small reviewer population. Follow-up: per-project quota + a rate limiter. |
| **Missing `image-size` package in CI caches** | Standard `bun install` in CI picks it up; no extra wiring. |

## Documentation / Operational Notes

- **New env vars**: `CCM_STORAGE_ORIGIN` (optional; defaults to `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/`). Document in `apps/demo/.env.example`.
- **Storage bucket**: the `assets` bucket (provisioned in CCM-277) must remain public-read for reviewer-facing previews. Service-role client writes. Document the bucket policy in `docs/migrations/CCM-282-annotation-intents.md`.
- **Netlify function timeout**: update `netlify.toml` if needed to set `max_duration = 30` for the mirror endpoint. Verify this is wired correctly per the Netlify Next.js plugin.
- **Rollout**: the migration is additive — deploy to dev first, verify the three acceptance scenarios, then deploy to prod. No schema down-migration needed (type-specific columns stay null on rollback).
- **Monitoring**: extend the mock webhook log line to include `annotation.type` counts per batch so the admin page can surface how many of each type are dispatched.

## Sources & References

- **Linear ticket:** CCM-282 (worktree branch `feature/CCM-282-annotation-intents`).
- **Spec:** `docs/spec.md` §4.2 (text edits), §4.3 (image swaps), §6.1 (webhook payload).
- **Prior plans:** `docs/plans/2026-04-20-002-feat-ccm-279-contract-layer-webhook-plan.md` (style + patterns), `docs/plans/2026-04-20-001-refactor-ccm-277-baseline-rebrand-plan.md` (Supabase provisioning handoff).
- **Related code:** `packages/core/src/schema.ts`, `packages/core/src/types.ts`, `packages/core/src/webhook/payload.ts`, `packages/adapter-prisma/src/index.ts`, `packages/adapter-prisma/src/validation.ts`, `packages/widget/src/annotator.ts`, `packages/widget/src/fab.ts`, `packages/widget/src/launcher.ts`, `packages/widget/src/panel-detail.ts`, `packages/widget/src/dom/anchor.ts`, `apps/demo/src/lib/supabase/admin.ts`, `apps/demo/src/app/api/v1/reviews/route.ts`.
- **Migration reference:** `prisma/migrations/ccm-279-projects-and-annotations/migration.sql`.
- **Residual work from CCM-277:** `todos/CCM-277-residuals.md` (confirms the `assets` bucket was provisioned but not wired).
- **External docs:**
  - Supabase Storage `createSignedUploadUrl`: https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
  - Supabase Storage `upload`: https://supabase.com/docs/reference/javascript/storage-from-upload
  - Netlify function payload size: https://docs.netlify.com/functions/overview/#synchronous-function-request-payload-size
  - `diff` npm: https://www.npmjs.com/package/diff
  - `image-size` npm: https://www.npmjs.com/package/image-size
  - Shadow DOM + contenteditable: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable (no shadow-specific caveats beyond what is captured in Unit 7).
