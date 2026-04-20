---
priority: p2
status: resolved
origin: ce-code-review autofix (CCM-279)
run_id: 20260420-150800-d7209778
resolution: Dispatcher now classifies 4xx (except 408/429) as non-retryable → marked `failed` with no backoff; 5xx/408/429/network errors remain retryable. Added 3 tests (400 → failed, 429 → retrying, 408 → retrying) and updated docs/webhook-contract.md §"Retry semantics".
---

# CCM-279 — dispatcher should not retry 4xx responses

## Severity: P2 (reliability / ops hygiene)

## File

- `packages/adapter-prisma/src/review-dispatch.ts`

## Problem

`dispatchReviewBatch` treats every non-2xx response as retryable:

```ts
if (res.ok) { ... delivered ... }
// Non-2xx response
const errorText = `http-${res.status}`;
return await handleFailure(ctx, batchId, ..., errorText, canonicalBody);
```

A permanent 4xx (404 "URL not found", 401 "bad signature — wrong secret on
the consumer side", 410 "gone", 422 "schema mismatch") will be retried up
to 10 times across a 24h window. Every retry wakes up the Netlify
scheduled function, re-signs, re-POSTs, and writes a new row update. This
wastes budget and pollutes `ReviewBatch.dispatchLastError` logs.

The task brief for this review explicitly called for "5xx retryable, 4xx
not retryable" verification, and the widget's own `resilientFetch` already
follows that rule:

```ts
// packages/widget/src/api-client.ts
// Don't retry client errors (4xx) — only server errors (5xx)
```

The server-side dispatcher should match.

## Fix

Classify the HTTP status in `dispatchReviewBatch` before handing to
`handleFailure`. Treat `408 Request Timeout` and `429 Too Many Requests`
as retryable (they are transient despite being 4xx), everything else in
the 4xx range as `failed` with no retry:

```ts
if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
  await ctx.reviewBatchStore.updateReviewBatchDispatch(batchId, {
    dispatchStatus: "failed",
    dispatchAttempts: attempts,
    dispatchLastError: `http-${res.status}`,
    canonicalBody,
  });
  return { batchId, dispatchStatus: "failed", dispatchAttempts: attempts, error: `http-${res.status}` };
}
```

Keep the existing `handleFailure` path for 5xx, 408, 429, timeouts, and
network errors.

## Documentation

Update `docs/webhook-contract.md` §"Retry semantics" to describe the
4xx/5xx classifier (currently says "non-2xx / timeout / network error").

## Acceptance

- Add a unit test that returns `Response(400)` from the mocked fetch and
  asserts `dispatchStatus === "failed"` and `dispatchAttempts === 1` with
  no `nextAttemptAt` scheduled.
- Keep existing `500` → retrying test green.
- Add a unit test that 429 still retries.
