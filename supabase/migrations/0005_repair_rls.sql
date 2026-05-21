-- Repairs anon RLS on ccm_widget_annotations (PRO-65).
--
-- The "anon update" policy declared in 0001_init.sql allows the anon role to
-- update any row in the project namespace (using (true) with check (true)).
-- On at least one live Supabase project this policy was missing or altered,
-- causing PATCH requests with the anon key to return HTTP 200 with
-- content-range: */0 (zero rows affected). Anon SELECT was unaffected, which
-- is why reads looked normal but status cycles and deletes did not persist
-- across reloads. This was the root cause of the PRO-65 silent zero-row
-- PATCH regression. See PRO-65 + the commit history on this file for context.
--
-- This migration drops + re-creates all four anon policies (read/insert/
-- update/delete) with the same permissive defaults as 0001. It is
-- idempotent and safe to re-run:
--   * Fresh projects (where 0001 created the policies): drop is a no-op,
--     create re-asserts the same shape.
--   * Broken prod (anon update missing or altered): drop+create restores it.
--   * Already-repaired projects: re-running is a no-op.
--
-- Self-hosters who have tightened these policies in a follow-up migration
-- should review before applying this one — it will reset anon to the
-- permissive defaults from 0001.

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
