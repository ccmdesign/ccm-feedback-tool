-- Enables Supabase Realtime broadcasting for ccm_widget_annotations.
-- - Adds the table to the supabase_realtime publication so INSERT/UPDATE/DELETE
--   events stream over the realtime websocket.
-- - REPLICA IDENTITY FULL so DELETE events include the project_name column
--   (required for the widget's project_name=eq.<project> filter to match deletes).

alter table public.ccm_widget_annotations replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ccm_widget_annotations'
  ) then
    execute 'alter publication supabase_realtime add table public.ccm_widget_annotations';
  end if;
end
$$;
