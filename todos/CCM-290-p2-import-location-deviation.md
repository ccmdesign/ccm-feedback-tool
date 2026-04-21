---
priority: p2
status: resolved
origin: ce-code-review autofix (CCM-290)
run_id: 20260421-110003-ccm290-review
resolution: "Option B applied. Tried Option A first — `bun run build` failed with webpack 'Can't resolve ./types.js' for @ccm-feedback/core even with transpilePackages (the review doc's claim that it'd resolve was wrong). Kept StoreNotFoundError on @ccm-feedback/adapter-prisma with a header comment documenting adapter-prisma as the single server-route import surface. Type-only ReplyResponse still comes from core (erased, no resolution at runtime)."
---

# CCM-290 — Widget replies route imports from adapter-prisma; evaluate whether core is viable

## Severity: P2 (maintainability / architecture)

## File

- `apps/demo/src/app/api/feedback/[id]/replies/route.ts:11`

## Problem

Step 2 of the lfg-tracked workflow noted the implementer routed these imports through `@ccm-feedback/adapter-prisma`:

```ts
import { formatValidationErrors, replyCreateSchema, StoreNotFoundError } from "@ccm-feedback/adapter-prisma";
```

The implementer claimed core's raw-TS + `.js` re-exports don't resolve under Next.js webpack even with `transpilePackages`. This todo records the investigation and the right long-term home.

Investigation results (review phase):

1. `apps/demo/next.config.ts` does set `transpilePackages: ["@ccm-feedback/core"]`, so core IS resolvable from Next.js routes.
2. `StoreNotFoundError` is already defined in `packages/core/src/types.ts:313` and re-exported both from `@ccm-feedback/core` and `@ccm-feedback/adapter-prisma` (for convenience). Importing it from either is functionally equivalent; either path would resolve.
3. `replyCreateSchema` and `formatValidationErrors` are Zod-dependent. `@ccm-feedback/core` deliberately does NOT take a Zod dependency — it is a pure-types internal package that gets bundled into consumers via `noExternal`. Moving Zod schemas into core would pull Zod into every adapter's bundle (memory, localstorage, widget). That is a real cost and probably the wrong direction.
4. There is no "move the schema to core" fix here. The right fix is much narrower: the two imports that CAN live in core (`StoreNotFoundError` — already does) should come from core, and the Zod-bound ones legitimately must stay in `adapter-prisma`.

So the architectural concern is weaker than Step 2 suggested: `replyCreateSchema` and `formatValidationErrors` correctly live in `adapter-prisma` (Zod lives there). Only `StoreNotFoundError` could move — and it's already in core, so this is just an import-path preference.

## Proposed fix

Two options; pick one during resolution:

**Option A (minimal — recommended).** Change only `StoreNotFoundError`'s import in the widget replies route to come from `@ccm-feedback/core` directly; leave the Zod-dependent imports in `adapter-prisma`. This keeps the server-side route consistent with the existing widget-side invariant "never pull Zod schemas into browser code" (this is a server route but the pattern still matters).

```ts
import { StoreNotFoundError } from "@ccm-feedback/core";
import { formatValidationErrors, replyCreateSchema } from "@ccm-feedback/adapter-prisma";
```

**Option B (no-op).** Accept the current imports. Document in the route's header comment that `adapter-prisma` is the single import surface for server routes (it re-exports core error types), and that pulling from `@ccm-feedback/core` is reserved for types/constants. Update `CLAUDE.md` under "Architecture" to codify this as the project convention.

The lfg workflow asked for a P2 todo because the import location touches architectural drift, not autofix, so it goes here for human triage.

## Acceptance criteria

- [ ] Decide Option A or Option B with one line of rationale on the chosen direction.
- [ ] If A: update the widget route import; `bun run check` + `bun run test:run` green.
- [ ] If B: update `CLAUDE.md` "Architecture" with the convention; no code change.
- [ ] Leave `agent-handler.ts` alone either way — the Zod-bound imports there are correct and idiomatic for adapter-prisma internal code.
