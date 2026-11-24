-- PAKO OS private browser-to-cloud synchronization
-- The owner is always the authenticated Supabase Auth user.
create table if not exists public.pako_os_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  config jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pako_os_workspace_links_array check (jsonb_typeof(config->'links') = 'array')
);
comment on table public.pako_os_workspaces is
  'Private PAKO OS favorites and preferences, per authenticated owner; not shared with other products.';
alter table public.pako_os_workspaces enable row level security;
revoke all on table public.pako_os_workspaces from public, anon, authenticated;
grant select, insert, update on table public.pako_os_workspaces to authenticated;
create policy "pako_os_select_own" on public.pako_os_workspaces
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "pako_os_insert_own" on public.pako_os_workspaces
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "pako_os_update_own" on public.pako_os_workspaces
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
