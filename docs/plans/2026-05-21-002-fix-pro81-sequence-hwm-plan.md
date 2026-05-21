---
status: active
created: 2026-05-21
ticket: PRO-81
type: fix
depth: standard
branch: feature/PRO-81-sequence-hwm
---

# fix: PRO-81 persistent sequence-number high-water mark

## Summary

PRO-68 shipped sequence-number issuance as `max(existing) + 1` in both the
localStorage `Store` and the Supabase trigger. That recipe recycles the
number whenever the current highest-numbered comment is deleted —
deleting `#3` from a fresh `#1, #2, #3` project causes the next save to
re-issue `#3`. The spec (docs/fab-toolbar-tweaks.md §8) was rewritten
around a monotonic per-project **high-water mark** persisted in its own
slot, never decremented by any code path (delete, cascade, clear). This
plan replaces the defective `max(rows)+1` logic in both stores with the
HWM mechanism, preserves the existing column / unique partial index /
advisory lock, and updates the migration tooling + docs.

## Problem Frame

**Current defect.** `src/store.ts:129-136` (`nextSequenceNumber`) reads
`max(existing.sequenceNumber) + 1` over the in-memory row array.
`supabase/migrations/0007_sequence_number.sql:51-74` does the same query
inside the BEFORE INSERT trigger, hardened by an advisory lock in
`0008_sequence_unique.sql:42-64`. Both derive the next number from the
current row set, so deleting a row that *was* the current max lowers
the derived max and the next insert reuses the freed number.

**Target contract** (verbatim from spec §8 "Delete-behavior contract"):

- The next-to-issue number lives in its own persisted slot, separate
  from the annotation rows.
- Every successful top-level save reads that slot, assigns its value to
  the new record's `sequenceNumber`, and bumps the slot by one.
- The slot is **never decremented** by any code path — single delete,
  cascade delete (parent + replies), bulk clear, undo. None of them
  touch the HWM.
- Replies do not consume a number and do not bump the HWM.

**Why this matters.** Reviewers reference comments across chat, PRs,
and follow-up sessions ("let's work on comment #67"). The identifier
must remain stable for the project's full history, regardless of what
has been deleted. The defect makes `#N` ambiguous the moment anyone
deletes the current top comment.

## Requirements

Carried from spec §8 verification list, with the matching test
scenarios noted on each implementation unit below.

- **R1.** Deleting the current-highest top-level comment must not lower
  the next-issued number. Fresh project at `#1, #2, #3`, delete `#3`,
  next save issues `#4` (NOT `#3`). True for both stores.
- **R2.** `Store.clear()` must not reset the HWM. Project at `#71`,
  clear every row, next save issues `#72` (NOT `#1`).
- **R3.** Replies (`parentId` set) do not consume a sequence number and
  do not advance the HWM slot. Reply on `#71` leaves HWM at `72`; next
  top-level save is `#72`.
- **R4.** `migrateFromLocal` carrying a client-supplied `sequenceNumber`
  must (a) honor that number on the inserted row, and (b) fast-forward
  the server meta slot if the supplied number is `>=` the slot's current
  next, so future inserts don't collide.
- **R5.** Concurrent inserts on the same project must not produce
  duplicate `(project_name, sequence_number)` pairs. The existing
  advisory lock + unique partial index already enforce this; the new
  trigger body must keep both intact.
- **R6.** Cloud rows that have not yet received the server-assigned
  number render `#?` as a placeholder. Markers and the drawer already
  fall back to `?` for absent `sequenceNumber` — no UI code change.
- **R7.** All existing PRO-68 §8 invariants stay: project scope,
  monotonic, never reused, assigned at create time, replies excluded.

## Scope

**In scope:**

- New localStorage sibling key `ccm-feedback:<projectName>:seq-hwm`
  read-and-bumped inside `Store.save()` before the row array is
  persisted; seeded once on construction from `max(rows.sequenceNumber)
  + 1`.
- `src/store.ts` rewrite: delete `nextSequenceNumber`, change
  `buildRecord` signature to accept a pre-assigned number, add HWM
  helpers, update `Store.save()`, update `Store` constructor seed step.
- New migration `supabase/migrations/0009_sequence_hwm.sql`: new
  `ccm_widget_project_meta` table, idempotent backfill, replacement
  trigger body with read-and-bump semantics, fast-forward for
  client-supplied values. Keeps advisory lock from `0008`.
- `src/cloud-store.ts` updates so the local optimistic row carries
  `sequenceNumber: undefined` (no `max(cache)+1` guess) until the
  server INSERT response or peer realtime INSERT delivers the assigned
  number. `migrateFromLocal` keeps supplying the local
  `sequenceNumber` so the trigger fast-forwards. `recordToRow` /
  `rowToRecord` mappers unchanged.
