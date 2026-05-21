-- 0006_replies.sql — self-referential parent for reply rows (PRO-66).
--
-- Replies are degenerate annotation rows: identity + body fields populated,
-- everything spatial left at column defaults. The widget renders them only
-- inside the parent comment's popover; they never become markers or work
-- items in the agent ingestion path. See docs/replies.md.
--
-- on delete cascade: deleting a parent removes its replies server-side.
-- REPLICA IDENTITY FULL (migration 0003) ensures each cascaded DELETE still
-- emits a realtime event carrying project_name + parent_id so other open
-- clients stay consistent.
--
-- Type drift handling: migration 0001 declares `id uuid`, but at least one
-- live project (the maintainer's demo) has `id text` — likely the result of
-- an earlier ad-hoc schema tweak before migrations were tracked. PostgreSQL
-- refuses self-referential FKs across incompatible types, so this migration
-- inspects information_schema at apply time and adds `parent_id` with the
-- matching type (`uuid` on a clean 0001→0006 install, `text` on the drifted
-- demo). The widget stores `crypto.randomUUID()` strings either way; both
-- column types accept uuid-shaped values without issue.
--
-- Idempotency: `add column if not exists` makes re-runs safe. On prod, where
-- `parent_id text` already exists with the FK + index, the DO block detects
-- the existing column type, executes the matching `add column if not exists`
-- which no-ops, and exits cleanly.
--
-- RLS: existing anon policies are using (true) / with check (true) — they
-- cover reply rows with no policy change. Tightened policies (see
-- prompts/harden-rls.md) must permit parent_id-bearing inserts.

do $$
declare
  id_type text;
begin
  select data_type
    into id_type
    from information_schema.columns
   where table_schema = 'public'
     and table_name   = 'ccm_widget_annotations'
     and column_name  = 'id';

  if id_type is null then
    raise exception
      'ccm_widget_annotations.id not found — apply 0001_init.sql first';
  end if;

  if id_type = 'uuid' then
    execute $sql$
      alter table public.ccm_widget_annotations
        add column if not exists parent_id uuid
          references public.ccm_widget_annotations(id) on delete cascade
    $sql$;
  elsif id_type = 'text' then
    execute $sql$
      alter table public.ccm_widget_annotations
        add column if not exists parent_id text
          references public.ccm_widget_annotations(id) on delete cascade
    $sql$;
  else
    raise exception
      'ccm_widget_annotations.id has unsupported type %, expected uuid or text',
      id_type;
  end if;
end$$;

create index if not exists ccm_widget_annotations_parent_idx
  on public.ccm_widget_annotations (parent_id);
