-- Diagnostic: verify the RLS posture on ccm_widget_annotations.
--
-- Run this in the Supabase SQL editor. It runs each query under both the
-- service-role and anon roles so you can compare what the public anon key
-- can actually do.
--
-- Reads: should return a count.
-- Writes: success = the policy allowed it. Use this to confirm tightened
--   policies are working before pointing your widget at the project.
--
-- Cleanup at the bottom removes any test rows this script inserted.

-- 1. Confirm RLS is enabled.
select
  schemaname,
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename = 'ccm_widget_annotations';

-- 2. List active policies.
select
  policyname,
  cmd as operation,
  roles,
  qual as using_clause,
  with_check as with_check_clause
from pg_policies
where schemaname = 'public'
  and tablename = 'ccm_widget_annotations'
order by cmd, policyname;

-- 3. As service_role: total row count (bypasses RLS).
set role service_role;
select count(*) as total_rows_service_role from public.ccm_widget_annotations;

-- 4. As anon: read count (subject to RLS).
set role anon;
select count(*) as readable_rows_anon from public.ccm_widget_annotations;

-- 5. As anon: try to insert a probe row.
do $$
declare
  inserted_id uuid;
begin
  insert into public.ccm_widget_annotations (project_name, message, url)
  values ('__rls_probe__', '__rls_probe__', 'https://check-rls.local')
  returning id into inserted_id;

  raise notice 'anon INSERT succeeded (id=%)', inserted_id;
exception
  when insufficient_privilege then
    raise notice 'anon INSERT blocked by RLS (good if you tightened policies)';
  when others then
    raise notice 'anon INSERT failed: % %', sqlstate, sqlerrm;
end $$;

-- 6. As anon: try to update an existing row (any row).
set role anon;
do $$
declare
  affected int;
begin
  update public.ccm_widget_annotations
  set message = message
  where true;
  get diagnostics affected = row_count;
  raise notice 'anon UPDATE affected % row(s) (0 means RLS blocked it)', affected;
exception
  when insufficient_privilege then
    raise notice 'anon UPDATE blocked by RLS';
end $$;

-- 7. As anon: try to delete an existing row.
do $$
declare
  affected int;
begin
  delete from public.ccm_widget_annotations
  where project_name = '__rls_probe__';
  get diagnostics affected = row_count;
  raise notice 'anon DELETE affected % row(s) (0 means RLS blocked it)', affected;
exception
  when insufficient_privilege then
    raise notice 'anon DELETE blocked by RLS';
end $$;

-- 8. Cleanup probe rows (as service_role to bypass any tightened policies).
reset role;
delete from public.ccm_widget_annotations where project_name = '__rls_probe__';

-- Interpretation:
--   - All 4 ops succeed for anon  -> permissive (default 0001 baseline). OK
--     for staging, NOT OK for public production.
--   - Read+insert succeed, update+delete blocked  -> good production posture
--     for review-only workflow (e.g. 0005_strict_rls).
--   - All 4 ops blocked for anon  -> table is unreachable from the widget;
--     check that your project_name matches the allowlist.