- Tooling + docs: append `0009` to `scripts/apply-migrations.sh`,
  `docs/self-hosting.md`, `docs/cloud-mode.md`; document the `#?`
  placeholder window in `docs/architecture.md`; update the "Known
  limitations" sequence-race entry in `docs/cloud-mode.md` to reflect
  the HWM mechanism shipping.

**Out of scope:**

- No edits to `src/markers.ts` or `src/drawer.ts`. Both already render
  `?` when `record.sequenceNumber` is absent — that fallback covers
  the new `#?` placeholder window naturally.
- No rewrite of `supabase/migrations/0007_sequence_number.sql` or
  `0008_sequence_unique.sql`. They stay on disk and apply in order;
  `0009` supersedes only the trigger function body. Column, backfill,
  index, and advisory lock from prior migrations all stay live.
- No changes to `scripts/feedback.ts` `#N` resolution logic, the
  `apply-ccm-feedback` skill rules, or any export consumer — they
  already read `sequenceNumber` from the record, agnostic of how it
  was issued.
- No new automated tests. Repo has no test suite. Verification =
  `bun run check` + `bun run lint` + `bun run build` + manual browser
  smoke (smoke happens in workflow Step 5, not this plan).

### Deferred to Follow-Up Work

- Explicit "reset project numbering" admin command that deliberately
  deletes the HWM key (localStorage) and the meta row (Supabase). Spec
  §8 mentions this as a possible future surface; not in this ticket.
- Crash-recovery audit tooling to detect HWM gaps that exceed expected
  bounds (e.g. HWM > 100, only 10 rows ever existed). Not needed for
  v1 — gaps are normal and expected per the contract.

## Key Technical Decisions

**Decision: bump HWM *before* persisting the row.** Spec §8 "Store
contract" calls for read → build → bump → persist. The crash window
between bump and array-write means the worst case is "consumed but
never written" — a gap, which the spec already declares legal. The
opposite ordering (row first, HWM after) would risk re-issuing the
same number if the crash window landed between the writes, violating
R1. Gap-on-crash beats duplicate-on-crash.

**Decision: localStorage HWM key holds a JSON number, not a string.**
Matches `JSON.parse` / `JSON.stringify` symmetry the rest of `store.ts`
uses for the row array. `loadHwm` defends against `null`, non-number,
and below-1 values by returning `1`.

**Decision: `CloudStore.save()` no longer passes the in-memory cache to
`buildRecord`.** Since `buildRecord` no longer derives the number from
the array, the cache is irrelevant. The local optimistic record is
built with `sequenceNumber: undefined`; the realtime INSERT echo (or
the eventual POST response) carries the authoritative server value.
This matches spec §8 "Cloud migration" "Pick option 1 for v1" — render
`#?` for the ~1 RTT window rather than guessing locally and reconciling.

**Decision: `0009` keeps the existing trigger name
(`ccm_widget_assign_sequence`).** Using `create or replace function`
preserves the trigger binding installed by `0007` — no `drop trigger /
create trigger` dance. Idempotent re-runs of `0009` are safe.

**Decision: idempotent meta-table backfill via
`greatest(existing, excluded)`.** If `0009` is re-applied after some
rows have already been deleted (lowering `max(sequence_number)`), the
backfill must not lower the slot. `on conflict (project_name) do
update set next_sequence_number = greatest(existing, excluded)` makes
the migration safe to re-run without data loss.

**Decision: `buildRecord` signature change is internal-only.** It is
not exported as part of the package surface; only `src/store.ts` and
`src/cloud-store.ts` import it. Both call sites are updated in this
plan, so the breaking signature change has zero external blast radius.

## System-Wide Impact

| Surface              | Change                                                                  |
| -------------------- | ----------------------------------------------------------------------- |
| `src/store.ts`       | Helper deleted; signature change on `buildRecord`; `Store` constructor seeds HWM; `Store.save` rewrites issuance critical section. `delete` / `clear` / cascade filter unchanged but explicitly verified no-op. |
| `src/cloud-store.ts` | `CloudStore.save` drops the cache argument when calling `buildRecord`; local optimistic rows carry `sequenceNumber: undefined`. `migrateFromLocal` payload unchanged — still strips client `sequence_number`? See open question below. |
| Supabase schema      | New table `public.ccm_widget_project_meta`. Trigger function body replaced. Lock + column + index from 0007/0008 untouched. |
| Self-hoster docs     | New migration step in `scripts/apply-migrations.sh`, `docs/self-hosting.md`, `docs/cloud-mode.md`. |
| Architecture doc     | New paragraph in `docs/architecture.md` "Sequence numbers" section describing the HWM model + `#?` placeholder window. |
| Markers / drawer     | No code change; existing `?` fallback covers `#?` placeholder. |
| Apply-ccm-feedback / scripts/feedback.ts | No change; consumers already read `record.sequenceNumber` directly. |

