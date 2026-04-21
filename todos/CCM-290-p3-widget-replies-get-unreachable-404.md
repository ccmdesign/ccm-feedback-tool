---
priority: p3
status: ready
origin: ce-code-review autofix (CCM-290)
run_id: 20260421-110003-ccm290-review
---

# CCM-290 — Dead 404 branch in widget replies GET route

## Severity: P3 (maintainability — unreachable code)

## File

- `apps/demo/src/app/api/feedback/[id]/replies/route.ts:33-36`

## Problem

The GET handler catches `StoreNotFoundError` and translates to a 404:

```ts
try {
  const rows = await store.listReplies(id);
  // …
} catch (error) {
  if (error instanceof StoreNotFoundError) {
    return Response.json({ error: "Feedback not found" }, { status: 404 });
  }
  // …
}
```

But none of the three `CcmFeedbackStore` implementations throw `StoreNotFoundError` from `listReplies` — all three return `[]` for unknown feedback ids:

- `PrismaStore.listReplies` (`packages/adapter-prisma/src/index.ts:267`) — `findMany({ where: { feedbackId } })` returns `[]` silently.
- `MemoryStore.listReplies` (`packages/adapter-memory/src/index.ts:168`) — explicit `if (!parent) return []`.
- `LocalStorageStore.listReplies` (`packages/adapter-localstorage/src/index.ts:220`) — explicit `if (!parent) return []`.

So the 404 branch is dead. Two legitimate directions:

1. **Tighten the contract.** `listReplies` SHOULD throw `StoreNotFoundError` when the parent feedback doesn't exist — otherwise the route silently 200s on a bogus id, which leaks "feedback does not exist → empty list" as existence information.
2. **Drop the dead branch.** Accept that `listReplies` returns `[]` unconditionally and remove the unreachable `instanceof` check.

Option 2 is the simpler fix. Option 1 would be symmetric with `addReply` (which DOES throw `StoreNotFoundError` on missing parent). Pick based on whether you want the list route to leak feedback-existence (returning `[]` is a mild leak — with a valid token an attacker can distinguish "project with 0 replies" from "project with no such feedback" only by other channels). Low-priority either way.

## Reproduction

```ts
// vitest
it("listReplies of an unknown id returns 200 empty array (not 404)", async () => {
  // Seed no feedbacks. GET /api/feedback/does-not-exist/replies
  // Current behaviour: 200 []
  // Expected if tightening contract: 404
});
```

## Proposed fix

**Option 2 (minimal).** Remove the dead 404 branch:

```ts
} catch (error) {
  console.error("[ccm-feedback] listReplies failed:", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
```

**Option 1 (contract-tightening).** Update all three `listReplies` adapters to throw `StoreNotFoundError` when parent is missing, then the route's 404 branch becomes reachable. Also add a test case in each adapter's test file.

## Acceptance criteria

- [ ] Decide Option 1 or Option 2.
- [ ] If Option 2: remove the `StoreNotFoundError` branch + its import if unused; `bun run check` + `bun run lint` green.
- [ ] If Option 1: update three adapters, add one test per adapter, ensure route's 404 test exercises the path.
- [ ] All existing tests still pass.
