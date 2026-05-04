-- Adds status, kind, coord-pin (pin_x/pin_y), area (area_x/area_y/area_w/area_h),
-- and captured_elements (jsonb of agent-context DOM snapshots) to the
-- ccm_widget_annotations table.
--
-- Run this against your Supabase project before shipping a build that uses
-- the Pin / Area FAB items or comment status. Existing rows default to
-- status='todo' and kind='target'.

alter table public.ccm_widget_annotations
  add column if not exists status text not null default 'todo'
    check (status in ('todo', 'done', 'question')),
  add column if not exists kind text not null default 'target'
    check (kind in ('target', 'pin', 'area')),
  add column if not exists pin_x double precision,
  add column if not exists pin_y double precision,
  add column if not exists area_x double precision,
  add column if not exists area_y double precision,
  add column if not exists area_w double precision,
  add column if not exists area_h double precision,
  add column if not exists captured_elements jsonb;

create index if not exists ccm_widget_annotations_status_idx
  on public.ccm_widget_annotations (status);
create index if not exists ccm_widget_annotations_kind_idx
  on public.ccm_widget_annotations (kind);
