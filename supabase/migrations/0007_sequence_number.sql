-- PRO-68 §8 — persistent comment sequence numbers.
--
-- Adds a project-scoped monotonic identifier to every top-level annotation.
-- The number is assigned once at INSERT time and never reused. Replies
-- (rows with `parent_id` set) are excluded from the sequence; their
-- `sequence_number` stays NULL.
--
-- Counting rule: `next = max(sequence_number) + 1` per `project_name`,
-- considering only rows where `parent_id IS NULL`. Deleted comments still
-- consume their number — gaps are normal and expected (#67 stays #67
-- forever).
--
-- Backfill: existing top-level rows get numbered by `created_at, id` order
-- per project. The trigger then maintains the invariant for all future
-- inserts.
--
-- Race window: two concurrent INSERTs for the same project may briefly
-- read the same max() in their respective triggers and pick the same
-- next-N. v1 accepts this — no `unique (project_name, sequence_number)`
-- constraint. Under real-world widget volumes (single-digit concurrent
-- reviewers, hundreds of comments per project) this hasn't been observed.
-- Follow-up: add the unique constraint deferrable initially deferred if
-- duplicates appear in the wild.

alter table public.ccm_widget_annotations
  add column if not exists sequence_number bigint;

-- Backfill: number existing rows per project by creation order. Replies
-- are excluded — their sequence_number stays NULL.
with ordered as (
  select id,
         row_number() over (
           partition by project_name
           order by created_at, id
         ) as seq
  from public.ccm_widget_annotations
  where parent_id is null
)
update public.ccm_widget_annotations a
  set sequence_number = o.seq
  from ordered o
  where a.id = o.id
    and a.sequence_number is null;

create index if not exists ccm_widget_annotations_project_seq_idx
  on public.ccm_widget_annotations (project_name, sequence_number);

-- BEFORE INSERT trigger function — assigns next sequence number per
-- project, skipping replies and respecting any explicitly-supplied value
-- (used by `migrateFromLocal` paths that want to carry over local numbers).
create or replace function public.ccm_widget_assign_sequence()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is not null then
    return new;
  end if;
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

drop trigger if exists ccm_widget_assign_sequence_trg
  on public.ccm_widget_annotations;
create trigger ccm_widget_assign_sequence_trg
  before insert on public.ccm_widget_annotations
  for each row execute function public.ccm_widget_assign_sequence();
