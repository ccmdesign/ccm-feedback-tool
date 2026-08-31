-- rls-policies.sql — hardened anon posture for the ccm feedback-layer cloud
-- backend (project qnkvkumtssihbjmocbtv).
--
-- STAGED, NOT YET APPLIED. Paste into the Supabase SQL editor (runs as
-- postgres) and execute once. Idempotent — safe to re-run.
--
-- Threat model: the anon key ships in public HTML on every site the widget
-- is installed on. Today (verified 2026-08-31 via safe API probes + the
-- migration history in supabase/migrations/) anon holds permissive
-- using(true)/with check(true) policies for ALL FOUR verbs on
-- ccm_widget_annotations, plus a `for all using(true)` policy on
-- ccm_widget_project_meta. Anyone with the key can read, rewrite, or bulk-
-- delete every comment across every project.
--
-- What the widget code (src/cloud-store.ts) actually needs from anon:
--   SELECT  — init() project load + Supabase Realtime change feed
--   INSERT  — save() new comment, addReply() reply, migrateFromLocal()
--             (POST with Prefer: resolution=ignore-duplicates = ON CONFLICT
--             DO NOTHING — needs INSERT only, never UPDATE)
--   UPDATE  — updateStatus() (status column) and updateAnchor() (anchor/
--             geometry columns + kind). Nothing else is ever PATCHed.
--   DELETE  — delete comment, delete reply, "clear all" (drawer). All by id.
--
-- Posture after this file:
--   - RLS enabled (re-asserted) on both tables.
--   - anon SELECT: kept (required by init + realtime). Tradeoff: any key
--     holder can still read all projects' feedback — acceptable for this
--     tool; scope with a project_name allowlist later if needed (see
--     migrations-optional/0005_strict_rls.sql.example).
--   - anon INSERT: kept, with basic size sanity checks.
--   - anon UPDATE: kept but COLUMN-SCOPED via grants to exactly the columns
--     pushUpdate() touches. Anon can no longer rewrite message, author_name,
--     project_name, url, created_at, parent_id, sequence_number, or id.
--   - anon DELETE: kept — TRADEOFF, documented below.
--   - ccm_widget_project_meta: locked away from anon entirely; the sequence
--     trigger becomes SECURITY DEFINER so inserts still get their #N.
--
-- NOTE: re-running migrations/0005_repair_rls.sql (or 0001) AFTER this file
-- resets annotations to the permissive defaults. This file supersedes them;
-- re-apply it last.

-- ---------------------------------------------------------------------------
-- 0. Row Level Security on (idempotent re-assert).
-- ---------------------------------------------------------------------------
alter table public.ccm_widget_annotations enable row level security;
alter table public.ccm_widget_project_meta enable row level security;

-- ---------------------------------------------------------------------------
-- 1. Table privileges (the column-level layer under RLS).
--    Supabase's default grants give anon/authenticated ALL on public tables;
--    strip that, then grant back only what the widget uses. service_role is
--    untouched (it bypasses RLS and keeps its own grants).
-- ---------------------------------------------------------------------------
revoke all on table public.ccm_widget_annotations from anon, authenticated;
revoke all on table public.ccm_widget_project_meta from anon, authenticated;

-- SELECT: init() load, realtime feed, and Prefer: return=representation on
-- writes (representation requires SELECT privilege).
grant select on table public.ccm_widget_annotations to anon;

-- INSERT: new comments, replies, localStorage migration.
grant insert on table public.ccm_widget_annotations to anon;

-- UPDATE: column-scoped to exactly what src/cloud-store.ts pushUpdate()
-- sends — updateStatus() patches {status}; updateAnchor() patches the
-- anchor group + geometry + kind + pin/area. A PATCH naming any other
-- column (message, author_name, project_name, sequence_number, ...) now
-- fails with 42501 for anon. If a future feature PATCHes a new column,
-- add it here.
grant update (
  status,
  kind,
  css_selector,
  xpath,
  text_snippet,
  element_tag,
  element_id,
  text_prefix,
  text_suffix,
  fingerprint,
  neighbor_text,
  x_pct,
  y_pct,
  w_pct,
  h_pct,
  pin_x,
  pin_y,
  area_x,
  area_y,
  area_w,
  area_h
) on table public.ccm_widget_annotations to anon;

-- DELETE: required by three real widget features (delete comment, delete
-- reply, drawer "clear all"), all issued as id-targeted DELETEs.
-- TRADEOFF: the widget has no auth identity, so delete cannot be scoped to
-- "own rows" — any anon key holder can delete any row. This is inherent to
-- the current anonymous design; the mitigations available later are a
-- localStorage author_token column (UX guard, not security) or moving
-- destructive verbs behind a signed endpoint. Accepting the tradeoff keeps
-- the delete/clear features working.
grant delete on table public.ccm_widget_annotations to anon;

-- ---------------------------------------------------------------------------
-- 2. Policies on ccm_widget_annotations (row-level layer).
-- ---------------------------------------------------------------------------
drop policy if exists "anon read"   on public.ccm_widget_annotations;
drop policy if exists "anon insert" on public.ccm_widget_annotations;
drop policy if exists "anon update" on public.ccm_widget_annotations;
drop policy if exists "anon delete" on public.ccm_widget_annotations;

-- Read: all rows. Required by init() (project-filtered client-side) and by
-- Supabase Realtime, which enforces the SELECT policy on change events.
create policy "anon read"
  on public.ccm_widget_annotations
  for select
  to anon
  using (true);

-- Insert: any project (new sites onboard without a SQL change), with size
-- sanity checks generous enough that no legitimate widget payload —
-- including migrateFromLocal of old long comments — is rejected.
create policy "anon insert"
  on public.ccm_widget_annotations
  for insert
  to anon
  with check (
    char_length(message) between 1 and 20000
    and char_length(project_name) between 1 and 120
    and char_length(author_name) between 0 and 120
  );

-- Update: row-level pass-through; the real restriction is the column-level
-- grant above (only status/anchor/geometry/kind are updatable).
create policy "anon update"
  on public.ccm_widget_annotations
  for update
  to anon
  using (true)
  with check (true);

-- Delete: row-level pass-through — see the TRADEOFF note on the grant.
create policy "anon delete"
  on public.ccm_widget_annotations
  for delete
  to anon
  using (true);

-- ---------------------------------------------------------------------------
-- 3. ccm_widget_project_meta — remove anon's direct access entirely.
--    The only legitimate writer is the ccm_widget_assign_sequence() BEFORE
--    INSERT trigger (migrations 0007/0009). Today it runs as the invoking
--    role (anon), which is why the meta table had to be anon-writable.
--    Making the function SECURITY DEFINER (owner: postgres) lets the
--    trigger keep issuing #N sequence numbers while anon loses all direct
--    read/write on the table. Widget feature preserved: sequence numbers on
--    new comments (the client never queries this table itself).
-- ---------------------------------------------------------------------------
drop policy if exists ccm_widget_project_meta_all on public.ccm_widget_project_meta;

alter function public.ccm_widget_assign_sequence()
  security definer
  set search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- 4. Verify (also see supabase/scripts/check-rls.sql):
--    - anon SELECT/INSERT succeed; PATCH on status succeeds; PATCH on
--      message returns 42501; meta table GET returns 42501/permission denied.
--    - Insert into a fresh project still gets sequence_number = 1.
-- ---------------------------------------------------------------------------