---

## Implementation Units

### U1. `supabase/migrations/0009_sequence_hwm.sql` — meta table + replacement trigger

**Goal.** Replace the defective `max(sequence_number)+1` trigger logic
with read-and-bump against a new per-project meta table. Preserve the
advisory lock and the unique partial index from `0008` as the
suspenders to the trigger's belt.

**Requirements.** R1 (server-side delete-the-highest), R2 (server-side
clear-then-create), R3 (replies don't bump), R4 (`migrateFromLocal`
fast-forward), R5 (concurrent-insert safety via existing advisory
lock).

**Dependencies.** None — schema-only change, but applied after `0008`.

**Files.**

- Create: `supabase/migrations/0009_sequence_hwm.sql`

**Approach.** Follow the SQL sketch in spec §8 "Cloud migration"
verbatim:

1. `create table if not exists public.ccm_widget_project_meta` with
   `project_name text primary key`, `next_sequence_number bigint not
   null default 1`, `updated_at timestamptz not null default now()`.
2. Backfill: `insert into ... select project_name, coalesce(max(seq),
   0)+1 from ccm_widget_annotations where parent_id is null group by
   project_name on conflict (project_name) do update set
   next_sequence_number = greatest(existing.next_sequence_number,
   excluded.next_sequence_number)`. The `greatest()` form makes
   re-runs safe even if rows have been deleted between applications.
3. Enable RLS on the new table; add a single `for all using (true)
   with check (true)` policy mirroring `ccm_widget_annotations`. The
   trigger runs as the inserting role, so anon must be able to
   `insert/update` the meta row.
4. `create or replace function public.ccm_widget_assign_sequence()`
   body:
   - Early-return `new` when `new.parent_id is not null` (replies are
     skipped — R3).
   - `perform pg_advisory_xact_lock(hashtext('ccm_widget_seq:' ||
     new.project_name))` (carry forward from `0008` — R5).
   - `insert into ccm_widget_project_meta (project_name,
     next_sequence_number) values (new.project_name, 1) on conflict
     (project_name) do nothing` — lazy create for projects with no
     meta row yet.
   - `update ccm_widget_project_meta set next_sequence_number =
     next_sequence_number + 1, updated_at = now() where project_name
     = new.project_name returning next_sequence_number - 1 into
     next_seq` — atomic read-and-bump inside the lock.
   - If `new.sequence_number is null`, assign `next_seq` to it.
   - If `new.sequence_number is not null and new.sequence_number >=
     next_seq`, `update ccm_widget_project_meta set
     next_sequence_number = new.sequence_number + 1 where
     project_name = new.project_name and next_sequence_number <=
     new.sequence_number` — fast-forward for `migrateFromLocal`
     supplied values (R4).
5. Do NOT `drop trigger` / `create trigger` — `create or replace
   function` reuses the existing binding from `0007`.

**Patterns to follow.** Trigger function structure mirrors `0008` —
keep the `language plpgsql` + `$$ ... $$` block style. Idempotent
posture (`create table if not exists`, `create policy if not exists`
where supported, `on conflict do update`) matches every prior
migration. `pg_advisory_xact_lock(hashtext(...))` call site is
verbatim from `0008` line 54.

**Technical design (directional, not implementation spec).**

```sql
create table if not exists public.ccm_widget_project_meta (
  project_name text primary key,
  next_sequence_number bigint not null default 1,
  updated_at timestamptz not null default now()
);

insert into public.ccm_widget_project_meta (project_name, next_sequence_number)
select project_name, coalesce(max(sequence_number), 0) + 1
  from public.ccm_widget_annotations
 where parent_id is null
 group by project_name
on conflict (project_name) do update
  set next_sequence_number = greatest(
        public.ccm_widget_project_meta.next_sequence_number,
        excluded.next_sequence_number);

alter table public.ccm_widget_project_meta enable row level security;
create policy ccm_widget_project_meta_all on public.ccm_widget_project_meta
  for all using (true) with check (true);

create or replace function public.ccm_widget_assign_sequence()
returns trigger language plpgsql as $$
declare next_seq bigint;
begin
  if new.parent_id is not null then return new; end if;
  perform pg_advisory_xact_lock(hashtext('ccm_widget_seq:' || new.project_name));
  insert into public.ccm_widget_project_meta (project_name, next_sequence_number)
    values (new.project_name, 1) on conflict (project_name) do nothing;
  update public.ccm_widget_project_meta
     set next_sequence_number = next_sequence_number + 1, updated_at = now()
   where project_name = new.project_name
   returning next_sequence_number - 1 into next_seq;
  if new.sequence_number is null then new.sequence_number := next_seq; end if;
  if new.sequence_number is not null and new.sequence_number >= next_seq then
    update public.ccm_widget_project_meta
       set next_sequence_number = new.sequence_number + 1
     where project_name = new.project_name
       and next_sequence_number <= new.sequence_number;
  end if;
  return new;
end; $$;
```

