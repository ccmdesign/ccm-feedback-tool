# PRO-68 — Sequence-number trigger has no concurrent-insert hardening

**Status:** RESOLVED — migration `0008_sequence_unique.sql` lands both defenses (advisory lock + unique partial index).
**Severity:** P2 (per reviewer task brief) / accepted v1 limitation (per plan)
**Owner:** downstream-resolver (follow-up migration)
**Files:** `supabase/migrations/0007_sequence_number.sql:51-74`,
`supabase/migrations/0008_sequence_unique.sql` (new)

## Finding

The PRO-68 review task brief states: **"Sequence-number trigger handles
concurrent inserts safely (advisory lock or unique constraint guard)."**

The current `ccm_widget_assign_sequence` trigger does
`select coalesce(max(sequence_number), 0) + 1` with no advisory lock and
no `unique (project_name, sequence_number)` constraint. Two concurrent
INSERTs for the same `project_name` can read the same max and both pick
the same next-N, producing duplicate sequence numbers.

Both the canonical spec (`docs/fab-toolbar-tweaks.md` §8) and the plan
(`docs/pro-68-plan.md` Non-goals + Key Decision 7 + Risks #3) explicitly
accept this as a documented v1 limitation under real-world widget volumes
(single-digit concurrent reviewers, hundreds of comments per project).
The plan defers the hardening to a follow-up only if duplicates appear
in the wild.

The migration file's header comment (lines 16-23) explicitly documents
the race window and the deferral.

## Resolution

**Decision: apply hardening now via migration `0008_sequence_unique.sql`,
using both defenses (option (c) — advisory lock + unique partial index).**

The brief's P2 severity was the right call. Even with low real-world
volumes, removing the race window is cheap (one `perform pg_advisory_xact_lock`
+ a small partial index) and the unique constraint catches any future
code path that tries to write outside the trigger. Belt-and-suspenders
beats post-hoc reconciliation queries the first time duplicates surface.

### What landed

1. **`pg_advisory_xact_lock(hashtext('ccm_widget_seq:' || project_name))`**
   in the trigger body. Held for the rest of the surrounding transaction
   (auto-released on COMMIT/ROLLBACK). Serializes concurrent INSERTs for
   the same project; unrelated projects rarely collide on the hash bucket
   (and a collision only causes harmless serialization between two
   different projects' inserts).

2. **Unique partial index** on `(project_name, sequence_number) WHERE
   parent_id IS NULL`. Partial because replies legitimately carry NULL
   `sequence_number` and shouldn't participate in the uniqueness check.
   Any future writer that bypasses the trigger (SQL edit, future feature)
   gets a hard `23505 unique_violation` instead of a silent duplicate.

3. **Migration list updated** in `scripts/apply-migrations.sh`,
   `docs/self-hosting.md`, and `docs/cloud-mode.md` so self-hosters apply
   `0008` after `0007`.

### Behavior preserved

- Migration `0007`'s trigger contract is otherwise unchanged: replies
  (`parent_id IS NOT NULL`) are skipped; an explicitly-supplied non-null
  `sequence_number` (used by `migrateFromLocal`) is still respected.
- Realtime payloads, RLS policies, and the optimistic-UI client path
  (decided in the P1 todo) are unaffected.
