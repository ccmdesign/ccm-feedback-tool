-- PRO-68 §8 — concurrent-insert hardening for `ccm_widget_assign_sequence`.
--
-- The trigger added in 0007 reads `max(sequence_number) + 1` per project to
-- assign the next sequence number. Two concurrent INSERTs for the same
-- project can both read the same max() and both pick the same next-N,
-- producing duplicates. 0007 explicitly accepted that race as a v1
-- limitation; this migration closes it.
--
-- Two defenses, applied together:
--
-- 1. **Advisory transaction lock** (`pg_advisory_xact_lock(hashtext(...))`)
--    serializes concurrent INSERTs that share a `project_name`. The lock
--    is held for the rest of the surrounding transaction and released
--    automatically on COMMIT/ROLLBACK — no manual unlock needed. This
--    eliminates the read-then-write race window inside the trigger body.
--
-- 2. **Unique partial index** on `(project_name, sequence_number) WHERE
--    parent_id IS NULL` is a safety net. If a future code path (or a SQL
--    edit outside the trigger) tries to insert a duplicate, Postgres
--    rejects it with `23505 unique_violation` rather than silently
--    accepting two rows with the same `#N`. Partial because replies
--    intentionally carry NULL `sequence_number`, and `(NULL, NULL)` would
--    otherwise be unique by default but is noise here — the partial
--    predicate keeps the index tight.
--
-- Order matters: the index is created BEFORE the trigger function is
-- redefined so that if backfill from 0007 left any duplicates (it should
-- not, since `row_number()` partitions per project), this migration will
-- fail loudly with the violating rows. If that happens, run a manual
-- reconciliation query before re-applying.

-- Safety-net unique index. Partial: top-level rows only. Replies keep
-- NULL sequence_number; including them would force a no-op uniqueness
-- check on (project_name, NULL) pairs.
create unique index if not exists ccm_widget_annotations_project_seq_uq
  on public.ccm_widget_annotations (project_name, sequence_number)
  where parent_id is null;

-- Trigger function with advisory lock. Behavior otherwise unchanged from
-- 0007: respects an explicitly-supplied non-null `sequence_number`
-- (migration path), skips replies entirely.
create or replace function public.ccm_widget_assign_sequence()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is not null then
    return new;
  end if;
  -- Serialize concurrent INSERTs on the same project. `hashtext` collapses
  -- the project_name to a 32-bit int, which is what the single-arg
  -- advisory-lock APIs accept. Hash collisions across projects only
  -- mean two unrelated projects serialize occasionally — harmless.
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

-- Trigger binding itself is unchanged from 0007 — function replacement
-- propagates through the existing `ccm_widget_assign_sequence_trg`
-- without needing a drop/recreate.
