-- Newer Supabase projects no longer hand table privileges to the API roles by
-- default, so a signed-in device could pass RLS and still hit "permission
-- denied". Grant exactly what sync needs; RLS keeps every row to its owner.
grant select, insert, update on table public.sync_rows to authenticated;

-- Nothing in the app deletes or truncates. TRUNCATE in particular ignores RLS,
-- so no client role should hold it.
revoke all on table public.sync_rows from anon;
revoke delete, truncate, references, trigger on table public.sync_rows from authenticated;
