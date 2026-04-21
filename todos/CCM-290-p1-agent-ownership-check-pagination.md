---
priority: p1
status: resolved
origin: ce-code-review autofix (CCM-290)
run_id: 20260421-110003-ccm290-review
resolution: "Added CcmFeedbackStore.findById across all 3 adapters; agent-handler uses requireOwnership(findById)-based check — no more 100-row cap. See P1+P2-shared commit."
---

# CCM-290 — Agent handler ownership check paginates at 100; >100 feedbacks silently 404

## Severity: P1 (correctness — user-visible 404s on valid records)

## File

- `packages/adapter-prisma/src/agent-handler.ts:130` (`getFeedback`)
- `packages/adapter-prisma/src/agent-handler.ts:157` (`patchFeedback`)
- `packages/adapter-prisma/src/agent-handler.ts:194` (`addReply`)

## Problem

Three handler methods verify "does this feedback belong to the token's project?" with a paginated list query:

```ts
const { feedbacks } = await store.getFeedbacks({ projectName: project.name, limit: 100, page: 1 });
const owns = feedbacks.some((f) => f.id === params.id);
if (!owns) return notFound(corsHeaders);
```

`getFeedbacks` returns results ordered `createdAt: "desc"` with a hard cap of 100 (`getQuerySchema` in `validation.ts:185` sets `limit: z.coerce.number().int().min(1).max(100)`). So:

- Any feedback older than the most recent 100 in the token's project returns 404 from GET `/api/v1/agent/feedback/:id`, PATCH the same, and POST `/api/v1/agent/feedback/:id/replies` — even though the feedback exists and the token owns it.
- An agent triaging an older bug will see a 404 that looks like a cross-project leak protection but is really a silent pagination bug.
- The hard 100-cap in `getQuerySchema.max(100)` means we cannot just bump the number here without changing the public list contract.

This violates Plan R3 ("authenticated agent list, **get**, patch, and reply to feedbacks for a given project"): get/patch/addReply must work for any feedback in the project, not just the newest 100.

## Reproduction

1. Seed 101 feedbacks into a single project.
2. Rotate the project's `agentToken`.
3. `curl /api/v1/agent/feedback/<oldest-feedback-id>?token=TOKEN` → 404.
4. `curl /api/v1/agent/feedback?token=TOKEN` with default limit → only the newest 100 are listed; the target feedback is missing.

## Proposed fix

Introduce a store-level ownership lookup that bypasses the query-shape schema and the 100-row cap. `PrismaStore.verifyProjectOwnership(id, projectName)` already exists (`packages/adapter-prisma/src/index.ts:279`) for the existing Bearer handler — extend the `CcmFeedbackStore` contract with the same method (so memory/localstorage adapters are forced to implement it too) and replace the three `getFeedbacks` calls in `agent-handler.ts` with a single `store.verifyProjectOwnership(params.id, project.name)`.

For `getFeedback` (the `GET /:id` case) that response still needs the full `FeedbackRecord`. Add a `getFeedbackById(id)` / `findById(id)` method to `CcmFeedbackStore` (or combine: `findById(id): Promise<FeedbackRecord | null>`) and check `record.projectName === project.name` after fetch.

Minimum contract change (append to `CcmFeedbackStore` in `packages/core/src/types.ts`):

```ts
/** Fetch a single feedback by id with relations. Returns null when absent. */
findById(id: string): Promise<FeedbackRecord | null>;
```

Then in `agent-handler.ts`:

```ts
getFeedback: async (request, params) => {
  // …auth…
  const record = await store.findById(params.id);
  if (!record || record.projectName !== project.name) return notFound(corsHeaders);
  return withCors(Response.json(record), corsHeaders);
},

patchFeedback: async (request, params) => {
  // …auth + body parse…
  const record = await store.findById(params.id);
  if (!record || record.projectName !== project.name) return notFound(corsHeaders);
  // existing updateFeedback call…
},

addReply: async (request, params) => {
  // …auth + body parse…
  const record = await store.findById(params.id);
  if (!record || record.projectName !== project.name) return notFound(corsHeaders);
  // existing addReply call…
},
```

Adapter implementations:
- `PrismaStore.findById`: `prisma.feedbackItem.findUnique({ where: { id }, include: INCLUDE_RELATIONS })`.
- `MemoryStore.findById`: `this.feedbacks.find((f) => f.id === id) ?? null`.
- `LocalStorageStore.findById`: `this.load().find((f) => f.id === id) ?? null`.

## Acceptance criteria

- [ ] `CcmFeedbackStore` has a `findById` (or `getFeedbackById`) method.
- [ ] All three adapters implement it; existing tests pass.
- [ ] `agent-handler.ts` uses `findById` (not paginated `getFeedbacks`) for ownership + fetch on `getFeedback`, `patchFeedback`, and `addReply`.
- [ ] New test in `agent-handler.test.ts`: seed 101 feedbacks, the 101st (oldest) must still be GET/PATCH/addReply-able through the agent API with the owning token.
- [ ] Cross-project isolation test still passes (token A cannot reach project B feedback through any of the three methods).
- [ ] `bun run check` + `bun run lint` + `bun run test:run` green.
