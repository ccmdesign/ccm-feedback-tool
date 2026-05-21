# PRO-68 — Cloud INSERT sends client-computed `sequence_number`

**Severity:** P1 (per reviewer task brief) / P3 (per spec + plan)
**Owner:** downstream-resolver (policy decision)
**Files:** `src/cloud-store.ts:198-206`, `src/cloud-store.ts:342-351`

## Finding

`CloudStore.save()` → `pushInsert()` → `recordToRow()` emits
`sequence_number: record.sequenceNumber` on every regular (non-migration)
INSERT. The PRO-68 review task brief states: **"Cloud INSERT path must
never send a client-computed `sequence_number` — the trigger owns it."**

This contradicts the canonical spec (`docs/fab-toolbar-tweaks.md` §8
"Cloud migration" notes + "Store contract → CloudStore" picks option (1))
and the plan (`docs/pro-68-plan.md` U9 and Key Decision 7), both of which
explicitly say to send the optimistic local value so the realtime echo
carries the same number the local cache rendered with.

The Postgres trigger `ccm_widget_assign_sequence` keeps any
client-supplied non-null value (line 59 of `0007_sequence_number.sql`:
`if new.sequence_number is null then ...`), so the current code does not
break the spec — it relies on the documented trigger behavior.

The only path that DOES strip `sequence_number` is `migrateFromLocal()`
(line 486), which is the spec-mandated behavior for migrations.

## Why this matters

Two possible interpretations:

1. **Task brief is correct (P1).** Change `recordToRow()` to never emit
   `sequence_number`. Race window narrows to the trigger only, eliminating
   the spec-documented client/server race. This requires re-confirming with
   spec owner because it changes optimistic-UI semantics (the local cache's
   number may briefly disagree with the server until the realtime echo
   arrives).
2. **Spec is correct (P3).** Current code is intentional. The race window
   between two concurrent client writers is the documented v1 limitation,
   resolved by realtime UPDATE reconciliation. The trigger respects
   client values to preserve optimistic UI consistency.

## Recommended next step

Decide which contract is authoritative before changing the code. If
brief wins: strip `sequence_number` from `recordToRow()`'s INSERT path
(keep it for migration which already strips); if spec wins: close this
todo with a one-line note in the PR description acknowledging the
brief/spec disagreement.

## Suggested fix (if brief wins)

```ts
// In recordToRow, drop:
if (typeof r.sequenceNumber === "number") row.sequence_number = r.sequenceNumber;
// Or fork into recordToInsertRow / recordToUpdateRow so PATCH paths can
// still carry the value (they don't today; defensive only).
```

Not auto-applied: changes behavior the spec explicitly chose.
