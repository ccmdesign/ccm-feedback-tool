# PRO-68 — Sequence-number trigger has no concurrent-insert hardening

**Severity:** P2 (per reviewer task brief) / accepted v1 limitation (per plan)
**Owner:** downstream-resolver (follow-up migration)
**Files:** `supabase/migrations/0007_sequence_number.sql:51-74`

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

## Why this matters

Conflict between task brief and plan. The plan defers as a non-goal;
the brief says "must." Decide which contract applies.

## Recommended next step

Either:

1. **Apply hardening now** (follow-up migration `0008_sequence_unique.sql`):
   ```sql
   -- Option A: serialize via advisory lock inside the trigger
   create or replace function public.ccm_widget_assign_sequence()
   returns trigger language plpgsql as $$
   begin
     if new.parent_id is not null then return new; end if;
     perform pg_advisory_xact_lock(hashtext('ccm_widget_seq:' || new.project_name));
     if new.sequence_number is null then
       select coalesce(max(sequence_number), 0) + 1
         into new.sequence_number
         from public.ccm_widget_annotations
         where project_name = new.project_name
           and parent_id is null;
     end if;
     return new;
   end;
   $$;

   -- Option B: add the unique constraint deferrable initially deferred
   alter table public.ccm_widget_annotations
     add constraint ccm_widget_annotations_project_seq_uq
     unique (project_name, sequence_number)
     deferrable initially deferred;
   ```

2. **Accept the documented v1 limitation** per the plan and close this
   todo with a PR-description note.

Not auto-applied: schema change, behavior-significant, and explicitly
deferred by the plan.