Treat as directional. Implementation must match spec §8 verbatim where
unambiguous; this sketch communicates the structure.

**Test scenarios.** Manual SQL probes against a fresh Supabase project
after applying 0001–0009 in order:

- *Apply-then-reapply idempotency.* Run `0009` twice in a row. Second
  run must succeed without error; `next_sequence_number` for every
  project must equal the first-run value (verify via `select
  project_name, next_sequence_number from ccm_widget_project_meta`).
- *Backfill of existing project.* Pre-seed `ccm_widget_annotations`
  with three top-level rows for project `test1` (sequences 1, 2, 3).
  Apply `0009`. Verify `next_sequence_number = 4` for `test1`.
- *Backfill after delete-the-highest.* From the previous probe, delete
  the row with `sequence_number = 3`. Re-apply `0009` (simulating a
  re-run in production). Verify `next_sequence_number` stays at `4`,
  not `3` (the `greatest()` clause).
- *Lazy-create on first insert for unseen project.* Insert a row for
  project `test2` (no prior meta row). Verify the row gets
  `sequence_number = 1`, and a meta row appears with
  `next_sequence_number = 2`.
- *Covers R1.* Insert three rows for project `test3`; delete the
  third; insert a fourth. Fourth row must get `sequence_number = 4`.
- *Covers R3.* Insert a top-level row (gets `#N`), then insert a reply
  (`parent_id` set). Verify the reply has `sequence_number IS NULL`
  and the meta `next_sequence_number` did NOT advance.
- *Covers R4.* `migrateFromLocal`-style insert with explicit
  `sequence_number = 70` when meta says `next_sequence_number = 5`.
  Verify the row keeps `70` AND meta jumps to `71`.
- *Covers R5.* Open two psql sessions, both begin transactions, both
  insert a row for the same project, both commit. Verify both rows
  got distinct `sequence_number` values (advisory lock serialized
  them). Verify the unique partial index from `0008` still exists via
  `\d+ ccm_widget_annotations`.

**Verification.** `psql ... -v ON_ERROR_STOP=1 -f
supabase/migrations/0009_sequence_hwm.sql` completes without error
against a fresh dev project AND against a project that has 0007/0008
already applied with non-empty rows. The SQL probes above all return
the expected outcomes.

---

### U2. `src/store.ts` — HWM helpers + Store rewrite

**Goal.** Replace `nextSequenceNumber(existing)` with HWM-backed
issuance. Change `buildRecord` signature to accept a pre-assigned
number. Seed the HWM key in the `Store` constructor once.

**Requirements.** R1 (localStorage delete-the-highest), R2
(localStorage clear-then-create), R3 (reply path leaves HWM alone via
`Store.addReply` calling `buildReplyRecord` which never touches HWM),
R7 (existing invariants preserved).

**Dependencies.** None — pure code change. Independent of U1 (each
store owns its own HWM).

**Files.**

- Modify: `src/store.ts`

**Approach.**

1. **Add helpers** near the existing `storageKey` / `load` / `persist`
   block:
   - `hwmKey(projectName: string): string` returns
     `` `ccm-feedback:${projectName}:seq-hwm` ``.
   - `loadHwm(projectName: string): number` reads the sibling key,
     `JSON.parse`s, defends against null / non-number / below-1
     values, falls back to `1`. Wrap in try/catch (same posture as
     `load`).
   - `persistHwm(projectName: string, next: number): void` writes
     `JSON.stringify(next)`. Best-effort try/catch matching `persist`.
2. **Delete** `nextSequenceNumber(existing)` (current src/store.ts:129-136)
   and its doc block. Export removal — `buildRecord` was the only caller.
3. **Change `buildRecord` signature** (current src/store.ts:167-209):
   `buildRecord(input: SaveInput, assignedSequenceNumber: number):
   AnnotationRecord`. Replace the body's
   `sequenceNumber: nextSequenceNumber(existing)` with
   `sequenceNumber: assignedSequenceNumber`. All other field
   assignments unchanged.
