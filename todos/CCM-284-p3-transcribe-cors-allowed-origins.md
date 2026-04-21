---
priority: p3
status: resolved
origin: ce-code-review autofix (CCM-284)
resolution:
  commit: 40ab86fd62ffac4e8355387639902b88b9a89200
  note: |
    Added CCM_FEEDBACK_ALLOWED_ORIGINS env (comma-separated) and
    threaded it into createTranscribeHandler for both POST and OPTIONS
    in apps/demo/src/app/api/v1/transcribe/route.ts. Documented the
    var in apps/demo/.env.example. Scope limited to the CCM-284 route
    per the todo's own "this is not a CCM-284 regression" note;
    /api/feedback and /api/v1/reviews remain CCM-279 territory and
    were not touched.
---

# CCM-284 — `/api/v1/transcribe` route never configures `allowedOrigins`

## Severity: P3 (cross-origin production hardening, consistent with pre-existing /api/feedback gap)

## Files

- `apps/demo/src/app/api/v1/transcribe/route.ts`
- `packages/adapter-prisma/src/transcribe-handler.ts` (supports the option; the route just doesn't pass it)

## Problem

`createTranscribeHandler` accepts an optional `allowedOrigins` array and
reflects the request's Origin header when it matches. The demo route
never passes the option, so CORS headers are silently omitted on both
preflight and POST responses. The same gap exists for
`apps/demo/src/app/api/feedback/route.ts` and
`apps/demo/src/app/api/v1/reviews/route.ts`, so this is not a CCM-284
regression — the pattern was inherited from CCM-279. It should still be
fixed before the widget is embedded on a third-party origin.

Plan §Institutional Learnings explicitly notes:

> "CCM-279 established the OPTIONS/POST CORS pattern for widget-facing
> routes. The transcribe route is widget-facing, so it needs the same
> allowedOrigins treatment when `apiKey` is set."

## Proposed fix

- Read allowed origins from a single env var (reuse whatever CCM-279
  settled on — check `apps/demo/src/app/api/feedback/route.ts` and
  follow that pattern so all widget-facing routes share one source of
  truth).
- Pass `allowedOrigins` into `createTranscribeHandler`, `createReviewsHandler`,
  and `createCcmFeedbackHandler` from the route wrappers.
- Same-origin dev stays unaffected (no Origin header, no CORS headers
  needed).

## Acceptance

- A browser request to `/api/v1/transcribe` from `https://allowed.example`
  receives `Access-Control-Allow-Origin: https://allowed.example`.
- A browser request from `https://evil.example` receives no CORS headers
  and the browser blocks the fetch.
- Existing unit tests for `createTranscribeHandler` OPTIONS reflection
  still pass — they already cover both the allowed and disallowed origin
  cases.
