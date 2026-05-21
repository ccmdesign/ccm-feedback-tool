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
-- RLS: existing anon policies are using (true) / with check (true) — they
-- cover reply rows with no policy change. Tightened policies (see
-- prompts/harden-rls.md) must permit parent_id-bearing inserts.

alter table public.ccm_widget_annotations
  add column if not exists parent_id uuid
    references public.ccm_widget_annotations(id) on delete cascade;

create index if not exists ccm_widget_annotations_parent_idx
  on public.ccm_widget_annotations (parent_id);
