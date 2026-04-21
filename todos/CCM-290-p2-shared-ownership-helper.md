---
priority: p2
status: resolved
origin: ce-code-review autofix (CCM-290)
run_id: 20260421-110003-ccm290-review
resolution: "Extracted requireOwnership closure inside createCcmAgentFeedbackHandler; all three methods call it. Landed with P1 fix."
---

# CCM-290 — Duplicated ownership check in agent-handler (3 sites, same shape)

## Severity: P2 (maintainability — pattern drift from adapter-prisma handler)

## File

- `packages/adapter-prisma/src/agent-handler.ts:124-138` (`getFeedback`)
- `packages/adapter-prisma/src/agent-handler.ts:140-177` (`patchFeedback`)
- `packages/adapter-prisma/src/agent-handler.ts:179-221` (`addReply`)

## Problem

Three of the four agent handler methods repeat the same ownership check:

```ts
const { feedbacks } = await store.getFeedbacks({ projectName: project.name, limit: 100, page: 1 });
const owns = feedbacks.some((f) => f.id === params.id);
if (!owns) return notFound(corsHeaders);
```

Aside from the correctness issue this causes (see `CCM-290-p1-agent-ownership-check-pagination.md`), the duplication itself is a maintainability hazard: the next person adding an agent-scoped method has a 1-in-3 chance of copying a stale pattern, and any refactor of the ownership strategy has three edit sites.

`createCcmFeedbackHandler` (the existing widget handler) solved the same problem with `store.verifyProjectOwnership(id, projectName)` called once per mutation method (see `packages/adapter-prisma/src/index.ts:543`, `:592`). The agent handler should mirror that pattern.

## Proposed fix

After resolving the P1 (adding `findById` or keeping `verifyProjectOwnership`), factor the ownership check into a closure inside the factory:

```ts
async function requireOwnership(params: { id: string }, project: { name: string }): Promise<FeedbackRecord | null> {
  const record = await store.findById(params.id);
  if (!record || record.projectName !== project.name) return null;
  return record;
}
```

Then each method becomes:

```ts
getFeedback: async (request, params) => {
  const corsHeaders = buildCorsHeaders(request, allowedOrigins);
  const project = await resolveProject(request);
  if (!project) return unauthorized(corsHeaders);
  const record = await requireOwnership(params, project);
  if (!record) return notFound(corsHeaders);
  return withCors(Response.json(record), corsHeaders);
},
```

Bonus: `getFeedback` can return the record it already fetched (no second call), and `patchFeedback` / `addReply` can skip the update's own 404 handling since ownership is already confirmed.

This is a P2 because it should land together with the P1 fix to avoid two refactor rounds on the same file.

## Acceptance criteria

- [ ] Single `requireOwnership(params, project)` helper in `agent-handler.ts`.
- [ ] All three methods use it; the `getFeedbacks(limit:100, page:1)` anti-pattern is removed.
- [ ] No duplicated `notFound` / ownership logic across the three handler methods.
- [ ] Existing `agent-handler.test.ts` (13 tests) stays green.
- [ ] `bun run lint` green (no dead-code warnings from the refactor).
