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
-- Type note: `parent_id` is declared `text` to match the live `id` column
-- type. Migration 0001 declares `id uuid` but at least one live project
-- (the maintainer's demo) has `id text` — likely the result of an earlier
-- ad-hoc schema tweak before migrations were tracked. PostgreSQL refuses
-- self-referential FKs across incompatible types, so `parent_id` mirrors
-- the live type. The widget stores `crypto.randomUUID()` strings either
-- way; the text column accepts uuid-shaped values without issue.
--
-- RLS: existing anon policies are using (true) / with check (true) — they
-- cover reply rows with no policy change. Tightened policies (see
-- prompts/harden-rls.md) must permit parent_id-bearing inserts.

alter table public.ccm_widget_annotations
  add column if not exists parent_id text
    references public.ccm_widget_annotations(id) on delete cascade;

create index if not exists ccm_widget_annotations_parent_idx
  on public.ccm_widget_annotations (parent_id);