4. **Update `Store` constructor** (current src/store.ts:248-259). After
   the existing `backfillSequenceNumbers` block (which already runs
   first), add: if `localStorage.getItem(hwmKey(this.projectName)) ===
   null`, compute `max(items.filter(r => !r.parentId)
   .map(r => r.sequenceNumber ?? 0))`, write `persistHwm(this.projectName,
   max + 1)`. For an empty project the max is `0` so the seed is `1`.
   The seed runs after backfill so it observes the post-backfill max,
   matching spec §8 "Backfill of pre-migration localStorage data".
5. **Rewrite `Store.save`** (current src/store.ts:275-281) following
   the spec §8 read → build → bump → persist order:

   ```ts
   save(input: SaveInput): AnnotationRecord {
     const items = load(this.projectName);
     const assigned = loadHwm(this.projectName);
     const record = buildRecord(input, assigned);
     persistHwm(this.projectName, assigned + 1);  // bump BEFORE row write
     items.unshift(record);
     persist(this.projectName, items);
     return record;
   }
   ```

   The bump-before-write ordering is the load-bearing crash-safety
   choice — see Key Technical Decisions.
6. **Verify `Store.delete` is untouched** (current src/store.ts:283-296).
   The existing cascade filter `r.id !== id && r.parentId !== id`
   stays exactly as is. No HWM write.
7. **Verify `Store.clear` is untouched** (current src/store.ts:298-300).
   Continues to `localStorage.removeItem(storageKey(this.projectName))`
   only. The HWM sibling key persists by intention — that's R2.
8. **`Store.addReply` / `buildReplyRecord` unchanged.** Reply records
   never carry a `sequenceNumber` and the reply save path does not
   read or write the HWM. Confirms R3 by construction.

**Patterns to follow.**

- Try/catch posture for storage reads/writes mirrors existing `load` /
  `persist` (src/store.ts:103-121).
- Type-strict integer guard in `loadHwm` mirrors the
  `Array.isArray(data) ? data : []` defensive pattern in `load`.
- Constructor side-effect ordering (read → backfill → persist if
  changed) mirrors the existing block at src/store.ts:255-258.

**Test scenarios.** No automated tests; verification via manual
browser smoke (workflow Step 5). Scenarios to exercise in smoke:

- *Covers R1.* Fresh project. Add three comments → `#1, #2, #3`. Delete
  `#3`. Add new comment → must render as `#4`, not `#3`.
- *Covers R2.* Project at `#71`. Trigger `Store.clear()` (the Clear
  button in the FAB radial). Add new comment → must render as `#72`,
  not `#1`. Inspect localStorage: row array is empty, HWM key still
  holds `73` (or `72`, depending on read timing).
- *Covers R3.* Add a top-level comment (`#71`). Add a reply under it.
  Reply renders without `#N`. Add another top-level comment → must
  render as `#72`, not `#73`.
- *Backfill seed.* Manually pre-seed localStorage with a `ccm-feedback:<proj>`
  array containing three pre-PRO-68 rows (no `sequenceNumber`). Open
  the widget. Confirm rows get backfilled to `#1, #2, #3` AND HWM key
  appears holding `4`. Reload page; HWM unchanged.
- *Idempotent constructor.* Construct `Store` twice for the same
  project. HWM key value does not change between constructions.
- *Crash-safety semantics.* Manually set HWM to `50` in DevTools, then
  trigger a save. The new record must render `#50` AND HWM bumps to
  `51` before the array persists. Inspect order via DevTools timeline
  if needed — the spec accepts gap-on-crash; the test confirms no
  duplicate-on-crash.
- *No regression on existing flows.* Status updates, anchor updates
  (`updateAnchor`), and replies all work identically to PRO-68 — no
  HWM read or write inside those code paths.

Test expectation: none of these scenarios is automated. Manual
verification in workflow Step 5 covers them.

**Verification.**
- `bun run check` passes (the `buildRecord` signature change must be
  reflected in `src/cloud-store.ts` call site — U3 handles that).
- `bun run lint` clean (Biome formatting / import ordering).
- Browser smoke scenarios above all pass.

---

### U3. `src/cloud-store.ts` — drop the optimistic-guess, render `#?` until server

**Goal.** Align `CloudStore.save` with the new `buildRecord` signature
and the spec §8 "Cloud migration" "Pick option 1 for v1" decision:
local optimistic row carries `sequenceNumber: undefined` until the
server INSERT response or peer realtime INSERT delivers the assigned
value.

