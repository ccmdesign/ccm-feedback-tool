-- PRO-81 §8 — persistent per-project sequence high-water mark.
--
-- Why this migration exists.
--
-- 0007 + 0008 issue `next = max(sequence_number) + 1` per project from inside
-- the BEFORE INSERT trigger. That recipe recycles a number whenever the
-- current highest-numbered top-level row is deleted — `#1, #2, #3` → delete
-- `#3` → next insert is `#3` again, not `#4`. The spec (docs/fab-toolbar-
-- tweaks.md §8 "Delete-behavior contract") requires the next-to-issue number
-- to live in its own persisted slot that is **never decremented** by any
-- code path (single delete, cascade delete, bulk clear, undo).
--
-- This migration introduces that slot as a per-project meta row and replaces
-- the trigger body with read-and-bump semantics against it. The advisory
-- lock from 0008 stays in place as the serializer; the unique partial index
-- from 0008 stays in place as the safety net. Idempotent: re-runs use
-- `greatest()` so backfill cannot lower an already-advanced slot.

-- Per-project sequence high-water mark. One row per project; the
-- next_sequence_number column holds the number that the next top-level
-- insert will receive.
create table if not exists public.ccm_widget_project_meta (
  project_name text primary key,
  next_sequence_number bigint not null default 1,
  updated_at timestamptz not null default now()
);

-- Backfill. Seed each existing project's slot with max(sequence_number) + 1.
-- The `greatest()` clause on conflict makes the migration safe to re-apply
-- after rows have been deleted between applications: the slot never goes
-- backwards on re-run even if `max(sequence_number)` did.
insert into public.ccm_widget_project_meta (project_name, next_sequence_number)
select project_name, coalesce(max(sequence_number), 0) + 1
  from public.ccm_widget_annotations
 where parent_id is null
 group by project_name
on conflict (project_name) do update
  set next_sequence_number = greatest(
        public.ccm_widget_project_meta.next_sequence_number,
        excluded.next_sequence_number);

-- RLS posture matches ccm_widget_annotations from 0001: permissive `using
-- (true) with check (true)` so the anon role can lazy-insert + bump the
-- meta row from inside the trigger that runs as the inserting role.
alter table public.ccm_widget_project_meta enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'ccm_widget_project_meta'
       and policyname = 'ccm_widget_project_meta_all'
  ) then
    create policy ccm_widget_project_meta_all on public.ccm_widget_project_meta
      for all using (true) with check (true);
  end if;
end $$;

-- Replacement trigger body. Same name as 0007/0008 — `create or replace
-- function` propagates through the existing `ccm_widget_assign_sequence_trg`
-- binding installed by 0007, so no `drop trigger / create trigger` dance.
--
-- Semantics:
--   - Replies (`parent_id is not null`) are skipped entirely; they neither
--     consume a number nor bump the slot.
--   - Top-level inserts take the advisory lock (carried from 0008) to
--     serialize concurrent inserters per project.
--   - The meta row is lazy-inserted if absent (first insert for an
--     unseen project), then atomically incremented with the returning
--     clause yielding the value the new row should take.
--   - If the client supplied null `sequence_number`, the row gets the
--     just-issued slot value.
--   - If the client supplied a non-null `sequence_number >= next_seq`
--     (migrateFromLocal carrying canonical local numbers), the row keeps
--     its supplied value and the slot is fast-forwarded so future
--     inserts don't collide. The `next_sequence_number <= ...` guard
--     prevents accidentally lowering the slot if a concurrent insert
--     already bumped past the supplied value.
create or replace function public.ccm_widget_assign_sequence()
returns trigger
language plpgsql
as $$
declare
  next_seq bigint;
begin
  if new.parent_id is not null then
    return new;
  end if;
  -- Serialize concurrent INSERTs on the same project (carried from 0008).
  perform pg_advisory_xact_lock(hashtext('ccm_widget_seq:' || new.project_name));
  -- Lazy-create the meta row for projects with no prior top-level insert.
  insert into public.ccm_widget_project_meta (project_name, next_sequence_number)
    values (new.project_name, 1)
    on conflict (project_name) do nothing;
  -- Atomic read-and-bump inside the lock.
  update public.ccm_widget_project_meta
     set next_sequence_number = next_sequence_number + 1,
         updated_at = now()
   where project_name = new.project_name
   returning next_sequence_number - 1 into next_seq;
  if new.sequence_number is null then
    new.sequence_number := next_seq;
  elsif new.sequence_number >= next_seq then
    -- Fast-forward: client supplied a number at or above the slot
    -- (e.g. migrateFromLocal carrying a #70 when the slot was at #5).
    -- Bump the slot to supplied+1 so future inserts don't collide.
    update public.ccm_widget_project_meta
       set next_sequence_number = new.sequence_number + 1,
           updated_at = now()
     where project_name = new.project_name
       and next_sequence_number <= new.sequence_number;
  end if;
  return new;
end;
$$;

-- Trigger binding itself is unchanged from 0007 — function replacement
-- propagates through the existing `ccm_widget_assign_sequence_trg`.
