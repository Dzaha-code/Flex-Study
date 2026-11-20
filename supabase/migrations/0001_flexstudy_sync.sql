-- FlexStudy sync: one table of rows per user, last write wins, realtime fan-out.
-- Run once in the Supabase SQL editor (or with `supabase db push`).

create table if not exists public.sync_rows (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text        not null,
  id         text        not null,
  data       jsonb,
  updated_at timestamptz not null,
  deleted    boolean     not null default false,
  -- The server's own clock. Clients page by this, never by their own clocks.
  server_at  timestamptz not null default now(),
  primary key (user_id, kind, id)
);

create index if not exists sync_rows_user_server_at on public.sync_rows (user_id, server_at);

alter table public.sync_rows enable row level security;

-- Each person sees and writes only their own rows.
drop policy if exists "own rows: select" on public.sync_rows;
create policy "own rows: select" on public.sync_rows
  for select using (auth.uid() = user_id);

drop policy if exists "own rows: insert" on public.sync_rows;
create policy "own rows: insert" on public.sync_rows
  for insert with check (auth.uid() = user_id);

drop policy if exists "own rows: update" on public.sync_rows;
create policy "own rows: update" on public.sync_rows
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Pushes go through this function so the server, not the client, decides who
-- wins: a row is only overwritten by a version with a later updated_at.
create or replace function public.push_sync_rows(rows jsonb)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.sync_rows as current (user_id, kind, id, data, updated_at, deleted, server_at)
  select auth.uid(),
         r ->> 'kind',
         r ->> 'id',
         r -> 'data',
         (r ->> 'updated_at')::timestamptz,
         coalesce((r ->> 'deleted')::boolean, false),
         now()
  from jsonb_array_elements(rows) as r
  on conflict (user_id, kind, id) do update
    set data       = excluded.data,
        updated_at = excluded.updated_at,
        deleted    = excluded.deleted,
        server_at  = now()
    where excluded.updated_at >= current.updated_at;
$$;

grant execute on function public.push_sync_rows(jsonb) to authenticated;

-- Realtime: other devices hear about every change as it lands.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sync_rows'
  ) then
    alter publication supabase_realtime add table public.sync_rows;
  end if;
end $$;