**Requirements.** R6 (placeholder rendering), R4 (`migrateFromLocal`
fast-forward — code path unchanged; trigger from U1 handles it).

**Dependencies.** U2 (the `buildRecord` signature change is the
breaking change `cloud-store.ts` must adapt to).

**Files.**

- Modify: `src/cloud-store.ts`

**Approach.**

1. **`CloudStore.save` rewrite** (current src/cloud-store.ts:342-351).
   Drop the `this.cache` second argument. Call `buildRecord(input, 0)`
   *only as a transitional convenience* — but `0` would render as `#0`
   which is wrong. Instead: extend `buildRecord` to allow the second
   argument to be a number OR an explicit `undefined`, and when
   `undefined`, leave the field unset (no `sequenceNumber:` line at
   all in the returned record).

   *Open question.* Two viable shapes for the signature change:
   1. Always require a number; `CloudStore` builds a sentinel value
      and the record carries `sequenceNumber: undefined` set after
      `buildRecord` returns.
   2. Allow `buildRecord(input, undefined)` and short-circuit the
      assignment inside `buildRecord` when the value is `undefined`.

   Recommend option 2 — keeps the assignment logic centralized.
   Decision left to implementer; either is correct as long as the
   resulting `CloudStore.save` returns a record with
   `sequenceNumber === undefined`.

2. **Local optimistic row.** After `buildRecord`, the cache entry has
   `sequenceNumber: undefined`. Push onto cache, call
   `pushInsert(record)`. Marker / drawer render the existing `?`
   fallback for the ~1 RTT window.

3. **`pushInsert` response handling.** Current code POSTs and ignores
   the response body. Since the trigger now assigns the number and
   `Prefer: return=representation` is already set on every request
   (cloud-store.ts:237), parse the response, find the matching
   `record.id` in `this.cache`, patch the cache row with the server's
   `sequence_number`, and call `this.onChange()` so the marker /
   drawer re-render with the real `#N`.

   *Alternative.* Rely solely on the realtime INSERT echo to update
   the cache. The echo path (cloud-store.ts:268-283) already calls
   `rowToRecord` and `onChange`. But the echo has a race: if the
   local cache `some(r => r.id === row.id)` check short-circuits the
   echo (which it does — line 270), the cache never gets the server's
   `sequence_number`. So either:
   1. Remove the short-circuit for the case where the local row has
      `sequenceNumber === undefined` (replace its entry with
      `rowToRecord(row)` to pick up the server value), OR
   2. Always parse the POST response and patch.

   Recommend the realtime-echo path adjustment (option 1) — keeps
   `pushInsert` fire-and-forget posture, and the realtime channel is
   already the canonical "server has spoken" signal. Implementation
   sketch: when `onInsert` arrives, find the cache entry by id; if it
   exists and is missing `sequenceNumber`, replace it with the
   `rowToRecord(row)` result and fire `onChange`. If the existing
   entry already has a sequence number, keep the current
   short-circuit behavior.

   Decision left to implementer; either is correct as long as the
   cache eventually carries the server-assigned number and triggers
   a re-render.

4. **`recordToRow` / `rowToRecord` unchanged** (cloud-store.ts:112-207).
   They already round-trip `sequence_number` correctly. Spec
   explicitly preserves their semantics.

5. **`migrateFromLocal` unchanged** (cloud-store.ts:473-514). Current
   code strips `sequence_number` from the payload on
   cloud-store.ts:486 with the comment "Pre-migration local numbers
   were render-indices, not canonical identifiers". Spec §8 "Cloud
   migration" Store contract item 2 calls for the OPPOSITE behavior:
   "Keep supplying the local `sequenceNumber` on each migrated row —
   the trigger respects it AND fast-forwards the meta slot".

   **This is a behavioral change**: remove the
   `delete row.sequence_number` line and update the inline comment.
   After PRO-81 ships, local numbers ARE canonical (the localStorage
   path now uses the HWM mechanism, same contract as cloud), so
   carrying them through migration is correct AND the trigger's
   fast-forward (U1) ensures the meta slot keeps pace.

   *Edge case.* Pre-PRO-81 localStorage rows may still carry
   `sequenceNumber` derived from the old `max+1` recipe. After PRO-81
   constructor seed step runs, those numbers are preserved (backfill
   never overwrites existing values) AND the HWM key is seeded from
   `max+1` to match. So `migrateFromLocal` carrying those numbers
   into the cloud is consistent — the trigger fast-forwards the cloud
   meta slot to match. Document this in the inline comment.

**Patterns to follow.** `onInsert` cache-update path mirrors the
existing `onUpdate` handler at cloud-store.ts:284-304 (find by id,
replace entry, fire `onChange`). Realtime echo idempotency (the
`some(r => r.id === row.id)` short-circuit) is the existing pattern;
the adjustment for missing `sequenceNumber` is a targeted carve-out.

