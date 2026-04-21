---
priority: p3
status: resolved
origin: ce-code-review autofix (CCM-290)
run_id: 20260421-110003-ccm290-review
resolution: "Option B applied — all three agent routes read CCM_AGENT_ALLOWED_ORIGINS via a shared allowed-origins helper; documented in .env.example. Unset = server-to-server (status quo)."
---

# CCM-290 — Agent routes do not wire `allowedOrigins`; CORS is silently disabled

## Severity: P3 (nice-to-have — current use case doesn't need it)

## File

- `apps/demo/src/app/api/v1/agent/feedback/route.ts:22`
- `apps/demo/src/app/api/v1/agent/feedback/[id]/route.ts:17`
- `apps/demo/src/app/api/v1/agent/feedback/[id]/replies/route.ts:15`

## Problem

`createCcmAgentFeedbackHandler` (`packages/adapter-prisma/src/agent-handler.ts:74`) accepts an optional `allowedOrigins: string[]`. When set, the factory emits CORS headers on preflight + real responses; when unset, it emits no CORS headers at all.

All three demo agent routes call the factory WITHOUT `allowedOrigins`:

```ts
return createCcmAgentFeedbackHandler({ store, projectStore });
```

Consequence: any browser-origin request to these routes will be blocked by CORS. For the current plan this is fine — the agent API is documented as server-to-server (the widget never calls it), and an agent running in a terminal / background process is CORS-free. But the plan also mentions `panel.apiLink` lets a developer copy the agent URL and hand it to their agent, so there is a non-zero chance someone will try to invoke the endpoint from a browser dev-tool or a debugging playground and hit an opaque CORS wall.

The widget-side replies route (`/api/feedback/[id]/replies`) also does not wire CORS, but it's called same-origin from the widget, so CORS is irrelevant there. No action needed for that route.

## Proposed fix

Two options:

**Option A (document).** Update the JSDoc header of `agent-handler.ts` and each route file to make the "server-to-server only" contract explicit. Add a one-line note: "Pass `allowedOrigins: [yourDomain]` when exposing the agent API to browser-origin callers (optional)."

**Option B (wire it).** Pull a `CCM_AGENT_ALLOWED_ORIGINS` env var and split on comma in each route:

```ts
const allowedOrigins = process.env.CCM_AGENT_ALLOWED_ORIGINS?.split(",").filter(Boolean);
return createCcmAgentFeedbackHandler({ store, projectStore, ...(allowedOrigins?.length ? { allowedOrigins } : {}) });
```

Option A is likely sufficient for CCM-290; Option B is defensive for a future follow-up where someone adds a debug playground.

## Acceptance criteria

- [ ] Pick Option A or Option B.
- [ ] If A: JSDoc updated on factory + three routes with the server-to-server note.
- [ ] If B: env-var read in all three routes; a smoke test confirms browser origin passes when `CCM_AGENT_ALLOWED_ORIGINS` includes it, fails otherwise.
- [ ] No behaviour change for existing curl / server-to-server callers.
