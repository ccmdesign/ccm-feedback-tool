-- Widens the `status` CHECK constraint on ccm_widget_annotations to add the
-- agent loop's `review` status (handled-but-unverified).
--
-- Runs AFTER 0001/0002/0003. The `status` column already exists (added in
-- 0002 with check (status in ('todo','done','question'))). Postgres cannot
-- alter a CHECK constraint in place, so this drops the existing constraint
-- (Supabase auto-named it `ccm_widget_annotations_status_check`) if present
-- and re-adds it with `review` included. Default stays 'todo'; existing rows
-- are unaffected.
--
-- Idempotent: safe to re-run. `drop constraint if exists` + a guarded
-- `add constraint` (skipped when an equivalent check already exists) mean a
-- second run is a no-op. Mirrors the guarded-DDL style of 0002/0003.

do $$
begin
  -- Drop the existing status CHECK (whatever its current definition) so we
  -- can re-add it widened. `if exists` keeps this safe on a fresh project
  -- where 0002 may have used the same auto-generated name.
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ccm_widget_annotations'::regclass
      and conname = 'ccm_widget_annotations_status_check'
  ) then
    alter table public.ccm_widget_annotations
      drop constraint ccm_widget_annotations_status_check;
  end if;

  -- Re-add the widened constraint only if it isn't already present (a prior
  -- run of this migration may have created it under the same name).
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ccm_widget_annotations'::regclass
      and conname = 'ccm_widget_annotations_status_check'
  ) then
    alter table public.ccm_widget_annotations
      add constraint ccm_widget_annotations_status_check
      check (status in ('todo', 'done', 'question', 'review'));
  end if;
end
$$;
