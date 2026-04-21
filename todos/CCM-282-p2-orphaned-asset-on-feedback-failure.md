---
priority: p2
status: ready
origin: ce-code-review autofix (CCM-282)
run_id: 20260420-204032-85e065a3
---

# CCM-282 — Orphaned Storage assets when `sendFeedback` fails after upload

## Severity: P2 (resource leak / storage cost)

## Files

- `packages/widget/src/image-swap-mode.ts` (`handleSubmit`, lines 260-403)
- `packages/widget/src/launcher.ts` (feedback post-submit flow)

## Problem

The `image_swap` submission flow does:

1. Widget calls `signUpload` → server returns signed URL + `proposedAssetUrl`.
2. Widget PUTs file body to `signedUrl` → Supabase accepts bytes → asset is
   live at `proposedAssetUrl`.
3. Widget assembles `AnnotationPayload`, emits `image-swap:complete` → panel
   listener builds the `FeedbackPayload`, calls `sendFeedback`.
4. If step 3's `sendFeedback` fails (network error, 5xx, user closes tab),
   the asset at `proposedAssetUrl` is live in Storage with no referencing
   annotation row.

Same failure mode on the mirror path: server successfully uploads the
external URL into Storage, returns `proposedAssetUrl`, widget crashes /
user navigates away before `sendFeedback` fires.

Plan's "System-Wide Impact" section acknowledges this and defers the
cleanup to a follow-up janitor:

> Partial writes: if the client-side file upload succeeds but the subsequent
> `sendFeedback` call fails, the uploaded asset is orphaned in Storage.
> Acceptance risk — flagged for a follow-up janitor script that sweeps assets
> with no referencing annotation row older than 24 hours.

This todo tracks that commitment so it doesn't fall off the backlog.

## Recommended fix (follow-up ticket)

Two approaches — recommend shipping both:

### A. Client-side: retry `sendFeedback` + store `pendingAssetPath` locally

- On `signUpload` / `mirrorAsset` success, persist `{ path, createdAt }` to
  `localStorage` under key `ccm_pending_assets`.
- On `sendFeedback` success, remove the entry.
- On widget boot, sweep `ccm_pending_assets` entries older than 10 min and
  best-effort `DELETE` them via a new `/api/v1/assets/cleanup` endpoint (or
  just leave the cleanup to the server-side janitor).
- Covers the "user closed tab" case well; user opens the widget again and
  the client completes the cleanup.

### B. Server-side: periodic janitor Edge Function

- New Supabase Edge Function or Netlify scheduled function runs every hour:
  `SELECT path FROM FeedbackAnnotation WHERE proposedAssetUrl = <candidate>`.
- Any Storage object in `assets/<projectId>/` whose path has no matching
  `proposedAssetUrl` row AND whose `created_at` is older than 24 h gets
  deleted.
- Cheap to run; strongly-consistent with the DB truth.
- Same janitor can enforce a per-project storage quota as a follow-up to the
  rate-limiting commitment in the plan.

### Acceptance

- Unit test: `handleSubmit` registers the `proposedAssetUrl` in
  `localStorage` before calling `sendFeedback` and removes it on success.
- Integration: a simulated `sendFeedback` failure leaves the path in
  `localStorage`; next widget boot cleans it up.
- Ops: the janitor has a dry-run mode + a "max N deletions per run" safety
  valve so a bug can't cascade into mass deletion.

## Not fixed in autofix because

Requires new endpoint + new scheduled function + infrastructure decisions
(Edge Function vs. Netlify scheduled, retention window, cleanup strategy
for partial failures mid-delete). Pure ticket material.
