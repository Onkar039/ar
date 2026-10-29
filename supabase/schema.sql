create table if not exists public.site_content (
  id text primary key check (id = 'main'),
  content jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.site_content enable row level security;
alter table public.site_admins enable row level security;

drop policy if exists "Shared site content is readable by everyone" on public.site_content;
create policy "Shared site content is readable by everyone"
  on public.site_content for select
  to anon, authenticated
  using (true);

drop policy if exists "Only site admins can create shared content" on public.site_content;
create policy "Only site admins can create shared content"
  on public.site_content for insert
  to authenticated
  with check (
    exists (select 1 from public.site_admins where user_id = (select auth.uid()))
  );

drop policy if exists "Only site admins can update shared content" on public.site_content;
create policy "Only site admins can update shared content"
  on public.site_content for update
  to authenticated
  using (
    exists (select 1 from public.site_admins where user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.site_admins where user_id = (select auth.uid()))
  );

drop policy if exists "Site admins can read their own access" on public.site_admins;
create policy "Site admins can read their own access"
  on public.site_admins for select
  to authenticated
  using (user_id = (select auth.uid()));

grant select on public.site_content to anon, authenticated;
grant insert, update on public.site_content to authenticated;
grant select on public.site_admins to authenticated;
