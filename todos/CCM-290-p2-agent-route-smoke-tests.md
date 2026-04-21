---
priority: p2
status: resolved
origin: ce-code-review autofix (CCM-290)
run_id: 20260421-110003-ccm290-review
resolution: "Four route smoke test files added under apps/demo/src/**/__tests__/. Cover happy path + auth failure + method exports + context.params forwarding + agent-vs-user source tagging. Added `@/` alias to vitest.config.ts so route modules resolve `@/lib/store` + `@/lib/ccm-stores` the same way Next.js does."
---

# CCM-290 — Next.js agent route files have no unit-test coverage

## Severity: P2 (testing gap)

## File

- `apps/demo/src/app/api/v1/agent/feedback/route.ts`
- `apps/demo/src/app/api/v1/agent/feedback/[id]/route.ts`
- `apps/demo/src/app/api/v1/agent/feedback/[id]/replies/route.ts`
- `apps/demo/src/app/api/feedback/[id]/replies/route.ts`

## Problem

`agent-handler.test.ts` covers the factory's 13 behaviours comprehensively (auth 401, cross-project 404, patch echo-only, reply tagging, 400 validation). But the actual Next.js route files — which wire the factory to `getHandler()` via `resolveStore()` + `resolveProjectStores()` — have zero tests.

A broken route wiring (e.g., `handler.listFeedback(request)` vs. `handler.getFeedback(request, params)` mix-up, missing `context.params` await, wrong method exported) would land silently because `bun run test:run` never touches these files. The existing test suite caught the exact same class of bug in CCM-277 (`apps/demo` App Router routes had wiring regressions).

Additionally, the widget-side `/api/feedback/[id]/replies/route.ts` route has no smoke test: the `GET` 404 path (`StoreNotFoundError` branch) is dead code today (see the P3 todo) and the `POST` happy path is uncovered at the HTTP boundary.

## Reproduction

Point-check: replace `handler.listFeedback(request)` in `apps/demo/src/app/api/v1/agent/feedback/route.ts` with `handler.getFeedback(request, { id: "nope" })` and `bun run test:run` still passes. The next deploy would 500 on every list call with no CI signal.

## Proposed fix

Add route smoke tests mirroring `apps/demo/netlify/functions/__tests__/dispatch-retry.test.ts` (already a Next.js-route-adjacent test pattern in this repo). For each of the four routes:

1. Mock `@/lib/store` + `@/lib/ccm-stores` with a `FakeStore` + `fakeProjectStore` (reuse the helpers in `packages/adapter-prisma/__tests__/agent-handler.test.ts`).
2. Dynamically import the route module.
3. Assert each HTTP method is exported and returns the expected status for one happy path + one auth/validation failure.

Example (pseudocode) for `apps/demo/src/app/api/v1/agent/feedback/__tests__/route.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/store", () => ({ resolveStore: async () => fakeStore }));
vi.mock("@/lib/ccm-stores", () => ({ resolveProjectStores: async () => ({ projectStore: fakeProjectStore }) }));

describe("/api/v1/agent/feedback route", () => {
  it("GET with valid token returns 200", async () => {
    const { GET } = await import("../route");
    const res = await GET(new Request("http://t/api/v1/agent/feedback?token=SECRET"));
    expect(res.status).toBe(200);
  });
  it("GET with no token returns 401", async () => { /* … */ });
  it("OPTIONS returns 204", async () => { /* … */ });
});
```

Add four files: one per route module. Keep each under ~60 lines.

## Acceptance criteria

- [ ] Four new route-level test files covering both agent routes and the widget replies route.
- [ ] Each asserts: happy path status + auth failure path (for agent routes) + method exports present.
- [ ] `bun run test:run` green with new tests.
- [ ] Optionally: add a test that deliberately inverts one handler wiring (e.g., swaps `listFeedback` and `getFeedback`) and confirm the new test FAILS for the right reason — demonstrates the smoke test catches wiring drift.