**Test scenarios.** Manual browser smoke against a deployed preview
URL (cloud mode is force-disabled on localhost):

- *Covers R6.* Open the widget against a Supabase preview project.
  Drop a new pin. Confirm the marker briefly renders `#?`. Confirm
  it transitions to the real `#N` within ~1 second (realtime echo).
  Confirm no `#0` flash.
- *Realtime cross-browser parity.* Window A drops a pin (sees `#?`
  → `#71`). Window B receives the realtime INSERT and renders the
  same `#71` directly — no `#?` window because window B never had a
  local optimistic row.
- *Covers R1 (cloud).* In the Supabase SQL editor: insert three rows
  for project `test`, delete the row with `sequence_number = 3`, then
  use the widget UI to drop a new pin. New pin must get `#4`, not
  `#3`. Verify via the marker label AND via
  `select sequence_number from ccm_widget_annotations order by created_at desc limit 1`.
- *Covers R4 (migrateFromLocal fast-forward).* Pre-seed localStorage
  with three rows numbered `#10, #11, #12`. Open the widget in cloud
  mode for the first time (which triggers the migrate path). Verify
  all three rows arrive in Supabase with `sequence_number = 10/11/12`.
  Verify `select next_sequence_number from ccm_widget_project_meta
  where project_name = '<proj>'` returns `13`. Drop a new pin →
  receives `#13`.

Test expectation: none automated. Manual smoke per above.

**Verification.**
- `bun run check` passes (signature change from U2 compiles).
- `bun run lint` clean.
- Browser smoke scenarios above all pass against a deployed Supabase
  preview project.

---

### U4. Tooling + docs — list `0009`, document `#?` placeholder

**Goal.** Make the new migration discoverable for self-hosters and
document the cloud `#?` rendering window for future readers. Update
the "known limitation" sequence-race entry in `docs/cloud-mode.md` to
reflect that the HWM mechanism supersedes the prior `max+1` race.

**Requirements.** R7 (preserves PRO-68 §8 invariants — by way of clear
documentation of what changed and what didn't).

**Dependencies.** U1 (migration file must exist before the docs
reference it).

**Files.**

- Modify: `scripts/apply-migrations.sh` — add `0009_sequence_hwm.sql`
  to the inline migration list comment (lines 16-23). The `for
  migration in "$MIGRATIONS_DIR"/*.sql` glob loop picks up `0009`
  automatically — no script logic change required.
- Modify: `docs/self-hosting.md` — append a `supabase/migrations/0009_sequence_hwm.sql`
  line to the Step 2 migration list (lines 62-71) plus a one-paragraph
  description matching the style of the `0007` / `0008` entries:
  "Adds the per-project HWM meta table and replaces the trigger body
  with read-and-bump semantics so deleting the highest-numbered
  comment no longer recycles its number."
- Modify: `docs/cloud-mode.md` — add `0009_sequence_hwm.sql` to the
  Schema paragraph (line 18). **Replace** the "Sequence-number race
  window" Known-limitations entry (line 132) with an entry describing
  the HWM-backed contract and noting the `#?` placeholder window for
  the ~1 RTT after a cloud INSERT. Update `migrateFromLocal` Known-
  limitations entry (line 133) to reflect that client sequence
  numbers are now preserved (no longer dropped), with the trigger
  fast-forward as the guard.
- Modify: `docs/architecture.md` — extend the "Sequence numbers"
  section (lines 159-162) with a brief paragraph: "Cloud rows briefly
  render `#?` between the local insert and the server's
  `RETURNING`/realtime echo carrying the assigned `sequence_number`.
  Markers and drawer cards use the same `?` fallback path that covers
  pre-PRO-68 legacy rows."

**Approach.** Pure documentation edits. No code change. Match each
file's existing tone, sentence length, and citation style (linking to
the spec / data-model with relative paths).

