-- Baseline schema for the ccm-feedback widget cloud mode.
--
-- Creates the ccm_widget_annotations table with the columns the widget
-- writes by default. Subsequent migrations layer on additional features:
--   0002_status_pin_area.sql -> status, kind, pin/area coords, captured_elements
--   0003_realtime.sql        -> realtime publication + REPLICA IDENTITY FULL
--
-- Run this against your Supabase project (or self-hosted Postgres) before the
-- later migrations: `supabase db push`, or paste into the SQL editor.
--
-- The widget speaks raw PostgREST with the anon / publishable key. RLS is
-- enabled here with permissive defaults so the public anon key can read and
-- write within a single project_name namespace. Self-hosters who need
-- tighter rules (per-author writes, signed JWTs, etc.) should replace the
-- policies in a follow-up migration.

create extension if not exists "pgcrypto";

create table if not exists public.ccm_widget_annotations (
  id              uuid primary key default gen_random_uuid(),
  project_name    text not null,
  message         text not null,
  author_name     text not null default 'Anonymous',
  url             text not null,
  path            text not null default '/',
  viewport        text not null default '',
  user_agent      text not null default '',
  -- DOM anchor (4-strategy resolver)
  css_selector    text not null default '',
  xpath           text not null default '',
  text_snippet    text not null default '',
  element_tag     text not null default '',
  element_id      text,
  text_prefix     text not null default '',
  text_suffix     text not null default '',
  fingerprint     text not null default '',
  neighbor_text   text not null default '',
  -- Position relative to anchor element bounding box (0..1)
  x_pct           double precision not null default 0,
  y_pct           double precision not null default 0,
  w_pct           double precision not null default 0,
  h_pct           double precision not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists ccm_widget_annotations_project_idx
  on public.ccm_widget_annotations (project_name);

create index if not exists ccm_widget_annotations_path_idx
  on public.ccm_widget_annotations (project_name, path);

create index if not exists ccm_widget_annotations_created_idx
  on public.ccm_widget_annotations (created_at desc);

alter table public.ccm_widget_annotations enable row level security;

-- Permissive defaults: anon role can read and write any row.
-- Tighten these for production by scoping to authenticated JWT claims, a
-- per-project secret, or signed write tokens.
drop policy if exists "anon read"   on public.ccm_widget_annotations;
drop policy if exists "anon insert" on public.ccm_widget_annotations;
drop policy if exists "anon update" on public.ccm_widget_annotations;
drop policy if exists "anon delete" on public.ccm_widget_annotations;

create policy "anon read"
  on public.ccm_widget_annotations
  for select
  to anon
  using (true);

create policy "anon insert"
  on public.ccm_widget_annotations
  for insert
  to anon
  with check (true);

create policy "anon update"
  on public.ccm_widget_annotations
  for update
  to anon
  using (true)
  with check (true);

create policy "anon delete"
  on public.ccm_widget_annotations
  for delete
  to anon
  using (true);