**Patterns to follow.** Existing migration list entries in
`docs/self-hosting.md:62-71` and `docs/cloud-mode.md:18` are the
template. Existing "Known limitations" entries in `docs/cloud-mode.md`
end with a forward-looking note ("If duplicates appear in production,
add the unique constraint deferrable initially deferred...") — match
that style.

**Test scenarios.**

Test expectation: none — docs-only unit. Verification is reviewer
read-through.

**Verification.**
- `grep 0009 scripts/apply-migrations.sh docs/self-hosting.md docs/cloud-mode.md`
  returns matches in all three files.
- `grep "#?" docs/architecture.md` returns the new placeholder
  paragraph.
- `bun run check` + `bun run lint` clean (no code touched, expected
  pass).

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
| ---- | ------ | ---------- |
| `Store.save()` bump-before-persist crashes between the HWM bump and the row write, leaving a gap in the sequence. | Low — gaps are normal and expected per spec §8 (and per the cloud-side semantics where deletes also leave gaps). | None needed. The opposite ordering would risk duplicate-on-crash which violates R1 — gap is strictly better. Documented in Key Technical Decisions. |
| `0009` re-applied against a project whose top row was deleted between applications would lower `next_sequence_number` if naively backfilled. | High if it happened — violates R1 at the server. | The backfill uses `on conflict do update set next_sequence_number = greatest(existing, excluded)`. The `greatest()` clause guarantees the slot never goes backwards on re-apply. Verified in U1 test scenarios. |
| `migrateFromLocal` carrying client `sequenceNumber` collides with an existing cloud row's number for the same project. | Medium — the unique partial index from `0008` rejects the duplicate with a `23505` error, the migrate POST returns 4xx, the localStorage row stays in local-only mode. | Already mitigated by the unique index. The migrate path is `resolution=ignore-duplicates` on the PK only; sequence-number collisions are a separate failure mode. Acceptable for v1; documented in `docs/cloud-mode.md` "Known limitations". Follow-up: if it happens in practice, the migrate path could `null` out the `sequence_number` on collision and retry. |
| `CloudStore` realtime-echo carve-out (replacing the cache entry when the local row is missing `sequenceNumber`) accidentally drops local-only mutations made between the optimistic insert and the echo. | Low — the cache entry is replaced with `rowToRecord(row)` which carries the server's authoritative state. Any local mutation in the window would have been a no-op or already PATCHed via `updateStatus` / `updateAnchor`. | Inspect the cache entry diff in U3 — confirm we only replace when the cache row is missing `sequenceNumber`. Skip if the cache row has been touched since insert (e.g. `updateStatus` ran). Implementer judgment call. |
| `buildRecord` signature change is a breaking internal API. | None external (function not exported as part of the package surface; only `src/cloud-store.ts` and `src/store.ts` call it). | Update both call sites in U2 / U3. `bun run check` catches any miss. |
| Self-hoster forgets to apply `0009` and continues running the defective `0007/0008` trigger. | Medium — the defect persists silently; no error, just wrong-`#N` behavior on delete. | The migration list in `scripts/apply-migrations.sh` is the canonical apply path; U4 adds `0009` to it AND to the doc list. The doc paragraph explicitly calls out the delete-recycle bug fix so anyone reading the changelog understands why `0009` matters. |

## Open Questions

1. **`CloudStore.save` sequence handling — option 1 vs option 2** in U3.
   Recommend the realtime-echo carve-out (option 1, see U3 step 3),
   but the implementer may pick the POST-response-parse path (option
   2) if the carve-out turns out to be invasive. Either is correct.
2. **`Store` constructor: do we need to verify the existing HWM key
   value is `>=` the post-backfill max?** Spec §8 says "seed the key
   when absent". It does NOT say what to do if the HWM key exists but
   is *less than* `max(rows.sequenceNumber)`. This could happen if a
   reviewer manually edited their localStorage. Recommend: at
   constructor time, if the HWM key exists, bump it to
   `max(existing, max(rows.sequenceNumber) + 1)` as a self-healing
   measure. Decision deferred to implementer; flag in the PR review
   if pursued.
3. **`docs/cloud-mode.md` "Known limitations" entry for the v1 race
   window** (line 132) — should it be deleted outright or rewritten
   to describe the new contract? Recommend rewrite — readers who
   linked to the section anchor still land on something sensible.

## Verification Checklist

Before claiming PRO-81 done:

- [ ] `bun run check` clean.
- [ ] `bun run lint` clean.
- [ ] `bun run build` produces a `dist/w.js` of approximately the
      same size as the pre-PRO-81 build (no unexpected bloat).
- [ ] All R1–R7 spec verification scenarios from spec §8 "Verification
      (delta from PRO-68 main verification)" pass via manual browser
      smoke (workflow Step 5).
- [ ] U1 idempotency probe: `0009` applied twice without error,
      meta-table state identical.
- [ ] U2 localStorage smoke: delete-the-highest issues `+1`, not
      recycle; clear-then-create preserves HWM.
- [ ] U3 cloud smoke: `#?` placeholder appears briefly, transitions
      to real `#N`; cross-browser parity holds.
- [ ] U4 docs: every reference to migrations 0007/0008 is accompanied
      by 0009 in the same list / paragraph.
